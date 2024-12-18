import { sveltekit } from '@sveltejs/kit/vite';
import { type ViteDevServer, defineConfig } from 'vite';

import { Server } from 'socket.io'

function isView(obj) {
	return obj instanceof DataView || (obj && obj.buffer instanceof ArrayBuffer);
}

const webSocketServer = {
	name: 'webSocketServer',
	configureServer(server: ViteDevServer) {
		if (!server.httpServer) return

		const io = new Server(server.httpServer)

		let channelsUsers = {};

		io.on('connection', (socket) => {
			socket.on('new-channel', (channel) => {
				io.emit('new-channel', channel)
			});

			// Écouter les messages
			socket.on('new-message', (message) => {
				io.emit('new-message', message); // Diffusion du message
			});

			socket.on('new-user-join', (data) => {
				const {user, channelId } = data;
				if (!channelsUsers[channelId]) {
					channelsUsers[channelId] = [];
				}
				if (!channelsUsers[channelId].find((u) => u.id === user.id)) {
					// Ajouter l'utilisateur à la liste des utilisateurs du canal avec son socketId
					channelsUsers[channelId].push(user);
				}
				socket.join(`channel:${channelId}`);
				io.to(`channel:${channelId}`).emit('load-users-channel', channelsUsers[channelId]);
			});

			socket.on('leave-channel', (data) => {
				const { userId, channelId } = data;

				if (channelsUsers[channelId]) {
					// Supprimez l'utilisateur du canal
					channelsUsers[channelId] = channelsUsers[channelId].filter((u) => u.id !== userId);

					io.to(`channel:${channelId}`).emit('load-users-channel', channelsUsers[channelId]);
					console.log(`Utilisateur ${userId} a quitté le canal ${channelId}`);
				}
			});

			socket.on('disconnect', () => {
				console.log('Déconnexion du client');
				for (const channelId in channelsUsers) {
					channelsUsers[channelId] = channelsUsers[channelId].filter((u) => u.socketId !== socket.id);
					io.to(`channel:${channelId}`).emit('load-users-channel', channelsUsers[channelId]);
				}
				console.log('Utilisateurs connectés:', channelsUsers);
			});

			socket.on('writing', (data) => {
				const { userId, channelId } = data;
				const us = channelsUsers[channelId]?.find((u) => u.id === userId);
				if (us) {
					us.state = "Ecrit";
					io.to(`channel:${channelId}`).emit('user-writing', userId);
				}
			});

			socket.on('stop-writing', (data) => {
				const { userId, channelId } = data;
				const us = channelsUsers[channelId]?.find((u) => u.id === userId);
				if (us) {
					us.state = "En ligne";
					io.to(`channel:${channelId}`).emit('user-stop-writing', userId);
				}
			});

		});
	}
}

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
});
