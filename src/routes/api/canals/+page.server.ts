import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';

// GET: Liste tous les canaux
export async function GET() {
	try {
		const cachedCanaux = await redisClient.get('canaux');
		if (cachedCanaux) {
			console.log('✅ Cache hit');
			return json(JSON.parse(cachedCanaux));
		}

		console.log('❌ Cache miss');
		const canaux = await prisma.canal.findMany({
			include: { users: true, messages: true }, // Inclut les relations
		});

		await redisClient.set('canaux', JSON.stringify(canaux), { EX: 600 }); // Met en cache
		return json(canaux);
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
}

export async function POST({ request }) {
	const { nom, domaine, userIds } = await request.json();

	try {
		const canal = await prisma.canal.create({
			data: {
				nom,
				domaine,
				users: {
					connect: userIds.map((id) => ({ id })), // Associe des utilisateurs au canal
				},
			},
		});

		return json(canal, { status: 201 });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la création du canal' }, { status: 500 });
	}
}

