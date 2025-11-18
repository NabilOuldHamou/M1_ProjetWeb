import prismaClient from '$lib/prismaClient';
import { error, json } from '@sveltejs/kit';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import logger from '$lib/logger';

export async function POST({request}) {
	const body = await request.json();
	const email: string = body.email;
	const password: string = body.password;

	const user = await prismaClient.user.findFirst({
		where: {
			email: email,
		}
	});

	if (user == null) {
		logger.debug(`Could not find user with email (${email}) in database`);
		return error(400, {message: "Email ou mot de passe invalide."});
	}

	logger.debug(`Found user with email (${email}) in database`);
	try {
		if (await argon2.verify(user.password, password)) {
			logger.debug(`Password for user ${user.email} is correct.`);
			const token = jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: "1h" });
			logger.debug(`Generated a JWT token for user ${user.email}.`)
			return json({token: token, userId: user.id});

		} else {
			return error(400, {message: "Email ou mot de passe invalide."});
		}

	} catch (e) {
		logger.error(e);
		return error(500, {message: "Erreur interne du serveur."});
	}


}