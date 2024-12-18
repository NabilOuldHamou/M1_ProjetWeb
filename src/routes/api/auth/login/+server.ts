import prismaClient from '$lib/prismaClient';
import { error, json } from '@sveltejs/kit';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import logger from '$lib/logger';

export async function POST({ request }) {
	// Étape 1 : Récupérer les données du formulaire de la requête
	const formData = await request.formData();

	// @ts-ignore
	const email: string = formData.get('email').toString();
	// @ts-ignore
	const password: string = formData.get('password').toString();

	// Étape 2 : Vérifier si l'utilisateur existe dans la base de données
	const user = await prismaClient.user.findFirst({
		where: {
			email: email,
		}
	});

	// Si l'utilisateur n'est pas trouvé, retourner une erreur
	if (user == null) {
		logger.debug(`Could not find user with email (${email}) in database`);
		return error(400, { message: "Email ou mot de passe invalide." });
	}

	// Étape 3 : Vérifier si le mot de passe est correct
	logger.debug(`Found user with email (${email}) in database`);
	try {
		if (await argon2.verify(user.password, password)) {
			logger.debug(`Password for user ${user.email} is correct.`);

			// Étape 4 : Générer un token JWT pour l'utilisateur
			// @ts-ignore
			const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
			logger.debug(`Generated a JWT token for user ${user.email}.`);

			// Étape 5 : Retourner le token et l'ID de l'utilisateur
			return json({ token: token, userId: user.id });

		} else {
			return error(400, { message: "Email ou mot de passe invalide." });
		}

	} catch (e) {
		// Étape 6 : Gestion des erreurs
		logger.error(e);
		return error(500, { message: e.body.message });
	}
}