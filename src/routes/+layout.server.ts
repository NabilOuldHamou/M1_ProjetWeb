import { redirect } from '@sveltejs/kit';
import { initSocket } from "$lib/stores/socket";


export async function load({ locals, url }) {

	const token = locals.token;

	if (token == undefined && url.pathname !== "/") {
		redirect(301, "/");
	}

	return { token }
}