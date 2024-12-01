import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';

import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';

// GET: Liste tous les canaux avec leur premier message
export async function GET() {
	try {
		const cachedCanaux = await redisClient.get('canaux');



		console.log('❌ Cache miss');

		// Si le cache est invalide ou vide, on charge les données depuis la base de données
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

		return json(canaux);

	} catch (err) {
		console.error('Erreur lors de la récupération des canaux:', err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
}

export async function POST({ request }) {
	console.log('Création d’un canal');
	const { name } = await request.json(); // Récupère le nom du canal depuis la requête

	try {
		// 1. Créer le canal dans la base de données MongoDB avec Prisma
		const canal = await prisma.channel.create({
			data: {
				name,
				createdAt: new Date(),
			},
		});
		console.log('Canal créé dans MongoDB:', canal);

		// 2. Récupérer les canaux existants du cache Redis
		let canaux = await redisClient.get('canaux');

		// Si le cache est vide, initialiser un tableau vide
		if (canaux) {
			try {
				canaux = JSON.parse(canaux); // Parser la liste existante dans Redis
			} catch (parseError) {
				console.error('Erreur lors du parsing du cache Redis:', parseError);
				canaux = []; // Réinitialiser si parsing échoue
			}
		} else {
			canaux = [];
		}

		// 3. Ajouter le nouveau canal à la liste des canaux en mémoire (Redis)
		canaux.push(canal); // Ajoute le canal créé dans la base de données à la liste Redis

		// 4. Mettre à jour le cache Redis avec la liste des canaux
		await redisClient.set('canaux', JSON.stringify(canaux), { EX: 600 }); // Le cache expire dans 10 minutes
		console.log('Liste des canaux mise à jour dans Redis');

		// 5. Retourner le canal créé dans la réponse
		return json(canal, { status: 201 });

	} catch (err) {
		// Gérer les erreurs et les retourner
		console.error('Erreur lors de la création du canal:', err);
		return json({ error: 'Erreur lors de la création du canal' }, { status: 500 });
	}
}




