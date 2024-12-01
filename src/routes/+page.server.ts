import { type Actions } from '@sveltejs/kit';
import prismaClient from '$lib/prismaClient';
import * as argon2 from 'argon2';
import { redirect, error } from '@sveltejs/kit';
import logger from '$lib/logger';

export const actions: Actions = {
	login: async ({request}) => {
		const formData = await request.formData();

		// @ts-ignore Can't be empty
		const username = formData.get('username').toString();

		// @ts-ignore Can't be empty
		const password = formData.get('password').toString();

		const user = await prismaClient.user.findFirst({
			where: {
				username: username,
			}
		});

		if (user == null) {
			return error(400, {message: "Nom d'utilisateur ou mot de passe invalide."});
		}

		try {
			// @ts-ignore Already checked for null
			if (await argon2.verify(user.password, password)) {
				logger.log("info", "saijdazji")
				logger.log("debug", "saijdazji")
			} else {
				return error(400, {message: "Nom d'utilisateur ou mot de passe invalide."});
			}
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (e) {
			return error(500, {message: "Erreur interne."})
		}
	},

	register: async ({request}) => {
		const formData = await request.formData();

		// @ts-ignore Can't be empty
		const username = formData.get('username').toString();
		// @ts-ignore Can't be empty
		const email = formData.get('email').toString();
		// @ts-ignore Can't be empty
		const password = formData.get('password').toString();

		const user = await prismaClient.user.findFirst({
			where: {
				OR: [
					{
						email: email
					},
					{
						username: username
					}
				]
			}
		});

		if (user != null) {
			return error(400, { message: "Un compte avec cette email ou nom d'utilisateur éxiste déjà." });
		}

		const hash = await argon2.hash(password);

		await prismaClient.user.create({
			data: {
				email: email,
				username: username,
				name: "",
				surname: "",
				password: hash,
			}
		});

		return redirect(302, "/chat");
	}
}