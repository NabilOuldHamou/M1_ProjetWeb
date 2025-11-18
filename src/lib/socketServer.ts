import type { Server } from 'socket.io';
import logger from '$lib/logger';

let ioInstance: Server | null = null;

// Maintenir une map channels -> users (id, socketId, state) accessible globalement
export type UserInfo = { id: string; socketId?: string; state?: string; [k:string]: unknown };
const channelsUsers: Record<string, UserInfo[]> = {};

export function setIo(io: Server) {
	ioInstance = io;
}

export function getIo(): Server | null {
	return ioInstance;
}

export function addUserToChannel(channelId: string, user: UserInfo) {
     if (!channelsUsers[channelId]) channelsUsers[channelId] = [];
     const exists = channelsUsers[channelId].find(u => u.id === user.id);
     if (!exists) channelsUsers[channelId].push(user);
     else {
         // update socketId/state
         exists.socketId = user.socketId ?? exists.socketId;
         exists.state = user.state ?? exists.state;
     }
     try {
         logger.debug(`channelsUsers: addUserToChannel channel=${channelId} userId=${user.id} socketId=${user.socketId}`);
     } catch (e) {
         // ignore logging failures
     }
 }

export function removeUserFromChannel(channelId: string, userId: string) {
     if (!channelsUsers[channelId]) return;
     channelsUsers[channelId] = channelsUsers[channelId].filter(u => u.id !== userId);
     try {
         logger.debug(`channelsUsers: removeUserFromChannel channel=${channelId} userId=${userId}`);
     } catch {}
 }

export function removeSocketFromAllChannels(socketId: string): string[] {
     const modifiedChannels: string[] = [];
     for (const channelId in channelsUsers) {
         const before = channelsUsers[channelId]?.length ?? 0;
         channelsUsers[channelId] = channelsUsers[channelId].filter(u => u.socketId !== socketId);
         const after = channelsUsers[channelId]?.length ?? 0;
         if (after !== before) modifiedChannels.push(channelId);
     }
     try {
         logger.debug(`channelsUsers: removeSocketFromAllChannels socketId=${socketId} modified=${modifiedChannels.join(',')}`);
     } catch {}
     return modifiedChannels;
 }

export function getUsersInChannel(channelId: string): UserInfo[] {
	return channelsUsers[channelId] ?? [];
}

export function setUserSocketId(userId: string, socketId: string) {
	for (const channelId in channelsUsers) {
		const u = channelsUsers[channelId].find(x => x.id === userId);
		if (u) u.socketId = socketId;
	}
}

export function debugDumpChannels() {
     try {
         logger.debug(`channelsUsers: dump ${JSON.stringify(channelsUsers)}`);
     } catch {}
     return JSON.parse(JSON.stringify(channelsUsers));
}
