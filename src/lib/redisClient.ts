import { createClient } from 'redis';

const client = await createClient({
	url: process.env.REDIS_URL || 'redis://localhost:6379'
});


client.on('error', (err) => console.error('Redis Error:', err));

try {
	await client.connect();
} catch (error) {
	console.error('Redis Error:', error);
}

export default client;
