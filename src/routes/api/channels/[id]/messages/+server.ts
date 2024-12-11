import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';
import { sortChannels } from '$lib/utils/sort.ts';

export async function GET({ params, url }) {
	const channelId = params.id;
	logger.debug(`GET /api/channels/${channelId}/messages`);

	const limit = parseInt(url.searchParams.get('limit') || '10');
	const page = parseInt(url.searchParams.get('page') || '1');
	const offset = (page - 1) * limit;

	try {
		logger.debug(`Tentative de récupération des messages du cache pour le channel : ${channelId}`);
		const redisMessageKeys = await redisClient.zRange(
			`channel:${channelId}:messages`,
			offset,
			offset + limit - 1,
			{ REV: true }
		);

		if (redisMessageKeys.length > 0) {
			const messages = await Promise.all(
				redisMessageKeys.map(async (key) => {
					const message = await redisClient.get(key);
					return JSON.parse(message);
				})
			);
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
						username: true,
						surname: true,
						name: true,
						profilePicture: true,
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
				redisPipeline.set(messageKey, JSON.stringify(message));
				redisPipeline.zAdd(`channel:${channelId}:messages`, {
					score: new Date(message.createdAt).getTime(),
					value: messageKey,
				});
			}

			await redisPipeline.exec();
		}

		return json({ limit, page, messages: messagesFromDB.reverse() });
	} catch (err) {
		logger.error(`Erreur lors de la récupération des messages : ${err.message}`);
		return json({ error: 'Erreur lors de la récupération des messages' }, { status: 500 });
	}
}

export async function POST({ params, request }) {
	const channelId = params.id;
	const { userId, text } = await request.json();

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
						username: true,
						surname: true,
						name: true,
						profilePicture: true,
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
		await redisClient.set(`message:${newMessage.id}`, JSON.stringify(newMessage));
		await redisClient.zAdd(`channel:${channelId}:messages`, {
			score: new Date(newMessage.createdAt).getTime(),
			value: `message:${newMessage.id}`,
		});

		//update the channels cache with the new message
		const cachedChannels = await redisClient.get('channels');
		let channels = cachedChannels ? JSON.parse(cachedChannels) : [];
		const channel = channels.find((c) => c.id === channelId);
		if(channel){
			channel.lastMessage = newMessage;
			channel.lastUpdate = newMessage.createdAt;
			channels = sortChannels(channels);
			await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });
		}else{
			channels = [newMessage.channel, ...channels];
			await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });
		}


		logger.debug(`Nouveau message ajouté pour le channel : ${channelId}`);
		return json(newMessage, { status: 201 });
	} catch (err) {
		logger.error(`Erreur lors de la création du message : ${err.message}`);
		return json({ error: 'Erreur lors de la création du message' }, { status: 500 });
	}
}

export async function DELETE({ params, request }) {
	const channelId = params.id;
	const { messageId } = await request.json();

	try {
		// Supprimer le message dans MongoDB
		await prisma.message.delete({ where: { id: messageId } });

		// Supprimer le message dans Redis
		await redisClient.del(`message:${messageId}`);
		await redisClient.zRem(`channel:${channelId}:messages`, `message:${messageId}`);

		logger.debug(`Message supprimé pour le channel : ${channelId}`);
		return json({ message: 'Message supprimé avec succès' });
	} catch (err) {
		logger.error(`Erreur lors de la suppression du message : ${err.message}`);
		return json({ error: 'Erreur lors de la suppression du message' }, { status: 500 });
	}
}
