import { io, type Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export const initSocket = (opts?: { channelId?: string; userId?: string }) => {
	if (socketInstance) return socketInstance;

	// Ne pas initialiser côté serveur
	if (typeof window === 'undefined') return null;

	// Si VITE_SOCKET_URL est configuré, l'utiliser.
	// Sinon, construire une URL sur le même hôte mais sur VITE_SOCKET_PORT (par défaut 3000).
	const envUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
	const envPort = import.meta.env.VITE_SOCKET_PORT as string | undefined;
	const defaultPort = envPort ? Number(envPort) : 3000;
	let url = envUrl || `${window.location.protocol}//${window.location.hostname}:${defaultPort}`;
	// Si on est en dev avec Vite (port 5173) et qu'aucun VITE_SOCKET_URL n'est défini,
	// évite que le client tente de joindre Vite/:5173/socket.io (404). Forcer localhost:3000
	if (!envUrl && window.location.port === '5173') {
		const forced = `${window.location.protocol}//${window.location.hostname}:3000`;
		console.warn(`initSocket: detected vite dev server on port 5173 — forcing socket URL to ${forced}`);
		url = forced;
	}
	console.log('initSocket: connecting to socket url=', url);

	// Pass auth info if provided so server can auto-join the socket to a room on connection
	const socketOpts: any = {};
	if (opts?.channelId || opts?.userId) {
		socketOpts.auth = { channelId: opts.channelId, userId: opts.userId };
	}
	socketInstance = io(url, socketOpts);

	socketInstance.on('connect', () => {
		console.log('Socket client connecté', socketInstance?.id);
	});

	socketInstance.on('connect_error', (err) => {
		console.error('Erreur connexion socket:', err);
	});

	return socketInstance;
};

export const getSocket = () => socketInstance;
