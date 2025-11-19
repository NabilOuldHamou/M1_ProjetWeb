import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';
import { requireAuth } from '$lib/auth';

export async function GET(event) {
	// Vérifier l'authentification
	const authCheck = requireAuth(event);
	if (authCheck instanceof Response) {
		return authCheck;
	}

	const { params, url } = event;
	const channelId = params.id;
	logger.debug(`GET /api/channels/${channelId}/messages`);

	const limit = parseInt(url.searchParams.get('limit') || '10');
	const page = parseInt(url.searchParams.get('page') || '1');
	const offset = (page - 1) * limit;

	try {
		logger.debug(`Tentative de récupération des messages du cache pour le channel : ${channelId}`);
		let redisMessageKeys = await redisClient.zRangeWithScores(
			`channel:${channelId}:messages`,
			offset,
			offset + limit - 1,
			{ REV: true }
		);

		const redisPipelineRemove = redisClient.multi();


		for (const messageKey of redisMessageKeys) {
			// Vérifie si la clé existe dans Redis
			const messageKeyValue = messageKey.value;
			const exists = await redisClient.exists(messageKeyValue);
			if (!exists) {
				// Supprime la référence expirée dans le zSet
				redisPipelineRemove.zRem(`channel:${channelId}:messages`, messageKeyValue);
				redisMessageKeys = redisMessageKeys.filter((key) => key.value !== messageKeyValue);
			}
		}
		await redisPipelineRemove.exec();

		if (redisMessageKeys.length > 0) {
			const messages = await Promise.all(
				redisMessageKeys.map(async (key) => {
					const message = await redisClient.get(key.value);
					return message ? JSON.parse(message) : null;
				})
			);

			const redisPipeline = redisClient.multi();
			for (const key of redisMessageKeys) {
				const message = await redisClient.get(key.value);
				const msg = message ? JSON.parse(message) : null;
				if (msg) {
					redisPipeline.set(key.value, JSON.stringify(msg), {EX: 1800});
					redisPipeline.zAdd(`channel:${channelId}:messages`, {
						score: key.score,
						value: key.value,
					});
				}
			}
			await redisPipeline.exec();

			return json({ limit, page, messages: messages.reverse() });
		}

		logger.debug(`Aucun message trouvé dans le cache, récupération depuis MongoDB pour le channel : ${channelId}`);
		const messagesFromDB = await prisma.message.findMany({
			where: { channelId },
			select: {
				id: true,
				createdAt: true,
				text: true,
				user: {
					select: {
						id: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
			skip: offset,
			take: limit,
		});

		if (messagesFromDB.length > 0) {
			const redisPipeline = redisClient.multi();
			for (const message of messagesFromDB) {
				const messageKey = `message:${message.id}`;
				redisPipeline.set(messageKey, JSON.stringify(message), {EX: 1800});
				redisPipeline.zAdd(`channel:${channelId}:messages`, {
					score: new Date(message.createdAt).getTime(),
					value: messageKey,
				});
			}
			await redisPipeline.exec();
		}

		return json({ limit, page, messages: messagesFromDB.reverse() });
	} catch (err: unknown) {
		logger.error(`Erreur lors de la récupération des messages : ${err instanceof Error ? err.message : String(err)}`);
		return json({ error: 'Erreur lors de la récupération des messages' }, { status: 500 });
	}
}

export async function POST(event) {
	// Vérifier l'authentification
	const authCheck = requireAuth(event);
	if (authCheck instanceof Response) {
		return authCheck;
	}

	const { params, request } = event;
	const channelId = params.id;
	const body = await request.json();
	const userId: string = body.userId;
	const text: string = body.text;

	try {
		// Créer un nouveau message dans MongoDB
		const newMessage = await prisma.message.create({
			data: {
				userId,
				channelId,
				text,
			},
			select: {
				id: true,
				createdAt: true,
				text: true,
				user: {
					select: {
						id: true,
					},
				},
				channel: {
					select: {
						id: true,
						name: true,
					},
				}
			},
		});

		// Ajouter le message dans Redis
		await redisClient.set(`message:${newMessage.id}`, JSON.stringify(newMessage), {EX: 1800});
		await redisClient.zAdd(`channel:${channelId}:messages`, {
			score: new Date(newMessage.createdAt).getTime(),
			value: `message:${newMessage.id}`,
		});

		//update the channels cache with the new message
		const cachedChannels = await redisClient.get('channels');
		type Channel = { id?: string; name?: string; lastMessage?: unknown; lastUpdate?: unknown; messages?: unknown; [k:string]: unknown };
		let channels: Channel[] = cachedChannels ? JSON.parse(cachedChannels) : [];
		let channel: Channel | undefined = channels.find((c) => c.id === channelId);
		if (channel) {
			channel.lastMessage = {
				id: newMessage.id,
				text: newMessage.text,
				user: newMessage.user,
				createdAt: newMessage.createdAt,
			};
			channel.lastUpdate = newMessage.createdAt;
			channel.messages = undefined;

		} else {
			const ch: Record<string, unknown> = {
				id: newMessage.channel.id,
				name: newMessage.channel.name,
				lastMessage: {
					id: newMessage.id,
					text: newMessage.text,
					user: newMessage.user,
					createdAt: newMessage.createdAt,
				},
				lastUpdate: newMessage.createdAt,
				messages: undefined,
			};
			channels = [ch, ...channels];
			// assign channel variable so later code reading channel.lastMessage works
			channel = ch;
		}
		await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });

		// Construire un objet réponse enrichi sans muter l'objet retourné par Prisma
		const responseMessage = {
			...newMessage,
			channel: {
				id: newMessage.channel.id,
				name: newMessage.channel.name,
				lastMessage: channel.lastMessage,
				lastUpdate: channel.lastUpdate,
				messages: undefined
			}
		};

		logger.debug(`Nouveau message ajouté pour le channel : ${channelId}`);
		try {
			const { getIo } = await import('$lib/socketServer');
			const io = getIo();
			if (io) {
				const roomName = `channel:${channelId}`;

				try {
					// Diagnostic logs
					try {
						const allSocketIds = Array.from(io.sockets.sockets.keys());
						const allRooms = Array.from(io.sockets.adapter.rooms.keys());
						logger.debug(`Socket.IO summary: totalSockets=${allSocketIds.length}, sockets=[${allSocketIds.join(',')}]`);
						logger.debug(`Adapter rooms: [${allRooms.join(',')}]`);
						try {
							const { debugDumpChannels } = await import('$lib/socketServer');
							const dump = debugDumpChannels();
							logger.debug(`channelsUsers dump: ${JSON.stringify(dump)}`);
						} catch (dumpErr) {
							logger.debug('Unable to read channelsUsers dump: ' + (dumpErr instanceof Error ? dumpErr.message : String(dumpErr)));
						}
					} catch (diagErr) {
						logger.debug('Error while collecting socket diagnostic info: ' + (diagErr instanceof Error ? diagErr.message : String(diagErr)));
					}

				const adapterRooms = io.sockets.adapter.rooms as Map<string, Set<string>>;
				const room = adapterRooms.get(roomName);
				const socketIds = room ? Array.from(room) : [];
				logger.debug(`Emitting new-message to room ${roomName} (sockets=${socketIds.length}): ${socketIds.join(',')}`);

				// Émettre vers la room pour les participants du chat (si quelqu'un est dans la room)
				if (socketIds.length > 0) {
					io.to(roomName).emit('new-message', responseMessage);
					logger.debug(`new-message émis vers la room pour channel:${channelId} messageId=${responseMessage.id}`);
				}

				// TOUJOURS émettre globalement aussi pour que la liste des chats se mette à jour sur /chats
				io.emit('new-message', responseMessage);
				logger.debug(`new-message émis globalement pour channel:${channelId} messageId=${responseMessage.id}`);
				try {
					io.emit('debug-new-message', {
						channelId,
						messageId: responseMessage.id,
						mode: socketIds.length > 0 ? 'room+global' : 'global-only',
						socketsInRoom: socketIds.length
					});
				} catch (err) {
					logger.debug('debug-new-message emit failed: ' + String(err));
				}
			} catch (e) {
				logger.error('Error in socket emission logic: ' + (e instanceof Error ? e.message : String(e)));
				}
			}
		} catch (e) {
			logger.error('Error while initializing socket server: ' + (e instanceof Error ? e.message : String(e)));
		}

		// return the enriched message object (same shape as emitted via sockets)
		return json(responseMessage, { status: 201 });
	} catch (err: unknown) {
		logger.error(`Erreur lors de l'envoi du message : ${err instanceof Error ? err.message : String(err)}`);
		return json({ error: 'Erreur lors de l\'envoi du message' }, { status: 500 });
	}
}
