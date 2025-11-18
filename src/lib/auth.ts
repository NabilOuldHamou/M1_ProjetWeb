import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Vérifie si la requête contient un token valide
 * Retourne une erreur 401 si le token est absent ou invalide
 */
export function requireAuth(event: RequestEvent): { token: string; userId: string } | Response {
	const token = event.cookies.get('token');
	const userId = event.cookies.get('UID');

	// Vérifier si le token et userId existent et ne sont pas vides
	const isAuthenticated = token && token.trim() !== '' && userId && userId.trim() !== '';

	if (!isAuthenticated) {
		return json({ error: 'Non autorisé - authentification requise' }, { status: 401 });
	}

	return { token, userId };
}

/**
 * Vérifie si la requête est authentifiée (utilisé pour les checks booléens)
 */
export function isAuthenticated(event: RequestEvent): boolean {
	const token = event.cookies.get('token');
	const userId = event.cookies.get('UID');
	return !!(token && token.trim() !== '' && userId && userId.trim() !== '');
}

