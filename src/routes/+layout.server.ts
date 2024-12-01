import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
	const token = locals.token;

	if (token == undefined && url.pathname !== "/") {
		redirect(301, "/");
	}

	return { token }
}