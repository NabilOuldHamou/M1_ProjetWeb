import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.token = await event.cookies.get('token');

	return await resolve(event);
};