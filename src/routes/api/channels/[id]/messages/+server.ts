import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';
import { sortChannels } from '$lib/utils/sort.ts';

// GET: Liste tous les messages d'un canal avec pagination
export async function GET({ params, url }) {
	const channelId = params.id;
	logger.debug(`GET /api/channels/${channelId}/messages`);

	const limit = parseInt(url.searchParams.get('limit') || '10');
	const page = parseInt(url.searchParams.get('page') || '1');
	const offset = (page - 1) * limit;

	try {
		logger.debug(`Tentative de récupération des messages du cache pour le channel : ${channelId}`);

		// Étape 1 : Récupérer les clés Redis des messages
		// Question 1 - A implémenter : Récupérer les messages depuis Redis avec la pagination.
		// - Utilisez await redisClient.zRangeWithScores pour récupérer les clés des messages dans une variable redisMessageKeys (let).
		// - La clé Redis pour l'ensemble trié des messages est sous la forme : `channel:<channelId>:messages`.
		// - Vous devez récupérer les messages selon l'offset et le limit.


		//Suppression des messages dans le cache si message:<id> n'existe plus
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

		// Étape 2 : Si des messages sont trouvés dans Redis
		if (redisMessageKeys.length > 0) {
			const messages = await Promise.all(
				redisMessageKeys.map(async (key) => {
					const message = await redisClient.get(key.value);
					return JSON.parse(message);
				})
			);

			// Met à jour le TTL pour les messages et l'ensemble trié
			const redisPipeline = redisClient.multi();
			for (const key of redisMessageKeys) {
				const message = await redisClient.get(key.value);
				const msg = JSON.parse(message);
				redisPipeline.set(key.value, JSON.stringify(msg), { EX: 1800 }); // TTL 30 minutes
				redisPipeline.zAdd(`channel:${channelId}:messages`, {
					score: key.score,
					value: key.value,
				});
			}
			await redisPipeline.exec();

			return json({ limit, page, messages: messages.reverse() });
		}

		// Étape 3 : Aucun message trouvé dans Redis, récupération depuis MongoDB
		logger.debug(`Aucun message trouvé dans le cache, récupération depuis MongoDB pour le channel : ${channelId}`);
		// Question 2 - A implémenter : Si aucun message n'est trouvé dans Redis, récupérez-les depuis MongoDB.
		// - Utiliser Prisma pour récupérer les messages depuis MongoDB.
		// - Utilisez la méthode await prisma.message.findMany de Prisma pour récupérer les messages.
		// - Filtrez les messages par `channelId` et recuperer l'id, le createdAt, le text, le user ( avec son id ).
		// - Appliquez la pagination avec `skip` et `take` pour gérer le `offset` et le `limit`.
		// - Triez les messages par date de création décroissante.
		// - Stockez les messages dans une variable `messagesFromDB` constante (const).


		// Étape 4 : Si des messages sont récupérés depuis MongoDB, les stocker dans Redis
		if (messagesFromDB.length > 0) {
			const redisPipeline = redisClient.multi();
			for (const message of messagesFromDB) {
				const messageKey = `message:${message.id}`;
				redisPipeline.set(messageKey, JSON.stringify(message), { EX: 1800 }); // TTL 30 minutes
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


// Fonction POST permettant de créer un nouveau message
export async function POST({ params, request }) {
	const channelId = params.id;
	const { userId, text } = await request.json();

	try {
		// Étape 1 : Créer un nouveau message dans MongoDB
		// Question 3 - A implémenter : Utilisez Prisma pour créer un nouveau message dans MongoDB.
		// - Utilisez await prisma.message.create pour créer un message avec les données fournies.
		// - Incluez l'id, la date de création, le text, l'utilisateur (avec son id), et le canal (avec son id et son name).
		// - Stockez le message dans une variable `newMessage` (let).
		// - Utiliser userId, channelId et text pour créer le message.

		// Étape 2 : Ajouter le message dans Redis
		// Question 4 - A implémenter : Stocker le message dans Redis.
		// - Utiliser await redisClient.set pour ajouter le message dans Redis.
		// - Avec un Time To Live de 30 Minutes (1800 secondes)
		// - Assurez-vous de structurer la clé comme suit : `message:<messageId>`.

		// Question 5 - A implémenter : Ajouter la clé du message dans la liste ordonnée des messages du canal.
		// - Utiliser await redisClient.zAdd pour insérer le message dans un ensemble trié basé sur la date de création.
		// Assurez-vous de structurer la clé comme suit : `channel:<channelId>:messages`

		// Étape 3 : Mettre à jour le cache des channels avec le nouveau message
		const cachedChannels = await redisClient.get('channels');
		let channels = cachedChannels ? JSON.parse(cachedChannels) : [];
		let channel = channels.find((c) => c.id === channelId);

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
			channel = {
				...newMessage.channel,
				lastMessage: {
					id: newMessage.id,
					text: newMessage.text,
					user: newMessage.user,
					createdAt: newMessage.createdAt,
				},
				lastUpdate: newMessage.createdAt,
				messages: undefined
			};
			channels = [channel, ...channels];
		}
		await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });

		newMessage.channel = {
			id: newMessage.channel.id,
			name: newMessage.channel.name,
			lastMessage: channel.lastMessage,
			lastUpdate: channel.lastUpdate,
			messages: undefined
		};

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
