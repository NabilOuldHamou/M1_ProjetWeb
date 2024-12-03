import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.token = await event.cookies.get('token');
	event.locals.userId = await event.cookies.get('UID');

	return await resolve(event);
};