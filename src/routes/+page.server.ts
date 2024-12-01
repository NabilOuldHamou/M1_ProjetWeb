import { type Actions } from '@sveltejs/kit';
import { redirect, error } from '@sveltejs/kit';
import logger from '$lib/logger';

export async function load({locals}) {
	if (locals.token != undefined) {
		redirect(302, "/chats")
	}
}

export const actions: Actions = {
	login: async ({request, fetch, cookies}) => {
		const formData = await request.formData();

		const response = await fetch('/api/auth/login', {
			method: "POST",
			body: formData
		});

		const data = await response.json();

		if (response.ok) {
			cookies.set('token', data.token, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				maxAge: (60 * 60) * 30,
			});

			logger.debug("Successfully created a cookie for the user and proceeded with the login.")

			return redirect(302, "/chats");
		} else {

			return error(400, data.message);
		}
	},

	register: async ({request, fetch, cookies}) => {
		const formData = await request.formData();

		const response = await fetch('/api/auth/register', {
			method: "POST",
			body: formData
		});

		const data = await response.json();

		if (response.ok) {
			cookies.set('token', data.token, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				maxAge: (60 * 60) * 30,
			});

			logger.debug("Successfully created a cookie for the user and proceeded with the register.")

			return redirect(302, "/chats");
		} else {

			return error(400, data.message);
		}
	}
}