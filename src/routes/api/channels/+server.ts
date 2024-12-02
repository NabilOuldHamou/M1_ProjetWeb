import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';

// GET: Liste tous les canaux avec leur premier message
export async function GET() {
	try {
		const cachedChannels = await redisClient.get('channels');

		if (cachedChannels != null) {
			logger.debug('Cache entry found, fetching channels from cache');
			return json(JSON.parse(cachedChannels));
		}

		logger.debug('No cache entry was found, fetching channels from database');
		let canaux = await prisma.channel.findMany({
			include: {
				messages: {
					take: 1, // Récupère le dernier message
					orderBy: { createdAt: 'desc' }, // Trie par date décroissante
				},
			},
		});

		canaux = canaux.sort((a, b) => {
			const lastMessageA = a.messages[0]?.createdAt || a.createdAt ? a.createdAt : new Date();
			const lastMessageB = b.messages[0]?.createdAt || b.createdAt ? b.createdAt : new Date();
			return new Date(lastMessageB).getTime() - new Date(lastMessageA).getTime();
		});

		logger.debug('Caching channels with EX of 3600 secs');
		await redisClient.set('channels', JSON.stringify(canaux), { EX: 3600 });

		return json(canaux);

	} catch (err) {
		logger.error(err)
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
}

export async function POST({ request }) {
	const { name } = await request.json();

	try {
		const canal = await prisma.channel.create({
			data: {
				name,
				createdAt: new Date(),
			},
		});
		logger.debug('Creating a new channel in database with id ' + canal.id);

		const cachedChanels = await redisClient.get('channels');
		const channels = cachedChanels != null ? JSON.parse(cachedChanels) : [];

		channels.push(canal);

		await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });
		console.log('Liste des canaux mise à jour dans Redis');

		// 5. Retourner le canal créé dans la réponse
		return json(canal, { status: 201 });

	} catch (err) {
		// Gérer les erreurs et les retourner
		console.error('Erreur lors de la création du canal:', err);
		return json({ error: 'Erreur lors de la création du canal' }, { status: 500 });
	}
}



