import { io } from 'socket.io-client';

const url = 'http://localhost:3000';
console.log('Tentative de connexion à', url);
const socket = io(url, { reconnectionDelayMax: 10000 });

socket.on('connect', () => {
  console.log('Client test connecté, id =', socket.id);
  socket.emit('new-channel', { id: 'test-channel', name: 'Canal de test' });
});

socket.on('connect_error', (err) => {
  console.error('Erreur de connexion:', err.message || err);
});

socket.on('new-channel', (data) => {
  console.log('Reçu new-channel depuis serveur:', data);
});

// Garder le processus vivant 10s
setTimeout(() => {
  console.log('Fin du test, déconnexion');
  socket.disconnect();
  process.exit(0);
}, 10000);

