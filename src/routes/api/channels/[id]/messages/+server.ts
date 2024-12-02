import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient'; // Assure-toi d'importer ton client Redis

export async function GET({ params, url }) {
	const canalId = parseInt(params.id);

	// Gestion de la pagination avec des paramètres optionnels `page` et `limit`
	const page = parseInt(url.searchParams.get('page')) || 1;
	const limit = parseInt(url.searchParams.get('limit')) || 10;
	const offset = (page - 1) * limit;

	// Générer une clé cache Redis unique en fonction du canal et des paramètres de pagination
	const cacheKey = `canal:${canalId}:messages:page:${page}:limit:${limit}`;

	try {
		// 1. Vérifier si les messages sont déjà dans le cache Redis
		const cachedMessages = await redisClient.get(cacheKey);
		if (cachedMessages) {
			console.log('✅ Cache hit');
			return json(JSON.parse(cachedMessages)); // Si les données sont en cache, les retourner
		}

		// 2. Si les messages ne sont pas en cache, récupérer depuis la base de données
		const messages = await prisma.message.findMany({
			where: { canalId },
			include: {
				user: {
					select: { id: true, pseudo: true }, // Inclut uniquement l’ID et le pseudo de l’utilisateur
				},
			},
			orderBy: {
				createdAt: 'asc', // Trie par date croissante
			},
			skip: offset,
			take: limit,
		});

		// 3. Compter le nombre total de messages pour la pagination
		const totalMessages = await prisma.message.count({
			where: { canalId },
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

		// 4. Mettre en cache les messages avec une expiration (par exemple 5 minutes)
		await redisClient.set(cacheKey, JSON.stringify(response), 'EX', 60 * 5); // Cache pendant 5 minutes

		console.log('❌ Cache miss - Mise en cache des résultats');
		return json(response); // Retourner les données récupérées
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la récupération des messages' }, { status: 500 });
	}
}

export async function POST({ params, request }) {
	const canalId = parseInt(params.id);
	const { userId, text } = await request.json();

	try {
		// Créer un nouveau message dans la base de données
		const newMessage = await prisma.message.create({
			data: {
				userId,
				canalId,
				text,
			},
			include: { user: { select: { id: true, pseudo: true } } },
		});

		updateCaches(); // Mettre à jour les caches après la création d’un nouveau message

		return json(newMessage, { status: 201 });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la création du message' }, { status: 500 });
	}
}

export async function DELETE({ params }) {
	const messageId = parseInt(params.id);

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
function updateCaches(canalId) {
	// Mettre à jour tous les caches
	// Mettre à jour toutes les pages dans le cache
	let page : number = 1;
	let limit : number = 10;
	let offset : number = (page - 1) * limit;
	while (true) {
		const cacheKey = `canal:${canalId}:messages:page:${page}:limit:${limit}`;
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
