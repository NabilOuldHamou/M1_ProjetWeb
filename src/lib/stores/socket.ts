import { io } from "socket.io-client";

// Initialisation de la socket
export const initSocket = () => {
	const socketInstance = io("http://localhost:3000");
	let socketId = null;

	return socketInstance
}