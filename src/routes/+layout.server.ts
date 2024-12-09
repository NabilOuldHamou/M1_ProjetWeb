import { redirect } from '@sveltejs/kit';
export async function load({ locals, url, fetch }) {

	const token = locals.token;

	if (token == undefined && url.pathname !== "/") {
		redirect(301, '/');
	}

	let user = null;
	if (locals.userId !== undefined) {
		const res = await fetch(`/api/users/${locals.userId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		user = await res.json();
	}


	return { token, user }
}