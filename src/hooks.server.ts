import type { Handle } from '@sveltejs/kit';
import { Server } from 'socket.io';
import http from 'http';
import logger from '$lib/logger';

let io: Server;

type User = { id: string; socketId?: string; state?: string; [key: string]: unknown };

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.token = event.cookies.get('token');
	event.locals.userId = event.cookies.get('UID');

	// Si l'instance n'existe pas, on l'initialise.
	// En production avec adapter-node, SvelteKit expose un httpServer via event.platform.node.httpServer
	// En dev (vite dev) ce champ est souvent absent : on crée alors un serveur Socket.IO autonome sur SOCKET_PORT.
	if (!io) {
		const SOCKET_PORT = Number(process.env.SOCKET_PORT || 3000);

		// cast event.platform vers un type explicite pour accéder à node.httpServer sans utiliser `any`
		const platformNode = (event.platform ?? {}) as { node?: { httpServer?: http.Server } };
		if (platformNode.node?.httpServer) {
			const httpServer = platformNode.node.httpServer;

			io = new Server(httpServer, {
				cors: {
					origin: '*'
				}
			});
			console.log('Socket.IO attaché au httpServer de SvelteKit');
		} else {
			// Crée un http.Server autonome puis attache Socket.IO dessus (plus fiable que new Server(port, ...))
			const standaloneServer = http.createServer();
			io = new Server(standaloneServer, {
				cors: {
					origin: '*'
				}
			});
			standaloneServer.on('error', (err) => {
				console.error('Erreur lors du démarrage du standalone Socket.IO server:', err);
			});
			standaloneServer.listen(SOCKET_PORT, '0.0.0.0', () => {
				const addr = standaloneServer.address();
				console.log(`Socket.IO démarré (standalone) — écoute sur ${JSON.stringify(addr)}`);
			});
		}

		// Exporter l'instance io pour que les endpoints API puissent émettre des événements
		try {
			const { setIo } = await import('$lib/socketServer');
			setIo(io);
		} catch (e) {
			console.warn('Impossible d\'exporter io via setIo:', e);
		}

		// Use shared channelsUsers managed in $lib/socketServer
		const { addUserToChannel, removeUserFromChannel, removeSocketFromAllChannels, getUsersInChannel, setUserSocketId } = await import('$lib/socketServer');

		io.on('connection', (socket) => {
			console.log('Client connecté:', socket.id);
			// Dump channelsUsers at connection time for debugging
			(async () => {
				try {
					const { debugDumpChannels } = await import('$lib/socketServer');
					const dump = debugDumpChannels();
					logger.debug(`channelsUsers dump on connection: ${JSON.stringify(dump)}`);
				} catch (dE) {
					console.debug('Unable to dump channelsUsers at connection:', dE);
				}
			})();

			// Auto-join support: si le client a fourni handshake.auth { channelId, userId }, on effectue le join automatiquement
			try {
				const auth = (socket.handshake && (socket.handshake as any).auth) || {};
				if (auth && auth.channelId && auth.userId) {
					try {
						// Ensure any existing entry for this user gets its socketId updated
						try { setUserSocketId(auth.userId, socket.id); } catch (e) { /* ignore */ }
						addUserToChannel(auth.channelId, { id: auth.userId, socketId: socket.id, state: 'En ligne' });
						const roomNameAuth = `channel:${auth.channelId}`;
						socket.join(roomNameAuth);
						const usersListAuth = getUsersInChannel(auth.channelId);
						socket.emit('load-users-channel', usersListAuth);
						socket.broadcast.to(roomNameAuth).emit('load-users-channel', usersListAuth);
						console.log(`[Socket] Auto-join effectué pour socket ${socket.id} sur ${roomNameAuth} (userId=${auth.userId})`);
					} catch (ajErr) {
						console.warn('Auto-join failed:', ajErr);
					}
				}
			} catch (e) {
				console.warn('Error reading handshake auth for auto-join', e);
			}

			// Nouveau canal
			socket.on('new-channel', (channel, ack?: (res:{ok:boolean}) => void) => {
				console.log(`[Socket] new-channel reçu de ${socket.id}:`, channel);
				io.emit('new-channel', channel);
				console.log(`[Socket] new-channel broadcast effectué pour channelId=${channel?.id}`);
				if (ack) ack({ ok: true });
			});

			// NOTE: We intentionally do NOT handle 'new-message' emitted by clients here to avoid
			// double-broadcasting when the API also emits the event after persisting the message.
			// Message emission is performed by the HTTP API which creates the message and
			// then uses the shared io instance to emit to the room.

			// Améliorer les logs pour les joins afin d'aider au debug des utilisateurs connectés
			socket.on('new-user-join', ({ user, channelId }, ack?: (res: { ok: boolean; room?: string; users?: string[] | User[] }) => void) => {
				try { setUserSocketId((user as User).id, socket.id); } catch (e) { /* ignore */ }
				addUserToChannel(channelId, { ...(user as User), socketId: socket.id, state: 'En ligne' });
				// dump after join
				(async () => {
					try {
						const { debugDumpChannels } = await import('$lib/socketServer');
						const dump = debugDumpChannels();
						logger.debug(`channelsUsers dump after new-user-join: ${JSON.stringify(dump)}`);
					} catch (dE) {
						console.debug('Unable to dump channelsUsers after join:', dE);
					}
				})();

				const roomName = `channel:${channelId}`;
				socket.join(roomName);
				const usersList = getUsersInChannel(channelId);
				console.log(`[Socket] ${socket.id} a rejoint ${roomName} — users:`, usersList.map(u=>u.id));

				// Envoyer la liste immédiatement au nouvel arrivant
				socket.emit('load-users-channel', usersList);
				// Diffuser la liste aux autres participants (exclut l'appelant)
				socket.broadcast.to(roomName).emit('load-users-channel', usersList);
				// ack pour confirmer join
				if (ack) ack({ ok: true, room: roomName, users: usersList });
			});

			// Handler pour que le client puisse demander la liste actuelle des users dans une room
			socket.on('request-users', ({ channelId }, ack?: (res: { ok: boolean; users?: User[] }) => void) => {
				const usersList = getUsersInChannel(channelId) ?? [];
				console.log(`[Socket] request-users de ${socket.id} pour channel:${channelId} (users=${usersList.length})`);
				// envoyer uniquement à l'appelant
				socket.emit('load-users-channel', usersList);
				if (ack) ack({ ok: true, users: usersList });
			});

			// Quitter un canal
			socket.on('leave-channel', ({ userId, channelId }) => {
				removeUserFromChannel(channelId, userId);
				const usersList = getUsersInChannel(channelId);
				io.to(`channel:${channelId}`).emit('load-users-channel', usersList);
			});

			// Déconnexion
			socket.on('disconnect', () => {
				const modified = removeSocketFromAllChannels(socket.id);
				for (const channelId of modified) {
					const usersList = getUsersInChannel(channelId);
					io.to(`channel:${channelId}`).emit('load-users-channel', usersList);
				}
				// dump after disconnect
				(async () => {
					try {
						const { debugDumpChannels } = await import('$lib/socketServer');
						const dump = debugDumpChannels();
						logger.debug(`channelsUsers dump after disconnect: ${JSON.stringify(dump)}`);
					} catch (dE) {
						console.debug('Unable to dump channelsUsers after disconnect:', dE);
					}
				})();
			});

			// Écriture en cours
			socket.on('writing', ({ userId, channelId }) => {
				const users = getUsersInChannel(channelId);
				const user = users.find(u => u.id === userId);
				if (user) {
					user.state = 'Écrit';
					io.to(`channel:${channelId}`).emit('user-writing', userId);
				}
			});

			socket.on('stop-writing', ({ userId, channelId }) => {
				const users = getUsersInChannel(channelId);
				const user = users.find(u => u.id === userId);
				if (user) {
					user.state = 'En ligne';
					io.to(`channel:${channelId}`).emit('user-stop-writing', userId);
				}
			});
		});

		console.log('Socket.IO initialisé 🎉');
	}

	return resolve(event);
};