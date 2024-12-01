import { json } from '@sveltejs/kit';
import redisClient from '$lib/redisClient';
import prisma from '$lib/prismaClient';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const destinationDir = '/uploads';

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, `.${destinationDir}');  // Dossier où les images sont stockées`
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
	fileFilter(req, file, cb) {
		const fileExtension = path.extname(file.originalname).toLowerCase();
		if (fileExtension !== '.jpg' && fileExtension !== '.jpeg' && fileExtension !== '.png') {
			return cb(new Error('Seules les images JPG, JPEG et PNG sont autorisées.'));
		}
		cb(null, true);
	}
});

const upload = multer({ storage });

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

// Mettre à jour un utilisateur avec PUT
export async function PUT({ params, request }) {
	const userId = parseInt(params.id);

	const cachedUser = await redisClient.get(`user:${userId}`);
	// Récupérer l'utilisateur à partir de la base de données
	let existingUser;

	if (cachedUser) {
		console.log('✅ Cache hit');
		// Si l'utilisateur est dans le cache, on le parse
		existingUser = JSON.parse(cachedUser);
	} else {
		// Si l'utilisateur n'est pas dans le cache, on le récupère de la base de données
		console.log('❌ Cache miss');
		existingUser = await prisma.user.findUnique({
			where: { id: userId },
		});

	if (!existingUser) {
		return json({ error: 'Utilisateur non trouvé' }, { status: 404 });
	}

	// Utilisation de multer pour récupérer l'image (si présente)
	return new Promise((resolve, reject) => {
		upload.single('profilePicture')(request.raw, request.raw, async (err) => {
			if (err) {
				console.error('Erreur de téléchargement:', err);
				return reject(json({ error: 'Erreur lors du téléchargement du fichier' }, { status: 500 }));
			}

			// Extraire les autres données (pseudo, nom, etc.) du body de la requête
			const { pseudo, nom, prenom, email, password } = await request.json();

			let updatedUserData = {
				pseudo,
				nom,
				prenom,
				email,
				password, // Assurez-vous de bien sécuriser les mots de passe
			};

			// Si une nouvelle image est envoyée
			if (request.file) {
				// Vérifiez si l'utilisateur a déjà une image
				if (existingUser.profilePictureUrl) {
					// Supprimer l'ancienne image
					const oldImagePath = `.${destinationDir}/${path.basename(existingUser.profilePictureUrl)}`;
					if (fs.existsSync(oldImagePath)) {
						fs.unlinkSync(oldImagePath); // Suppression du fichier
					}
				}

				// Ajouter la nouvelle image à la base de données
				updatedUserData.profilePictureUrl = `${destinationDir}/${request.file.filename}`;
			} else if (!request.file && existingUser.profilePictureUrl) {
				// Si aucune image n'est envoyée, supprimer l'image actuelle
				const oldImagePath = `.${destinationDir}/${path.basename(existingUser.profilePictureUrl)}`;
				if (fs.existsSync(oldImagePath)) {
					fs.unlinkSync(oldImagePath); // Supprimer l'ancienne image
				}

				// Mettre à jour l'URL de l'image en null
				updatedUserData.profilePictureUrl = null;
			}

			try {
				// Mettre à jour l'utilisateur dans la base de données
				const updatedUser = await prisma.user.update({
					where: { id: userId },
					data: updatedUserData,
				});

				// Mettre à jour l'utilisateur dans le cache Redis
				await redisClient.set(`user:${userId}`, JSON.stringify(updatedUser), 'EX', 3600); // Cache pendant 1 heure (3600 secondes)

				// Réponse avec l'utilisateur mis à jour
				return resolve(json(updatedUser));
			} catch (error) {
				console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
				return reject(json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' }, { status: 500 }));
			}
		});
	});
}


export async function DELETE({ params }) {
	const userId = parseInt(params.id);

	try {
		// Vérifier si l'utilisateur est dans le cache Redis
		const cachedUser = await redisClient.get(`user:${userId}`);
		let userToDelete;

		if (cachedUser) {
			console.log('✅ Cache hit');
			// Si l'utilisateur est dans le cache, on le parse
			userToDelete = JSON.parse(cachedUser);
		} else {
			// Si l'utilisateur n'est pas dans le cache, on le récupère de la base de données
			console.log('❌ Cache miss');
			userToDelete = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!userToDelete) {
				return json({ error: 'Utilisateur non trouvé' }, { status: 404 });
			}

			// Mettre l'utilisateur dans le cache Redis
			await redisClient.set(`user:${userId}`, JSON.stringify(userToDelete), { EX: 3600 }); // Cache pendant 1 heure
		}

		// Si l'utilisateur a une image de profil, la supprimer
		if (userToDelete.profilePictureUrl) {
			// Calculer le chemin du fichier à supprimer
			const imagePath = `.${destinationDir}/${path.basename(userToDelete.profilePictureUrl)}`;
			if (fs.existsSync(imagePath)) {
				fs.unlinkSync(imagePath); // Supprimer le fichier image
			}
		}

		// Supprimer l'utilisateur de la base de données
		await prisma.user.delete({
			where: { id: userId },
		});

		// Supprimer l'utilisateur du cache Redis
		await redisClient.del(`user:${userId}`);

		// Réponse après suppression réussie
		return json({ message: 'Utilisateur et image supprimés avec succès' });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la suppression de l’utilisateur' }, { status: 500 });
	}
}




