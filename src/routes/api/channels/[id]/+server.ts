import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';

// Récupérer les informations du canal et le dernier message (avec cache Redis)
export async function GET({ params }) {
	const channelId = params.id;

	const channelCacheKey = `channel:${channelId}:info`;

	try {
		const cachedChannel = await redisClient.get(channelCacheKey);
		if (cachedChannel) {
			logger.debug(`Cache entry found, fetching channel (${channelId}) from cache`);
			return json(JSON.parse(cachedChannel));
		}

		logger.debug(`No cache entry was found, fetching channel (${channelId}) from database`);
		const canal = await prisma.channel.findUnique({
			where: { id: channelId },
		});

		if (!canal) {
			logger.debug(`No channel for id ${channelId} was found in database`)
			return json({ error: 'Canal non trouvé' }, { status: 404 });
		}

		const lastMessage = await prisma.message.findFirst({
			where: { id: channelId },
			orderBy: { createdAt: 'desc' },
		});

		// Créer un objet combiné pour le canal et le dernier message
		const canalData = {
			canal,
			lastMessage, // Inclure uniquement le dernier message
		};


		const cachedChanels = await redisClient.get('channels');
		let channels = cachedChanels != null ? JSON.parse(cachedChanels) : [];

		channels.push(canal);

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

		logger.debug(`Added channel (${canal.id}) to channels cache.`);
		await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });

		logger.debug(`Creating a new cache entry with key channel:${channelId}:info`);
		await redisClient.set(channelCacheKey, JSON.stringify(canalData), {EX: 600, NX: true}); // Cache pendant 5 minutes


		return json(canalData);
	} catch (err) {

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
