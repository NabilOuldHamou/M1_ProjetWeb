import { writable } from 'svelte/store';

export type Message = {
	id: string;
	text: string;
	createdAt: string | number | Date;
	user: { id: string; username?: string; profilePicture?: string };
	channel?: { id: string; name?: string };
	[lastProp: string]: unknown;
};

export const messagesStore = writable<Message[]>([]);
