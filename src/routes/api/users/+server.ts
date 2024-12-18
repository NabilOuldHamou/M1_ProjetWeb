// src/routes/api/users/+server.js
import { json } from '@sveltejs/kit';
import redisClient from '$lib/redisClient';
import prisma from '$lib/prismaClient';
import logger from '$lib/logger';

export async function GET() {
	try {
		// Vérifier si les utilisateurs sont dans le cache Redis
		const cachedUsers = await redisClient.get('users');
		if (cachedUsers) {
			logger.debug('Cache entry found, fetching users from cache');
			return json(JSON.parse(cachedUsers));
		}

		logger.debug('No cache entry was found, fetching users from database');
		// Sinon, récupérer les utilisateurs depuis MongoDB
		const users = await prisma.user.findMany();

		// Mettre les utilisateurs en cache
		logger.debug('Caching users with EX of 600 secs');
		await redisClient.set('users', JSON.stringify(users), { EX: 600 });

		return json(users);
	} catch (err) {
		logger.error(err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
}

export async function POST({ request }) {
	const { username, surname, name, email, password } = await request.json();

	try {
		const user = await prisma.user.create({
			data: {
				username: username.toLowerCase(),
				surname,
				name,
				email: email.toLowerCase(),
				password,
			},
		});
		logger.debug('Creating a new user in database with id ' + user.id);

		// Mettre le nouvel utilisateur dans le cache
		logger.debug(`Caching user (${user.id})`);
		const cachedUsers = await redisClient.get('users');
		const usersArray = cachedUsers != null ? JSON.parse(cachedUsers) : [];
		usersArray.push(user);

		logger.debug(`Added user (${user.id}) to users cache.`);
		await redisClient.set('users', JSON.stringify(usersArray), { EX: 600 })
		logger.debug(`Creating a new cache entry with key user:${user.id}, with EX of 3600 secs`);
		await redisClient.set(`user:${user.id}`, JSON.stringify(user), { EX: 3600 });

		return json(user, { status: 201 });
	} catch (err) {
		logger.error(err)
		return json({ error: 'Erreur lors de la création de l’utilisateur' }, { status: 500 });
	}
}
