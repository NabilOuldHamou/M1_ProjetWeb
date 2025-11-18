import { type Actions } from '@sveltejs/kit';
import { redirect, fail } from '@sveltejs/kit';
import logger from '$lib/logger';

export async function load({locals}) {
	if (locals.token != undefined) {
		throw redirect(302, "/chats")
	}
}

export const actions: Actions = {
	login: async ({request, fetch, cookies}) => {
		const formData = await request.formData();

		// Convertir FormData en JSON
		const body = {
			email: formData.get('email')?.toString() || '',
			password: formData.get('password')?.toString() || ''
		};

		const response = await fetch('/api/auth/login', {
			method: "POST",
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		const data = await response.json();

		if (response.ok) {
			cookies.set('token', data.token, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				maxAge: (60 * 60) * 30,
			});

			cookies.set('UID', data.userId, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				maxAge: (60 * 60) * 30,
			});

			logger.debug("Successfully created a cookie for the user and proceeded with the login.");

			return redirect(302, "/chats");
		} else {
			return fail(400, { error: data.message });
		}
	},

	register: async ({request, fetch, cookies}) => {
		const formData = await request.formData();

		// Convertir FormData en JSON
		const body = {
			username: formData.get('username')?.toString() || '',
			email: formData.get('email')?.toString() || '',
			password: formData.get('password')?.toString() || ''
		};

		const response = await fetch('/api/auth/register', {
			method: "POST",
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		const data = await response.json();

		if (response.ok) {
			cookies.set('token', data.token, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				maxAge: (60 * 60) * 30,
			});

			cookies.set('UID', data.userId, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				maxAge: (60 * 60) * 30,
			});

			logger.debug("Successfully created a cookie for the user and proceeded with the register.")

			return redirect(302, "/chats");
		} else {
			return fail(400, { error: data.message });
		}
	}
}