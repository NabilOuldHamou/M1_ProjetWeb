import type { RequestHandler } from '@sveltejs/kit';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export const GET: RequestHandler = async ({ params }) => {
	const name = params.name || '';
	const decoded = decodeURIComponent(name);
	// sanitize: empêcher chemins relatifs
	if (decoded.includes('..')) {
		return new Response('Invalid name', { status: 400 });
	}

	const filePath = join(process.cwd(), 'static', decoded);
	try {
		await stat(filePath);
		const data = await readFile(filePath);
		const ext = decoded.split('.').pop()?.toLowerCase() || '';
		let contentType = 'application/octet-stream';
		switch (ext) {
			case 'png': contentType = 'image/png'; break;
			case 'jpg':
			case 'jpeg': contentType = 'image/jpeg'; break;
			case 'svg': contentType = 'image/svg+xml'; break;
			case 'webp': contentType = 'image/webp'; break;
		}
		return new Response(data, { headers: { 'Content-Type': contentType } });
	} catch (err) {
		// Si pas trouvé, renvoyer l'image par défaut
		try {
			const fallback = join(process.cwd(), 'static', 'profile-default.svg');
			const data = await readFile(fallback);
			return new Response(data, { headers: { 'Content-Type': 'image/svg+xml' } });
		} catch (e) {
			return new Response('Not found', { status: 404 });
		}
	}
};

