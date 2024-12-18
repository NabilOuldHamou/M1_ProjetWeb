import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';

// GET: Récupérer les informations d'un canal
export async function GET({ params }) {
	const channelId = params.id;

	// Définir la clé de cache Redis pour le canal
	const channelCacheKey = `channel:${channelId}:info`;

	try {
		// Étape 1 : Vérifier si les informations du canal sont en cache Redis
		const cachedChannel = await redisClient.get(channelCacheKey);
		if (cachedChannel) {
			// Si le canal est dans le cache, renvoyez-le
			logger.debug(`Cache entry found, fetching channel (${channelId}) from cache`);
			return json(JSON.parse(cachedChannel));
		}

		// Étape 2 : Si le canal n'est pas dans le cache, le récupérer depuis la base de données MongoDB
		logger.debug(`No cache entry was found, fetching channel (${channelId}) from database`);

		// Question 6 - A implémenter : Récupérer les informations du canal depuis la base de données.
		// Récupérer les informations du canal depuis la base de données
		// Utilisez la méthode await prisma.channel.findUnique pour récupérer le canal par son ID.
		// Stockez les informations du canal dans une variable 'canal' constante (const).

		// Vérifier si le canal existe dans la base de données
		if (!canal) {
			logger.debug(`No channel for id ${channelId} was found in database`);
			return json({ error: 'Canal non trouvé' }, { status: 404 });
		}

		// Étape 3 : Récupérer le dernier message du canal
		// Question 7 - A implémenter : Récupérer le dernier message du canal depuis la base de données.
		// Utilisez la méthode await prisma.message.findFirst pour récupérer le dernier message du canal.
		// Filtrez les messages par `channelId` et triez-les par date de création décroissante.
		// Stockez le dernier message dans une variable 'lastMessage' constante (const).

		// Créer un objet combiné pour le canal et son dernier message
		const canalData = {
			canal,
			lastMessage,
		};

		// Étape 4 : Mettre à jour le cache global des canaux dans Redis
		const cachedChannels = await redisClient.get('channels');
		let channels = cachedChannels != null ? JSON.parse(cachedChannels) : [];

		// Ajouter le canal actuel dans la liste des canaux
		channels.push(canal);

		// Trier les canaux par la date du dernier message
		channels = channels.sort(
			(
				a: { messages: { createdAt: Date }[]; createdAt: Date },
				b: { messages: { createdAt: Date }[]; createdAt: Date }
			) => {
				const lastMessageA = a.messages[0]?.createdAt || a.createdAt ? a.createdAt : new Date();
				const lastMessageB = b.messages[0]?.createdAt || b.createdAt ? b.createdAt : new Date();
				return new Date(lastMessageB).getTime() - new Date(lastMessageA).getTime();
			}
		);

		// Enregistrer la liste mise à jour des canaux dans Redis
		logger.debug(`Added channel (${canal.id}) to channels cache.`);
		await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });

		// Étape 5 : Ajouter les informations du canal et du dernier message dans le cache Redis
		logger.debug(`Creating a new cache entry with key channel:${channelId}:info`);
		await redisClient.set(channelCacheKey, JSON.stringify(canalData), { EX: 600, NX: true });

		// Étape 6 : Retourner les données du canal et du dernier message
		return json(canalData);

	} catch (err) {
		// Si une erreur survient lors de la récupération des informations du canal ou du dernier message, retournez une erreur
		logger.error(err);
		return json({ error: 'Erreur lors de la récupération du canal ou du dernier message' }, { status: 500 });
	}
}

// Supprimer un canal et invalider le cache associé
export async function DELETE({ params }) {
	const channelId = params.id;

	try {
		// Supprimer le canal de la base de données
		await prisma.channel.delete({
			where: { id: channelId },
		});
		logger.debug(`Deleting channel (${channelId}) from database`);

		logger.debug(`Deleting channel (${channelId}) from cache`);
		await redisClient.del(`channel:${channelId}:info`);

		return json({ message: 'Canal supprimé avec succès' });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la suppression du canal' }, { status: 500 });
	}
}

// Modifier un canal
export async function PUT({ params, request }) {
	const channelId = params.id;
	const { nom } = await request.json();

	// Clé cache pour les informations du canal et le dernier message
	const canalCacheKey = `channel:${channelId}:info`;

	try {
		// Mettre à jour les informations du canal dans la base de données
		const updatedCanal = await prisma.channel.update({
			where: { id: channelId },
			data: {
				name: nom,
			}
		});

		// Récupérer le dernier message associé au canal après mise à jour
		const lastMessage = await prisma.message.findFirst({
			where: { id: channelId },
			orderBy: { createdAt: 'desc' },
		});

		// Créer un objet combiné pour les nouvelles informations du canal et le dernier message
		const canalData = {
			canal: updatedCanal,
			lastMessage, // Inclure uniquement le dernier message
		};

		const cachedChannels = await redisClient.get('channels');
		let channelsArrays = cachedChannels != null ? JSON.parse(cachedChannels) : [];
		channelsArrays = channelsArrays.filter((u: { id: string }) => u.id !== updatedCanal.id);
		channelsArrays.push(canalData);

		channelsArrays = channelsArrays.sort(
			(
				a: { messages: { createdAt: Date }[]; createdAt: Date },
				b: { messages: { createdAt: Date }[]; createdAt: Date }
			) => {
				const lastMessageA = a.messages[0]?.createdAt || a.createdAt ? a.createdAt : new Date();
				const lastMessageB = b.messages[0]?.createdAt || b.createdAt ? b.createdAt : new Date();
				return new Date(lastMessageB).getTime() - new Date(lastMessageA).getTime();
			}
		);

		logger.debug(`Updated channel (${channelId}) in channels cache`);
		await redisClient.set('channels', JSON.stringify(channelsArrays), { EX: 600 })
		logger.debug(`Updated cache entry with key channel:${channelId}:info`);
		await redisClient.set(canalCacheKey, JSON.stringify(canalData), { EX: 600, NX: true });

		return json(canalData);
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la mise à jour du canal' }, { status: 500 });
	}
}
