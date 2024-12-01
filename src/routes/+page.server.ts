import type { Actions } from '@sveltejs/kit';
import prismaClient from '$lib/prismaClient';

export const actions: Actions = {
	login: async ({request}) => {
		const formData = await request.formData();

		console.log(formData.get("username"));

		await prismaClient.user.create({
			data: {
				email: "fdp",
				username: "test",
				surname: "azeza",
				name: "aiudhza",
				password: "feur"
			}
		});

	}
}