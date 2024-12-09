import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';
import { sortChannels } from '$lib/utils/sort.ts';

export async function GET({ params, url }) {
	const channelId = params.id;

	// Gestion des paramètres de pagination
	const limit = parseInt(url.searchParams.get('limit') || '20'); // Par défaut, 20 messages
	const page = parseInt(url.searchParams.get('page') || '1'); // Par défaut, page 1

	const offset = (page - 1) * limit;

	try {
		// Essayer de récupérer les messages du cache Redis
		logger.debug(`Tentative de récupération des messages du cache pour le channel : ${channelId}`);
		let redisMessages = await redisClient.zRange(`channel:${channelId}:messages`, offset, limit, {REV:true});

		if (redisMessages && redisMessages.length > 0) {
			logger.debug(`Messages trouvés dans le cache pour le channel : ${channelId}`);
			const messages = await redisClient.mGet(redisMessages).then(
				(messages) => messages.map((m) => JSON.parse(m)).reverse()
			);

			return json({ limit, page, messages });
		} else {
			logger.debug(`Aucun message trouvé dans le cache, récupération depuis MongoDB pour le channel : ${channelId}`);
		}

		// Si aucun message n'est trouvé dans Redis, charger depuis MongoDB
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
			orderBy: [{ createdAt: 'desc' }],
		});

		if (messagesFromDB.length > 0) {
			// Stocker les messages dans Redis
			for (const message of messagesFromDB) {
				await redisClient.set(`message:${message.id}`, JSON.stringify(message));
				await redisClient.zAdd(`channel:${channelId}:messages`, {
					score: new Date(message.createdAt).getTime(),
					value: `message:${message.id}`,
				});
			}

			logger.debug(`Messages ajoutés au cache Redis pour le channel : ${channelId}`);
		}

		return json({ limit, page, messages: messagesFromDB });
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
		let channels = JSON.parse(cachedChannels);
		const channel = channels.find((c) => c.id === channelId);
		channel.lastMessage = newMessage;
		channel.lastUpdate = newMessage.createdAt;
		channels = sortChannels(channels);
		await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });

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
