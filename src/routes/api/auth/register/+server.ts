import prismaClient from '$lib/prismaClient';
import { error, json } from '@sveltejs/kit';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import logger from '$lib/logger';

// POST: Créer un utilisateur et générer un token JWT
export async function POST({ request }) {
	// Étape 1 : Récupérer les données du formulaire de la requête
	const formData = await request.formData();

	const username: string = formData.get('username').toString().toLowerCase(); // Nom d'utilisateur en minuscules
	const email: string = formData.get('email').toString().toLowerCase(); // Email en minuscules
	const password: string = formData.get('password').toString(); // Mot de passe brut

	// Étape 2 : Vérifier si l'utilisateur existe déjà dans la base de données
	// Question 12 - A implémenter : Recuperer l'utilisateur avec le nom d'utilisateur ou l'email fourni.
	// - Utilisez la méthode await prismaClient.user.findFirst pour récupérer l'utilisateur par son nom d'utilisateur ou son email.
	// - Utilisez une clause OR pour rechercher l'utilisateur par nom d'utilisateur ou email.
	// - Stockez l'utilisateur dans une variable 'user' constante (const).

	// Si l'utilisateur existe déjà, retourner une erreur
	if (user != null) {
		logger.debug(`A user with email (${email}) already exists in database`);
		return error(400, { message: "Un compte avec cette adresse email ou nom d'utilisateur existe déjà." });
	}

	try {
		// Étape 3 : Hash du mot de passe
		const hash = await argon2.hash(password);

		// Étape 4 : Créer un nouvel utilisateur dans la base de données
		// Question 13 - A implémenter : Utilisez `prismaClient.user.create` pour créer un utilisateur avec les données récupérées et le mot de passe hashé.
		// - Utilisez await prismaClient.user.create pour créer un utilisateur avec les données fournies.
		// - Incluez le nom d'utilisateur, l'email, le mot de passe hashé, le nom (par défaut vide) et le nom de famille (par défaut vide).
		// - Stockez le nouvel utilisateur dans une variable `newUser` (const).

		// Étape 5 : Générer un token JWT pour l'utilisateur
		const token = jwt.sign(newUser, process.env.JWT_SECRET, { expiresIn: "1h" });
		logger.debug(`Generated a JWT token for user ${newUser.email}.`);

		// Étape 6 : Retourner le token et l'ID de l'utilisateur créé
		return json({ token: token, userId: newUser.id });

	} catch (e) {
		// Étape 7 : Gestion des erreurs
		logger.error(e);
		return error(500, { message: "Erreur interne." });
	}
}