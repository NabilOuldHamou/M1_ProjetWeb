export function imageUrl(path?: string | null): string {
	// Si path est vide, retourner l'image par défaut locale
	if (!path) return '/profile-default.svg';

	// Si c'est déjà une url absolue (http:// ou https://) -> renvoyer tel quel
	if (/^https?:\/\//i.test(path)) return path;

	// Si la chaîne contient un host (ex: "arbres.oxyjen.io/xxx" ou "//arbres..."), extraire le chemin
	const hostPattern = /(?:^|\/|\\)(arbres\.oxyjen\.io)(?:\/)?(.*)$/i;
	const match = path.match(hostPattern);
	if (match) {
		const extracted = match[2] || '';
		// En dev, utiliser le proxy interne
		if (import.meta.env.DEV) {
			return `/api/asset/${encodeURIComponent(extracted)}`;
		}
		// En prod, s'assurer du protocole
		const host = (import.meta.env.VITE_ASSETS_HOST as string | undefined) || 'https://arbres.oxyjen.io';
		return `${host}/${extracted}`;
	}

	// En développement, ne pas faire de requête sur un host externe non résolu.
	// Retourner l'URL du proxy local qui renverra l'image si elle existe ou l'image par défaut autrement.
	if (import.meta.env.DEV) {
		const name = path.startsWith('/') ? path.slice(1) : path;
		return `/api/asset/${encodeURIComponent(name)}`;
	}

	// En production : host configurable via VITE_ASSETS_HOST sinon fallback
	const host = (import.meta.env.VITE_ASSETS_HOST as string | undefined) || 'https://arbres.oxyjen.io';

	// Retirer un slash en double si présent
	if (path.startsWith('/')) path = path.slice(1);

	return `${host}/${path}`;
}
