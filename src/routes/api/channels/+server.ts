import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';

// GET: Liste tous les canaux avec leur premier message
export async function GET({ params, url }) {
	if(url.searchParams.get("name") != null && url.searchParams.get("name") != ""){
		const name = url.searchParams.get("name");
		try {
			let canaux = await prisma.channel.findMany({
				where: {
					name: {
						contains: name,
						mode: 'insensitive',
					},
				},
				include: {
					messages: {
						take: 1, // Récupère le dernier message
						orderBy: { createdAt: 'desc' }, // Trie par date décroissante
					},
				},
			});

			canaux = sortChannels(canaux);

			return json(canaux);

		} catch (err) {
			logger.error(err);
			return json({ error: 'Erreur serveur' }, { status: 500 });
		}
	}else{
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

			canaux = sortChannels(canaux);

			logger.debug('Caching channels with EX of 3600 secs');
			await redisClient.set('channels', JSON.stringify(canaux), { EX: 3600 });

			return json(canaux);

		} catch (err) {
			logger.error(err)
			return json({ error: 'Erreur serveur' }, { status: 500 });
		}
	}

}

export async function POST({ request }) {
	const { name } = await request.json();

	try {
		const canal = await prisma.channel.create({
			data: {
				name
			},
		});
		logger.debug('Creating a new channel in database with id ' + canal.id);

		const cachedChanels = await redisClient.get('channels');

		let channels = cachedChanels != null ? JSON.parse(cachedChanels) : [];
		console.log(channels);
		console.log(canal);

		channels.push(canal);

		channels = sortChannels(channels);
		console.log(channels);

		logger.debug(`Added channel (${canal.id}) to channels cache.`);
		await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });

		return json(canal, { status: 201 });

	} catch (err) {
		console.log(err);
		logger.error(err);
		return json({ error: 'Erreur lors de la création du canal' }, { status: 500 });
	}
}

function sortChannels(channels) {
	return channels.sort((a, b) => {
		// Vérifie si 'a.messages' existe et est un tableau, sinon utilise la date de création du canal
		const lastMessageA = Array.isArray(a.messages) && a.messages.length > 0 ? a.messages[0]?.createdAt : a.createdAt;
		const lastMessageB = Array.isArray(b.messages) && b.messages.length > 0 ? b.messages[0]?.createdAt : b.createdAt;

		return new Date(lastMessageB).getTime() - new Date(lastMessageA).getTime();
	});
}
