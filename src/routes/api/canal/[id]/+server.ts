import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';

// Récupérer les informations du canal et le dernier message (avec cache Redis)
export async function GET({ params }) {
	const canalId = parseInt(params.id);

	// Clé cache pour les informations du canal et le dernier message
	const canalCacheKey = `canal:${canalId}:info`;

	try {
		// Vérifier si les informations du canal et le dernier message sont dans le cache Redis
		const cachedCanalData = await redisClient.get(canalCacheKey);
		if (cachedCanalData) {
			console.log('✅ Cache hit pour les informations du canal et le dernier message');
			return json(JSON.parse(cachedCanalData));
		}

		console.log('❌ Cache miss');
		// Si non, récupérer les informations du canal et le dernier message depuis Prisma
		const canal = await prisma.canal.findUnique({
			where: { id: canalId },
			include: {
				users: true, // Inclut les utilisateurs associés au canal
			},
		});

		if (!canal) {
			return json({ error: 'Canal non trouvé' }, { status: 404 });
		}

		// Récupérer le dernier message
		const lastMessage = await prisma.message.findFirst({
			where: { canalId },
			include: {
				user: { select: { id: true, pseudo: true } },
			},
			orderBy: { createdAt: 'desc' }, // Trie par date décroissante, donc le dernier message est récupéré en premier
		});

		// Créer un objet combiné pour le canal et le dernier message
		const canalData = {
			canal,
			lastMessage, // Inclure uniquement le dernier message
		};

		// Mettre en cache les informations du canal et le dernier message pendant 5 minutes
		await redisClient.set(canalCacheKey, JSON.stringify(canalData), {EX: 300, NX: true}); // Cache pendant 5 minutes


		console.log('❌ Cache miss - Mise en cache des résultats');
		return json(canalData);
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la récupération du canal ou du dernier message' }, { status: 500 });
	}
}

// Supprimer un canal et invalider le cache associé
export async function DELETE({ params }) {
	const canalId = parseInt(params.id);

	try {
		// Supprimer le canal de la base de données
		await prisma.canal.delete({
			where: { id: canalId },
		});

		// Invalider le cache
		await redisClient.del(`canal:${canalId}:info`);

		return json({ message: 'Canal supprimé avec succès' });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la suppression du canal' }, { status: 500 });
	}
}

// Modifier un canal
export async function PUT({ params, request }) {
	const canalId = parseInt(params.id);
	const { nom, domaine } = await request.json(); // On suppose que ce sont les champs à mettre à jour

	// Clé cache pour les informations du canal et le dernier message
	const canalCacheKey = `canal:${canalId}:info`;

	try {
		// Mettre à jour les informations du canal dans la base de données
		const updatedCanal = await prisma.canal.update({
			where: { id: canalId },
			data: {
				nom, // Nom du canal
				domaine, // Domaine du canal
			},
			include: {
				users: true, // Inclut les utilisateurs associés au canal
			},
		});

		// Récupérer le dernier message associé au canal après mise à jour
		const lastMessage = await prisma.message.findFirst({
			where: { canalId },
			include: {
				user: { select: { id: true, pseudo: true } },
			},
			orderBy: { createdAt: 'desc' },
		});

		// Créer un objet combiné pour les nouvelles informations du canal et le dernier message
		const canalData = {
			canal: updatedCanal,
			lastMessage, // Inclure uniquement le dernier message
		};

		// Mettre en cache les nouvelles informations pendant 5 minutes
		await redisClient.set(canalCacheKey, JSON.stringify(canalData), { EX: 300, NX: true });

		return json(canalData);
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la mise à jour du canal' }, { status: 500 });
	}
}
