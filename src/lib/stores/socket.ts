import { io } from "socket.io-client";

// Initialisation de la socket
export const initSocket = () => {
	const socketInstance = io("https://arbres.oxyjen.io");
	let socketId = null;

	return socketInstance
}