import { redirect } from '@sveltejs/kit';

export async function POST({ cookies }) {
	// Supprimer les cookies "token" et "UID"
	cookies.delete("token", { path: '/' });
	cookies.delete("UID", { path: '/' });

	// Rediriger vers la page d'accueil ou la page de connexion après déconnexion
	throw redirect(303, '/');
}