import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';
import { sortChannels } from '$lib/utils/sort.ts';

// GET: Liste tous les canaux avec leur premier message
export async function GET({ url }) {
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
						orderBy: { createdAt: 'desc' },// Trie par date décroissante
						// as lastMessage not list last message
					},
				},
			});

			canaux = canaux.map((canaux) => {
				return {
					...canaux,
					lastMessage: canaux.messages.length > 0 ? canaux.messages[0] : null,
					messages: undefined
				};
			});

			canaux = sortChannels(canaux);

			return json(canaux);

		} catch (err) {
			logger.error(err);
			return json({ error: 'Erreur serveur' }, { status: 500 });
		}
	}else{
		try {

			let channels = [];

			const cachedChannels = await redisClient.get('channels');

			if (cachedChannels != null) {
				logger.debug('Cache entry found, fetching channels from cache');
				channels = JSON.parse(cachedChannels);
			}else{
				logger.debug('No cache entry was found, fetching channels from database');
			}
			if(channels.length < 10){
				logger.debug('Fetching channels from database to fill cache');
				let canaux = await prisma.channel.findMany({
					include: {
						messages: {
							take: 1, // Récupère le dernier message
							orderBy: { createdAt: 'desc' }, // Trie par date décroissante
						},
					},
				});

				canaux = canaux.map((canaux) => {
					return {
						...canaux,
						lastMessage: canaux.messages.length > 0 ? canaux.messages[0] : null,
						messages: undefined
					};
				});

				channels = channels.concat(canaux);

				channels = sortChannels(channels);

				channels = channels.slice(0, 10);

				await redisClient.set('channels', JSON.stringify(channels), { EX: 3600 });
			}

			return json(channels);

		} catch (err) {
			logger.error(err)
			return json({ error: 'Erreur serveur' }, { status: 500 });
		}
	}

}

export async function POST({ request }) {
	const { name } = await request.json();

	try {
		let canal = await prisma.channel.create({
			data: {
				name
			},
		});
		logger.debug('Creating a new channel in database with id ' + canal.id);

		const cachedChanels = await redisClient.get('channels');

		let channels = cachedChanels != null ? JSON.parse(cachedChanels) : [];

		canal = {
			...canal,
			lastMessage: null,
			lastUpdate: canal.createdAt,
			messages: undefined
		}

		channels.push(canal);

		channels = sortChannels(channels);

		logger.debug(`Added channel (${canal.id}) to channels cache.`);
		await redisClient.set('channels', JSON.stringify(channels), { EX: 600 });

		return json(canal, { status: 201 });

	} catch (err) {
		console.log(err);
		logger.error(err);
		return json({ error: 'Erreur lors de la création du canal' }, { status: 500 });
	}
}


