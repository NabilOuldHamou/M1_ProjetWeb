import prismaClient from '$lib/prismaClient';
import { error, json } from '@sveltejs/kit';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import logger from '$lib/logger';

export async function POST({request}) {
	const formData = await request.formData();

	// @ts-ignore
	const username: string = formData.get('username').toString().toLowerCase();
	// @ts-ignore
	const email: string = formData.get('email').toString().toLowerCase();
	// @ts-ignore
	const password: string = formData.get('password').toString();

	const user = await prismaClient.user.findFirst({
		where: {
			OR: [
				{ username: username },
				{ email: email },
			]
		}
	});

	if (user != null) {
		logger.debug(`A user with email (${email}) already exists in database`);
		return error(400, {message: "Un compte avec cette adresse email ou nom d'utilisateur existe déjà."});
	}

	try {
		const hash = await argon2.hash(password);

		const newUser = await prismaClient.user.create({
			data: {
				username: username,
				email: email,
				password: hash,
				surname: "",
				name: ""
			}
		});

		// @ts-ignore
		const token = jwt.sign(newUser, process.env.JWT_SECRET, { expiresIn: "1h" });
		logger.debug(`Generated a JWT token for user ${newUser.email}.`)
		return json({token: token});

	} catch (e) {
		logger.error(e);
		return error(500, {message: "Erreur interne."});
	}


}