import { json } from '@sveltejs/kit';
import redisClient from '$lib/redisClient';
import prisma from '$lib/prismaClient';

export async function GET({ params }) {
	const userId = params.id;

	try {
		// Vérifier si l'utilisateur est dans le cache Redis
		const cachedUser = await redisClient.get(`user:${userId}`);
		if (cachedUser) {
			console.log('✅ Cache hit');
			return json(JSON.parse(cachedUser));
		}

		console.log('❌ Cache miss');
		// Si non, récupérer depuis MongoDB via Prisma
		const user = await prisma.user.findUnique({
			where: { id: parseInt(userId) },
		});

		if (!user) {
			return json({ error: 'Utilisateur non trouvé' }, { status: 404 });
		}

		// Mettre l'utilisateur en cache
		await redisClient.set(`user:${userId}`, JSON.stringify(user), { EX: 3600 });

		return json(user);
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
}

export async function POST({ request }) {
	const { pseudo, nom, prenom, email, password } = await request.json();

	try {
		const user = await prisma.user.create({
			data: {
				pseudo,
				nom,
				prenom,
				email,
				password,
			},
		});

		// Mettre le nouvel utilisateur dans le cache
		await redisClient.set(`user:${user.id}`, JSON.stringify(user), { EX: 3600 });

		return json(user, { status: 201 });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la création de l’utilisateur' }, { status: 500 });
	}
}

// Mettre à jour un utilisateur avec PUT
export async function PUT({ params, request }) {
	const userId = parseInt(params.id);
	const { pseudo, nom, prenom, email, password } = await request.json(); // Assurez-vous d'envoyer tous les champs nécessaires dans le body

	try {
		// Mettre à jour l'utilisateur dans la base de données
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				pseudo,
				nom,
				prenom,
				email,
				password, // Attention à ne pas oublier de sécuriser le mot de passe avec bcrypt ou une autre méthode
			},
		});

		// Mettre à jour l'utilisateur dans le cache Redis
		await redisClient.set(`user:${userId}`, JSON.stringify(updatedUser), 'EX', 3600); // Cache pendant 1 heure (3600 secondes)

		return json(updatedUser);
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la mise à jour de l’utilisateur' }, { status: 500 });
	}
}


export async function DELETE({ params }) {
	const userId = parseInt(params.id);

	try {
		await prisma.user.delete({
			where: { id: userId },
		});

		// Supprimer l'utilisateur du cache Redis
		await redisClient.del(`user:${userId}`);

		return json({ message: 'Utilisateur supprimé avec succès' });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la suppression de l’utilisateur' }, { status: 500 });
	}
}



