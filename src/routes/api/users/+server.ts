// src/routes/api/users/+server.js
import { json } from '@sveltejs/kit';
import redisClient from '$lib/redisClient';
import prisma from '$lib/prismaClient';
import logger from '$lib/logger';

// GET: Récupérer tous les utilisateurs avec cache Redis
export async function GET() {
	try {
		// Étape 1 : Vérifier si les utilisateurs sont déjà présents dans le cache Redis
		const cachedUsers = await redisClient.get('users');

		// Si les utilisateurs sont trouvés dans le cache, renvoyez-les directement
		if (cachedUsers) {
			// Si le cache contient les utilisateurs, on les récupère et on les renvoie
			logger.debug('Cache entry found, fetching users from cache');
			return json(JSON.parse(cachedUsers));
		}

		// Étape 2 : Si les utilisateurs ne sont pas dans le cache, les récupérer depuis la base de données
		logger.debug('No cache entry was found, fetching users from database');

		// Question 14 - A implémenter : Utilisez Prisma pour récupérer la liste des utilisateurs dans la base de données.
		// - Utilisez la méthode await prisma.user.findMany pour récupérer la liste des utilisateurs.
		// - Stockez les utilisateurs dans une variable 'users' constante (const).
		const users = await prisma.user.findMany();

		// Étape 3 : Mettre en cache les utilisateurs récupérés depuis la base de données
		logger.debug('Caching users with EX of 600 secs');

		// Question 15 - A implémenter : Mettre dans le cache Redis avec une expiration de 600 secondes.
		// - Utilisez await redisClient.set pour mettre en cache les utilisateurs.
		// - Utilisez la méthode JSON.stringify pour convertir les utilisateurs en format JSON.
		// - Utilisez l'option { EX: 600 } pour définir l'expiration

		// Étape 4 : Retourner la liste des utilisateurs récupérés
		return json(users);

	} catch (err) {
		// Étape 5 : Gestion des erreurs
		logger.error(err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
}

// POST: Créer un utilisateur et mettre à jour le cache
export async function POST({ request }) {
	// Étape 1 : Récupérer les données envoyées dans la requête (username, surname, name, email, password)
	const { username, surname, name, email, password } = await request.json();

	try {
		// Étape 2 : Créer un nouvel utilisateur dans la base de données
		const user = await prisma.user.create({
			data: {
				username: username.toLowerCase(),
				surname,
				name,
				email: email.toLowerCase(),
				password,
			},
		});

		// Étape 3 : Loguer la création de l'utilisateur avec son ID
		logger.debug('Creating a new user in database with id ' + user.id);

		// Étape 4 : Mettre à jour le cache global des utilisateurs
		logger.debug(`Caching user (${user.id})`);
		const cachedUsers = await redisClient.get('users');
		const usersArray = cachedUsers != null ? JSON.parse(cachedUsers) : [];
		usersArray.push(user);

		// Étape 5 : Enregistrer la liste mise à jour des utilisateurs dans le cache Redis
		logger.debug(`Added user (${user.id}) to users cache.`);
		await redisClient.set('users', JSON.stringify(usersArray), { EX: 600 });

		// Étape 6 : Créer un cache individuel pour cet utilisateur spécifique
		logger.debug(`Creating a new cache entry with key user:${user.id}, with EX of 3600 secs`);
		// Question 16 - A implémenter : Mettre en cache l'utilisateur créé avec une expiration de 1 heure (3600 secondes).
		// - Utilisez await redisClient.set pour mettre en cache l'utilisateur.
		// - Utilisez JSON.stringify pour convertir l'utilisateur en format JSON.
		// - Utilisez l'option { EX: 3600 } pour définir l'expiration.
		// - Utilisez la clé 'user:${user.id}' pour stocker l'utilisateur dans le cache.

		// Étape 7 : Retourner l'utilisateur créé avec un statut 201
		return json(user, { status: 201 });

	} catch (err) {
		// Étape 8 : Gestion des erreurs
		logger.error(err);
		return json({ error: 'Erreur lors de la création de l’utilisateur' }, { status: 500 });
	}
}

