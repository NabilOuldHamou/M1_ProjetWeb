import { writable } from 'svelte/store';

export type User = {
	id: string;
	username?: string;
	name?: string;
	surname?: string;
	email?: string;
	profilePicture?: string | null;
	[state: string]: any;
};

export const userStore = writable<User | null>(null);

export function setUser(u: User | null) {
	userStore.set(u);
}

export function updateUser(partial: Partial<User>) {
	userStore.update((curr) => {
		if (!curr) return curr;
		return { ...curr, ...partial };
	});
}

