import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';
import { sortChannels } from '$lib/utils/sort.ts';

// GET: Liste tous les canaux avec leur premier message
export async function GET({ url }) {
	// Vérifier si un paramètre "name" est passé dans l'URL (pour filtrer par nom)
	if (url.searchParams.get("name") != null && url.searchParams.get("name") != "") {
		const name = url.searchParams.get("name");
		try {
			// Étape 1 : Récupérer les canaux depuis la base de données (Prisma)
			let canaux = await prisma.channel.findMany({
				where: {
					name: {
						contains: name,
						mode: 'insensitive',
					},
				},
				include: {
					messages: {
						take: 1,
						orderBy: { createdAt: 'desc' },
					},
				},
			});

			// Étape 2 : Transformation des résultats
			canaux = canaux.map((canaux) => {
				return {
					...canaux,
					lastMessage: canaux.messages.length > 0 ? canaux.messages[0] : null,
					messages: undefined,
				};
			});

			// Étape 3 : Trier les canaux par date du dernier message
			canaux = sortChannels(canaux); // Fonction pour trier les canaux

			return json(canaux);

		} catch (err) {
			// Gérer les erreurs et renvoyer une réponse d'erreur en cas de problème
			logger.error(err);
			return json({ error: 'Erreur serveur' }, { status: 500 });
		}
	} else {
		try {
			// Étape 4 : Vérifier si les canaux sont dans le cache Redis
			let channels = [];
			// Question 8 - A implémenter : Récupérer les canaux dans le cache Redis.
			// - A l'aide de la clé 'channels', récupérez les canaux depuis le cache Redis.
			// - Utilisez await redisClient.get pour récupérer les canaux depuis le cache Redis.
			// - Stockez les canaux dans une variable 'cachedChannels' constante (const).

			if (cachedChannels != null) {
				logger.debug('Cache entry found, fetching channels from cache');
				channels = JSON.parse(cachedChannels);  // Charger les canaux depuis le cache
			} else {
				logger.debug('No cache entry was found, fetching channels from database');
			}

			// Étape 5 : Si le cache est insuffisant, récupérer les canaux depuis la base de données
			if (channels.length < 10) {
				logger.debug('Fetching channels from database to fill cache');
				// Question 9 - A implémenter : Récupérer les canaux dans la base de donnée mongoDB.
				// - Utilisez Prisma pour récupérer les canaux depuis MongoDB.
				// - Utilisez la méthode await prisma.channel.findMany pour récupérer les canaux.
				// - Incluez le dernier message des canaux.
				// - Stockez les canaux dans une variable 'canaux' (let).

				// Transformation des canaux pour ne garder que le dernier message
				canaux = canaux.map((canaux) => {
					return {
						...canaux,
						lastMessage: canaux.messages.length > 0 ? canaux.messages[0] : null,
						messages: undefined, // Ne pas retourner la liste complète des messages
					};
				});

				// Fusionner les nouveaux canaux récupérés avec les canaux existants dans le cache
				channels = channels.concat(canaux);

				// Supprimer les doublons en vérifiant par l'ID du canal
				channels = channels.filter((channel, index, self) =>
						index === self.findIndex((t) => (
							t.id === channel.id
						))
				);

				// Trier les canaux par la date du dernier message
				channels = sortChannels(channels);

				// Limiter à 10 canaux maximum
				channels = channels.slice(0, 10);

				// Mettre à jour le cache Redis avec les canaux
				await redisClient.set('channels', JSON.stringify(channels), { EX: 3600 }); // Cache pendant 1 heure
			}

			return json(channels);  // Retourner les canaux sous forme JSON

		} catch (err) {
			// Gérer les erreurs et renvoyer une réponse d'erreur en cas de problème
			logger.error(err);
			return json({ error: 'Erreur serveur' }, { status: 500 });
		}
	}
}


// POST: Créer un nouveau canal et mettre à jour le cache Redis
export async function POST({ request }) {
	// Étape 1 : Récupérer les données de la requête (nom du canal)
	const { name } = await request.json();

	try {
		// Étape 2 : Créer un nouveau canal dans la base de données
		// Question 10 - A implémenter : Utilisez `prisma.channel.create` pour créer un canal avec le nom fourni.
		// - Dans une variable `canal` (let) , stockez le résultat de la création du canal.
		logger.debug('Creating a new channel in database with id ' + canal.id);

		// Étape 3 : Mettre à jour le cache Redis des canaux
		const cachedChanels = await redisClient.get('channels');

		let channels = cachedChanels != null ? JSON.parse(cachedChanels) : [];

		// Étape 4 : Structurer les données du canal à ajouter au cache
		canal = {
			...canal,
			lastMessage: null,
			lastUpdate: canal.createdAt,
			messages: undefined,
		}

		// Étape 5 : Ajouter le canal au tableau des canaux et trier
		channels.push(canal);

		// Trier les canaux par la dernière mise à jour
		channels = sortChannels(channels);

		// Étape 6 : Mettre à jour le cache Redis avec la nouvelle liste de canaux
		logger.debug(`Added channel (${canal.id}) to channels cache.`);
		// Question 11 - A implémenter : Mettez à jour le cache Redis avec la liste des canaux, avec une expiration de 10 minutes.
		// - Utilisez await redisClient.set pour mettre à jour le cache des canaux.
		// - Utilisez une expiration de 10 minutes (600 secondes).
		// - Stockez les canaux dans le cache Redis en utilisant la clé 'channels'.
		// - Utilisez JSON.stringify pour convertir les canaux en chaîne JSON.

		// Étape 7 : Retourner la réponse avec le canal créé
		return json(canal, { status: 201 });

	} catch (err) {
		// Étape 8 : Gérer les erreurs en cas de problème
		console.log(err);
		logger.error(err);
		return json({ error: 'Erreur lors de la création du canal' }, { status: 500 });
	}
}



