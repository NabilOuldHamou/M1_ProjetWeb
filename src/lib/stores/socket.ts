import { io } from "socket.io-client";

// Initialisation de la socket
export const initSocket = () => {
	const socketInstance = io("http://localhost:5173");

	// Événements globaux de connexion
	socketInstance.on("connect", () => {
		console.log("Connected to Socket.IO server:", socketInstance.id);
	});

	socketInstance.on("disconnect", () => {
		console.log("Disconnected from Socket.IO server");
	});

	return socketInstance;
}