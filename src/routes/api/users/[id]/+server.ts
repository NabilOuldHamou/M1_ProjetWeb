import { json } from '@sveltejs/kit';
import redisClient from '$lib/redisClient';
import prisma from '$lib/prismaClient';
import logger from '$lib/logger';
import { writeFile, unlink } from 'node:fs/promises';
import { extname } from 'path';
import * as argon2 from 'argon2';
import { requireAuth } from '$lib/auth';

export async function GET(event) {
	// Vérifier l'authentification
	const authCheck = requireAuth(event);
	if (authCheck instanceof Response) {
		return authCheck;
	}

	const { params } = event;
	const userId = params.id;

	try {
		// Vérifier si l'utilisateur est dans le cache Redis
		const cachedUser = await redisClient.get(`user:${userId}`);
		if (cachedUser) {
			logger.debug(`Cache entry found, fetching user (${params.id}) from cache`);
			return json(JSON.parse(cachedUser));
		}

		logger.debug(`No cache entry was found, fetching user (${params.id}) from database`);
		// Si non, récupérer depuis MongoDB via Prisma
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			logger.debug(`No record of user (${params.id}) found in database`);
			return json({ error: 'Utilisateur non trouvé' }, { status: 404 });
		}

		// Mettre l'utilisateur en cache
		const cachedUsers = await redisClient.get('users');
		const usersArray = cachedUsers != null ? JSON.parse(cachedUsers) : [];
		usersArray.push(user);
		logger.debug(`Added user (${user.id}) to users cache.`);
		await redisClient.set('users', JSON.stringify(usersArray), { EX: 600 })
		logger.debug(`Creating a new cache entry with key user:${user.id}, with EX of 3600 secs`);
		await redisClient.set(`user:${userId}`, JSON.stringify(user), { EX: 3600 });

		return json(user);
	} catch (err) {
		logger.error(err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
}

// Mettre à jour un utilisateur avec PUT
export async function PUT(event) {
	// Vérifier l'authentification
	const authCheck = requireAuth(event);
	if (authCheck instanceof Response) {
		return authCheck;
	}

	const { params, request } = event;
	const userId = params.id;
	const formData = await request.formData();

	const data: {username?: string, email?: string, surname?: string, name?: string, password?: string, profilePicture?: string} = {};

    const usernameRaw = formData.get('username');
    const surnameRaw = formData.get('surname');
    const nameRaw = formData.get('name');
    const emailRaw = formData.get('email');
    const passwordRaw = formData.get('password');
    const profilePictureRaw = formData.get('profilePicture');
    const removeProfilePicture = formData.get('removeProfilePicture') !== null;

    const username = usernameRaw ? String(usernameRaw) : '';
    const surname = surnameRaw ? String(surnameRaw) : '';
    const name = nameRaw ? String(nameRaw) : '';
    const email = emailRaw ? String(emailRaw) : '';
    const password = passwordRaw ? passwordRaw : null;
    const profilePicture: File | null = (profilePictureRaw instanceof File) ? profilePictureRaw as File : null;


	let filename: string | null = null;
	// Récupérer l'utilisateur existant pour connaître l'ancienne image
	const existingUser = await prisma.user.findUnique({ where: { id: userId } });
	const oldProfilePicture = existingUser?.profilePicture ?? null;

    if (profilePicture != null) {
        filename = `${crypto.randomUUID()}${extname(profilePicture?.name)}`;
        await writeFile(`static/${filename}`, Buffer.from(await profilePicture?.arrayBuffer()));
        data.profilePicture = filename;
    }

	// If the client requested to remove the profile picture (and didn't upload a new one), set to default filename
	// Prisma schema declares profilePicture as non-nullable with default "default.png".
    if (!filename && removeProfilePicture) {
        data.profilePicture = 'default.png';
    }

	if (password != null) {
		data.password = await argon2.hash(password.toString());
	}

	data.username = username;
	data.surname = surname;
	data.name = name;
	data.email = email;


	try {
        // Vérifier unicité du username s'il est fourni
        if (data.username) {
            const userWithSameUsername = await prisma.user.findUnique({ where: { username: data.username } });
            if (userWithSameUsername && userWithSameUsername.id !== userId) {
                logger.debug(`Tentative de mise à jour avec username déjà pris (${data.username})`);
                return json({ error: 'Le pseudo est déjà utilisé' }, { status: 400 });
            }
        }

        // Vérifier unicité de l'email s'il est fourni
        if (data.email) {
            const userWithSameEmail = await prisma.user.findUnique({ where: { email: data.email } });
            if (userWithSameEmail && userWithSameEmail.id !== userId) {
                logger.debug(`Tentative de mise à jour avec email déjà pris (${data.email})`);
                return json({ error: 'L\'email est déjà utilisé' }, { status: 400 });
            }
        }
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: data
		});
		logger.debug(`Updated user (${updatedUser.id}) in database`);

		// Supprimer l'ancienne image si elle existait et :
		// - on a uploadé une nouvelle image (filename) et l'ancienne est différente,
		// - ou bien le client a demandé explicitement la suppression (removeProfilePicture)
		// Eviter de supprimer des fichiers par défaut (default.png, profile-default.svg)
		const defaults = new Set(['default.png', 'profile-default.svg']);
		if (oldProfilePicture && !defaults.has(oldProfilePicture)) {
			// Cas 1: nouvelle image uploaded -> supprimer l'ancienne qui est différente
			if (filename && oldProfilePicture !== filename) {
				try {
					await unlink(`static/${oldProfilePicture}`);
					logger.debug(`Ancienne image supprimée: static/${oldProfilePicture}`);
				} catch (e) {
					logger.warn(`Impossible de supprimer l'ancienne image static/${oldProfilePicture}: ${e instanceof Error ? e.message : String(e)}`);
				}
			}
			// Cas 2: le client a demandé la suppression sans upload -> supprimer l'ancien fichier physique
			if (!filename && removeProfilePicture) {
				try {
					await unlink(`static/${oldProfilePicture}`);
					logger.debug(`Image supprimée sur demande: static/${oldProfilePicture}`);
				} catch (e) {
					logger.warn(`Impossible de supprimer l'image static/${oldProfilePicture} lors de la suppression demandée: ${e instanceof Error ? e.message : String(e)}`);
				}
				// ensure DB will point to default filename if not already handled
				if (!data.profilePicture) {
					data.profilePicture = 'default.png';
				}
			}
		}

		// Mettre à jour l'utilisateur dans le cache Redis
		const cachedUsers = await redisClient.get('users');
		let usersArray = cachedUsers != null ? JSON.parse(cachedUsers) : [];
		usersArray = usersArray.filter((u: { id: string }) => u.id !== updatedUser.id);
		usersArray.push(updatedUser);
		logger.debug(`Updated user (${updatedUser.id}) in users cache.`);
		await redisClient.set('users', JSON.stringify(usersArray), { EX: 600 })
		logger.debug(`Updated cache entry with key user:${updatedUser.id}`);
		await redisClient.set(`user:${userId}`, JSON.stringify(updatedUser), { EX: 3600 }); // Cache pendant 1 heure (3600 secondes)

        // Émettre un événement Socket.IO pour notifier les clients que l'utilisateur a été mis à jour
        try {
            const { getIo } = await import('$lib/socketServer');
            const io = getIo();
            if (io) {
                io.emit('user-updated', updatedUser);
                logger.debug(`user-updated émis pour userId=${updatedUser.id}`);
            } else {
                logger.debug('Instance io non disponible pour émettre user-updated');
            }
        } catch (e) {
            logger.warn('Impossible d\'émettre user-updated: ' + (e as Error).message);
        }

		return json(updatedUser);
	} catch (err) {
		logger.error(err);
		return json({ error: 'Erreur lors de la mise à jour de l’utilisateur' }, { status: 500 });
	}
}


export async function DELETE(event) {
	// Vérifier l'authentification
	const authCheck = requireAuth(event);
	if (authCheck instanceof Response) {
		return authCheck;
	}

	const { params } = event;
	const userId = params.id;

	try {
		const deletedUser = await prisma.user.delete({
			where: { id: userId },
		});
		logger.debug(`Deleted user (${deletedUser.id}) from database.`);

		// Supprimer l'utilisateur du cache Redis
		const cachedUsers = await redisClient.get('users');
		let usersArray = cachedUsers != null ? JSON.parse(cachedUsers) : [];
		usersArray = usersArray.filter((u: { id: string }) => u.id !== deletedUser.id);
		logger.debug(`Deleted cache entry with key user:${deletedUser.id}`);
		await redisClient.del(`user:${userId}`);
		logger.debug(`Deleted user (${deletedUser.id}) from users cache.`);
		await redisClient.set('users', JSON.stringify(usersArray), { EX: 600 })

        // Émettre un événement Socket.IO pour notifier les clients que l'utilisateur a été supprimé
        try {
            const { getIo } = await import('$lib/socketServer');
            const io = getIo();
            if (io) {
                io.emit('user-deleted', { id: deletedUser.id });
                logger.debug(`user-deleted émis pour userId=${deletedUser.id}`);
            } else {
                logger.debug('Instance io non disponible pour émettre user-deleted');
            }
        } catch (e) {
            logger.warn('Impossible d\'émettre user-deleted: ' + (e as Error).message);
        }

		return json({ message: 'Utilisateur supprimé avec succès' });
	} catch (err) {
		logger.error(err);
		return json({ error: 'Erreur lors de la suppression de l’utilisateur' }, { status: 500 });
	}
}
