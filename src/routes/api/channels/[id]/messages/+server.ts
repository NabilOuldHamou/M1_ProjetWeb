import { json } from '@sveltejs/kit';
import prisma from '$lib/prismaClient';
import redisClient from '$lib/redisClient';
import logger from '$lib/logger';

export async function GET({ params, url }) {
	const channelId = params.id;

	// @ts-ignore
	const limit = parseInt(url.searchParams.get('limit'))-1 || 19; // Limit -1 sinon ça retourne un message de trop
	// @ts-ignore
	const page = parseInt(url.searchParams.get('page')) || 1;

	const offset = (page - 1) * limit;

	let redisMessages = await redisClient.zRange(`channel:${channelId}:messages`, offset, limit, { REV: true });
	if (redisMessages != null) {
		logger.debug(`Cache entry found, fetching messages for channel (${channelId}) from cache`);
		const messages = redisMessages.length != 0 ? await redisClient.mGet(redisMessages).then(
			(messages) => messages.map((m) => JSON.parse(m))
		) : [];

		return json({limit: limit+1, page, messages});
	}

	const messages = await prisma.message.findMany({
		where: {
			channelId
		},
		select: {
			id: true,
			createdAt: true,
			text: true,
			user: {
				select: {
					id: true,
					username: true,
					surname: true,
					name: true,
					profilePicture: true
				}
			}
		},
		orderBy: [
			{ createdAt: 'desc' }
		],
	});

	for (const m of messages) {
		await redisClient.set(`message:${m.id}`, JSON.stringify(m));
		// @ts-ignore
		await redisClient.zAdd(`channel:${channelId}:messages`, {score: Date.parse(m.createdAt), value: `message:${m.id}`});
	}

	redisMessages = await redisClient.zRange(`channel:${channelId}:messages`, offset, limit, { REV: true });
	const mgetMessages =await redisClient.mGet(redisMessages).then(
		(messages) => messages.map((m) => JSON.parse(<string>m))
	);

	return json({limit: limit+1, page, messages: mgetMessages});
}

export async function POST({ params, request }) {
	const channelId = params.id;
	const { userId, text } = await request.json();

	try {
		// Créer un nouveau message dans la base de données
		const newMessage = await prisma.message.create({
			data: {
				userId,
				channelId,
				text,
			},
			select: {
				id: true,
				createdAt: true,
				text: true,
				user: {
					select: {
						id: true,
						username: true,
						surname: true,
						name: true,
						profilePicture: true
					}
				}
			},
		});

		await redisClient.set(`message:${newMessage.id}`, JSON.stringify(newMessage));
		await redisClient.zAdd(`channel:${channelId}:messages`, {score: Date.parse(newMessage.createdAt), value: `message:${newMessage.id}`});

		return json(newMessage, { status: 201 });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la création du message' }, { status: 500 });
	}
}

export async function DELETE({ params, request }) {
	const channelId = params.id;

	const { messageId } = await request.json();

	try {
		// Supprimer le message de la base de données
		await prisma.message.delete({
			where: { id: messageId },
		});

		await redisClient.del(`message:${messageId}`);
		await redisClient.zRem(`channel:${channelId}:messages`, `message:${messageId}`);

		return json({ message: 'Message supprimé avec succès' });
	} catch (err) {
		console.error(err);
		return json({ error: 'Erreur lors de la suppression du message' }, { status: 500 });
	}
}