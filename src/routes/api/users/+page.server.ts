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

export async function POST({ request }) {
	return new Promise((resolve, reject) => {
		// Utilisation de multer pour récupérer le fichier
		upload.single('profilePicture')(request.raw, request.raw, async (err) => {
			if (err) {
				console.error('Erreur de téléchargement:', err);
				return reject(json({ error: 'Erreur lors du téléchargement du fichier' }, { status: 500 }));
			}

			// Récupérer les données du formulaire (sans le fichier)
			const { pseudo, nom, prenom, email, password } = await request.json();

			// L'URL de l'image sera le chemin relatif à partir du dossier uploads
			const imageUrl = request.file ? `${destinationDir}/${request.file.filename}` : null;

			try {
				// Créer un nouvel utilisateur avec l'URL de l'image
				const user = await prisma.user.create({
					data: {
						pseudo,
						nom,
						prenom,
						email,
						password,
						profilePictureUrl: imageUrl, // Stocker l'URL de l'image
					},
				});

				// Mettre l'utilisateur dans le cache Redis
				await redisClient.set(`user:${user.id}`, JSON.stringify(user), { EX: 3600 });

				// Réponse avec les données de l'utilisateur
				return resolve(json(user, { status: 201 }));
			} catch (error) {
				console.error('Erreur lors de la création de l\'utilisateur:', error);
				return reject(json({ error: 'Erreur lors de la création de l\'utilisateur' }, { status: 500 }));
			}
		});
	});
}
