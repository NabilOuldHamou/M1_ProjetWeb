import redis from 'redis';

const client = redis.createClient({
	url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => console.error('Redis Error:', err));

await client.connect();

export default client;
