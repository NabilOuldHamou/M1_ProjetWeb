import { io } from "socket.io-client";

// Initialisation de la socket
export const initSocket = () => {
	const socketInstance = io("http://localhost:5173");
	let socketId = null;

	return socketInstance
}