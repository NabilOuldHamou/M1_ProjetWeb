import { json } from '@sveltejs/kit';

import { getIo } from '$lib/socketServer';
import logger from '$lib/logger';

export async function GET() {
	try {
		const io = getIo();
		if (!io) {
			logger.debug('GET /api/socket-status: io instance not initialized');
			return json({ ok: false, message: 'io not initialized' }, { status: 200 });
		}

		// Build a summary of rooms and socket counts
		const rooms: Record<string, number> = {};
		for (const [roomName, s] of io.sockets.adapter.rooms) {
			// Note: adapter.rooms contains both rooms and socket ids. We can try to skip single-socket rooms that are actually socket ids.
			rooms[String(roomName)] = (s as any).size ?? 0;
		}

		const socketsCount = io.sockets.sockets.size;

		return json({ ok: true, socketsCount, rooms });
	} catch (err) {
		logger.error('Error in /api/socket-status: ' + (err as Error).message);
		return json({ ok: false, error: (err as Error).message }, { status: 500 });
	}
}

