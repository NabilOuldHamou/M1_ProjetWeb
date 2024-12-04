import { redirect } from '@sveltejs/kit';
export async function load({ locals, url, fetch }) {

	const token = locals.token;

	if (token == undefined && url.pathname !== "/") {
		redirect(301, "/");
	}

	const res = await fetch(`/api/users/${locals.userId}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	});
	const user = await res.json();


	return { token, user }
}