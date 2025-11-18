import { redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

export async function load({ locals, url, fetch, cookies }) {

	const token = locals.token;
	const userId = locals.userId;

	// Vérifier si le token et userId existent et ne sont pas vides
	const isAuthenticated = token && token.trim() !== '' && userId && userId.trim() !== '';

	// Si pas authentifié et qu'on n'est pas sur la page de login, rediriger vers la page de login (/)
	if (!isAuthenticated && url.pathname !== "/") {
		throw redirect(302, '/');
	}

	let user = null;
	if (isAuthenticated) {
		// Vérifier la validité du token JWT
		try {
			jwt.verify(token, process.env.JWT_SECRET as string);
		} catch (error) {
			// Token invalide ou expiré - supprimer les cookies et rediriger
			cookies.delete('token', { path: '/' });
			cookies.delete('UID', { path: '/' });
			throw redirect(302, '/');
		}

		// Récupérer les informations de l'utilisateur
		const res = await fetch(`/api/users/${userId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				// Transmettre les cookies pour l'authentification de l'API
				'Cookie': `token=${token}; UID=${userId}`
			}
		});

		// Si l'API retourne une erreur (user non trouvé, 401, etc.), déconnecter
		if (!res.ok) {
			cookies.delete('token', { path: '/' });
			cookies.delete('UID', { path: '/' });
			throw redirect(302, '/');
		}

		user = await res.json();

		// Si l'utilisateur n'existe pas ou a une erreur, déconnecter
		if (!user || user.error) {
			cookies.delete('token', { path: '/' });
			cookies.delete('UID', { path: '/' });
			throw redirect(302, '/');
		}
	}


	return { token, user }
}