import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';

export async function GET({ params, url }) {
	const channelId = params.id;

	// @ts-ignore
	const page = url.searchParams.get('page') != null ? parseInt(url.searchParams.get('page')) : 1;
	// @ts-ignore
	const limit = 10;
	const offset = (page - 1) * limit;

	// Générer une clé cache Redis unique en fonction du canal et des paramètres de pagination
	const cacheKey = `channel:${channelId}:messages:page:${page}`;

	try {
		const cachedMessages = await redisClient.get(cacheKey);
		if (cachedMessages) {
			console.log('✅ Cache hit');
			return json(JSON.parse(cachedMessages)); // Si les données sont en cache, les retourner
		}

		const messages = await prisma.message.findMany({
			where: { channelId },
			include: {
				user: {
					select: { id: true, username: true },
				},
			},
			orderBy: {
				createdAt: 'asc', // Trie par date croissante
			},
			skip: offset,
			take: limit,
		});


		const totalMessages = await prisma.message.count({
			where: { channelId },
		});

		const response = {
			messages,
			pagination: {
				page,
				limit,
				totalMessages,
				totalPages: Math.ceil(totalMessages / limit),
			},
		};


		await redisClient.set(cacheKey, JSON.stringify(response), { EX: 600 });

		console.log('❌ Cache miss - Mise en cache des résultats');
		return json(response);
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la récupération des messages' }, { status: 500 });
	}
}

export async function POST({ params, request }) {
	const channelId = params.id;
	const { userId, text } = await request.json();

	try {
		// Créer un nouveau message dans la base de données
		const newMessage = await prisma.message.create({
			data: {
				userId,
				channelId,
				text,
			},
			include: { user: { select: { id: true, username: true } } },
		});

		updateCaches(); // Mettre à jour les caches après la création d’un nouveau message

		return json(newMessage, { status: 201 });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la création du message' }, { status: 500 });
	}
}

export async function DELETE({ params }) {
	const messageId = params.id;

	try {
		// Supprimer le message de la base de données
		await prisma.message.delete({
			where: { id: messageId },
		});

		updateCaches(); // Mettre à jour les caches après la suppression d’un message

		return json({ message: 'Message supprimé avec succès' });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la suppression du message' }, { status: 500 });
	}
}

// Fonction pour mettre à jour tous les caches des messages
function updateCaches(channelId: string) {
	let page : number = 1;
	let limit : number = 10;
	let offset : number = (page - 1) * limit;
	while (true) {
		const cacheKey = `channel:${channelId}:messages:page:${page}:limit:${limit}`;
		const cachedMessages = await redisClient.get(cacheKey);
		if (!cachedMessages) {
			break;
		}
		const totalMessages = await prisma.message.count({
			where: { canalId },
		});
		const messages = await prisma.message.findMany({
			where: { canalId },
			include: {
				user: {
					select: { id: true, pseudo: true },
				},
			},
			orderBy: {
				createdAt: 'asc',
			},
			skip: offset,
			take: limit,
		});
		const response = {
			messages,
			pagination: {
				page,
				limit,
				totalMessages,
				totalPages: Math.ceil(totalMessages / limit),
			},
		};
		await redisClient.set(cacheKey, JSON.stringify(response), 'EX', 60 * 5);
		page++;
		offset = (page - 1) * limit;
	}
}
