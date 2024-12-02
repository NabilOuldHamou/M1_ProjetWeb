import { json } from '@sveltejs/kit';
import redisClient from '$lib/redisClient';
import prisma from '$lib/prismaClient';
import logger from '$lib/logger';

export async function GET({ params }) {
	const userId = params.id;

	try {
		// Vérifier si l'utilisateur est dans le cache Redis
		const cachedUser = await redisClient.get(`user:${userId}`);
		if (cachedUser) {
			logger.debug(`Cache entry found, fetching user (${params.id}) from cache`);
			return json(JSON.parse(cachedUser));
		}

		logger.debug(`No cache entry was found, fetching user (${params.id}) from database`);
		// Si non, récupérer depuis MongoDB via Prisma
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			logger.debug(`No record of user (${params.id}) found in database`);
			return json({ error: 'Utilisateur non trouvé' }, { status: 404 });
		}

		// Mettre l'utilisateur en cache
		const cachedUsers = await redisClient.get('users');
		const usersArray = cachedUsers != null ? JSON.parse(cachedUsers) : [];
		usersArray.push(user);
		logger.debug(`Added user (${user.id}) to users cache.`);
		await redisClient.set('users', JSON.stringify(usersArray), { EX: 600 })
		logger.debug(`Creating a new cache entry with key user:${user.id}, with EX of 3600 secs`);
		await redisClient.set(`user:${userId}`, JSON.stringify(user), { EX: 3600 });

		return json(user);
	} catch (err) {
		logger.error(err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
}

// Mettre à jour un utilisateur avec PUT
export async function PUT({ params, request }) {
	const userId = params.id;
	const { username, surname, name, email, password } = await request.json();

	try {
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				username,
				surname,
				name,
				email,
				password, // Attention à ne pas oublier de sécuriser le mot de passe avec bcrypt ou une autre méthode
			},
		});
		logger.debug(`Updated user (${updatedUser.id}) in database`);

		// Mettre à jour l'utilisateur dans le cache Redis
		const cachedUsers = await redisClient.get('users');
		let usersArray = cachedUsers != null ? JSON.parse(cachedUsers) : [];
		usersArray = usersArray.filter((u: { id: string }) => u.id !== updatedUser.id);
		usersArray.push(updatedUser);
		logger.debug(`Updated user (${updatedUser.id}) in users cache.`);
		await redisClient.set('users', JSON.stringify(usersArray), { EX: 600 })
		logger.debug(`Updated cache entry with key user:${updatedUser.id}`);
		await redisClient.set(`user:${userId}`, JSON.stringify(updatedUser), { EX: 3600 }); // Cache pendant 1 heure (3600 secondes)

		return json(updatedUser);
	} catch (err) {
		logger.error(err);
		return json({ error: 'Erreur lors de la mise à jour de l’utilisateur' }, { status: 500 });
	}
}


export async function DELETE({ params }) {
	const userId = params.id;

	try {
		const deletedUser = await prisma.user.delete({
			where: { id: userId },
		});
		logger.debug(`Deleted user (${deletedUser.id}) from database.`);

		// Supprimer l'utilisateur du cache Redis
		const cachedUsers = await redisClient.get('users');
		let usersArray = cachedUsers != null ? JSON.parse(cachedUsers) : [];
		usersArray = usersArray.filter((u: { id: string }) => u.id !== deletedUser.id);
		logger.debug(`Deleted cache entry with key user:${deletedUser.id}`);
		await redisClient.del(`user:${userId}`);
		logger.debug(`Deleted user (${deletedUser.id}) from users cache.`);
		await redisClient.set('users', JSON.stringify(usersArray), { EX: 600 })

		return json({ message: 'Utilisateur supprimé avec succès' });
	} catch (err) {
		logger.error(err);
		return json({ error: 'Erreur lors de la suppression de l’utilisateur' }, { status: 500 });
	}
}



