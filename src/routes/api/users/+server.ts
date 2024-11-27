// src/routes/api/users/+server.js
import { json } from '@sveltejs/kit';
import redisClient from '$lib/redisClient';
import prisma from '$lib/prismaClient';

export async function GET() {
	try {
		// Vérifier si les utilisateurs sont dans le cache Redis
		const cachedUsers = await redisClient.get('users');
		if (cachedUsers) {
			console.log('✅ Cache hit');
			return json(JSON.parse(cachedUsers));
		}

		console.log('❌ Cache miss');
		// Sinon, récupérer les utilisateurs depuis MongoDB
		const users = await prisma.user.findMany();

		// Mettre les utilisateurs en cache
		await redisClient.set('users', JSON.stringify(users), { EX: 600 });

		return json(users);
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
}
