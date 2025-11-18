<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import Plus from "svelte-radix/Plus.svelte"; // Icône pour "Ajouter"
	import Search from "$lib/components/ui/Search.svelte";
	import ChatItem from "$lib/components/ui/ChatItem.svelte";
	import ProfileCard from "$lib/components/ui/ProfileCard.svelte"; // Importer le composant ProfileCard
	import CreateChat from "$lib/components/ui/CreateChat.svelte"; // Importer le composant CreateChat
	import { initSocket } from "$lib/stores/socket";
	import { onMount, onDestroy } from 'svelte';
	import { imageUrl } from '$lib/utils/imageUrl';
	import { userStore } from '$lib/stores/userStore';

	import type { Socket } from 'socket.io-client';

	// Types locaux minimaux
	type User = { id: string; username?: string; profilePicture?: string; [k:string]: any };
	type Channel = { id: string; name: string; lastMessage?: { text?: string; createdAt?: string }; lastUpdate?: string };
	type Message = { id: string; text?: string; createdAt?: string; channel?: Channel };
	type Data = { user?: User; userId?: string; channels?: Channel[] };

	let chatListRef: HTMLElement | null = null;

	let showProfileCard = false;  // État pour afficher ou masquer le ProfileCard
	let showCreateChat = false;  // État pour afficher ou masquer CreateChat

	let socket: Socket | null = null; // initialisé côté client

	onMount(() => {
		socket = initSocket();
		if (!socket) return;

		socket.on("new-channel", (channel: Channel) => {
			console.log('new-channel reçu (client):', channel, ' socketId=', socket?.id);
			if (!channels.find((c: Channel) => c.id === channel.id)) {
				channels = [channel, ...channels];
			} else {
				channels = channels.map((c: Channel) => c.id === channel.id ? { ...c, ...channel } : c);
			}
		});

		socket.on("new-message", (message: Message) => {
			const channel = message.channel as Channel | undefined;
			if (!channel) return;
			if (channels.find((c: Channel) => c.id === channel.id)) {
				channels = channels.map((c: Channel) => {
					if (c.id === channel.id) {
						return { ...c, lastMessage: message, lastUpdate: message.createdAt };
					}
					return c;
				});
				channels = [channel, ...channels.filter((c: Channel) => c.id !== channel.id)];
			} else {
				channels = [channel, ...channels];
			}
		});
	});

	function openProfileCard() {
		showProfileCard = true;  // Inverser l'état pour afficher/masquer le ProfilCard
	}

	function closeProfileCard() {
		showProfileCard = false;  // Inverser l'état pour afficher/masquer le ProfilCard
	}

	function openCreateChat() {
		showCreateChat = true;  // Afficher le composant CreateChat
	}

	function closeCreateChat() {
		showCreateChat = false;  // Fermer le composant CreateChat
	}

	function handleCreateChannel(channel: Channel) {
		// Mise à jour optimiste du tableau channels
		channels = [channel, ...channels];
	}

	async function loadNewChannels(name : string) {
		console.log('loadNewChannels');
		const res = await fetch(`/api/channels?name=${name}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			}
		});
		channels = await res.json();
		console.log(channels);
	}

	export let data: Data;
	export let channels: Channel[] = data?.channels ?? [];// Assurez-vous que 'lastMessage' est facultatif si nécessaire

	// image src pour le profil (éviter 404 et host externes en dev)
	let profileImgSrc: string = '/profile-default.svg';

	async function checkImageExists(url: string): Promise<boolean> {
		try {
			const resp = await fetch(url, { method: 'HEAD' });
			return resp.ok;
		} catch {
			return false;
		}
	}

	async function resolveProfileImage(path?: string | null) {
		const candidateBase = imageUrl(path);
		// Ajouter un cache-buster pour forcer le rechargement si l'image vient d'être modifiée
		const candidate = candidateBase ? candidateBase + (candidateBase.includes('?') ? '&' : '?') + 'v=' + Date.now() : candidateBase;
		try {
			const exists = await checkImageExists(candidate);
			profileImgSrc = exists ? candidate : imageUrl(null);
		} catch {
			profileImgSrc = imageUrl(null);
		}
	}

	// Réagis aux changements du user store pour mettre à jour l'image
	let unsubscribeUser: (() => void) | null = null;
	onMount(() => {
	    unsubscribeUser = userStore.subscribe((u) => {
	        if (u) resolveProfileImage(u.profilePicture);
	    });
	    // initial
	    if (data?.user) resolveProfileImage(data.user.profilePicture);
	});

	onDestroy(() => {
	    if (unsubscribeUser) unsubscribeUser();
	});

	function handleImageError(ev: Event) {
		const img = ev.target as HTMLImageElement | null;
		if (img) img.src = imageUrl(null);
	}
</script>

<div class="h-full flex flex-col gap-5 p-5">
 	<div class="flex justify-between items-center">
 		<!-- Bouton Profile avec l'image de l'utilisateur -->
 		<Button
 			size="default"
 			class="flex-none flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
 			on:click={openProfileCard}
 		>
			<img src={profileImgSrc} alt="Profile" class="h-8 w-8 rounded-full" on:error={handleImageError} />
 			Profile
 		</Button>

 		<div class="flex items-center gap-2 flex-1 mx-6 min-w-0">
 			<div class="relative w-full">
 				<Search onChange={loadNewChannels} />
 			</div>
 		</div>

 		<!-- Bouton Nouveau Chat -->
 		<Button
 			size="default"
 			class="flex-none flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
 			on:click={openCreateChat}
 		>
 			<Plus class="h-5 w-5" />
 			Nouveau Chat
 		</Button>
 	</div>

 	<div class="flex flex-col gap-4 overflow-y-auto" bind:this={chatListRef}>
 		{#each channels as channel}
 			<ChatItem
 				id={channel.id}
 				title={channel.name}
 				lastMessage={channel.lastMessage ? channel.lastMessage.text : "Ecrire le premier message"}
 				createdAt={channel.lastUpdate}
 			/>
 		{/each}
 	</div>

 </div>
<CreateChat show={showCreateChat} socket={socket} onClose={closeCreateChat} listRef={chatListRef} onCreate={handleCreateChannel} />
<ProfileCard user={data.user} userSessionId={data.userId} show={showProfileCard} onClose={closeProfileCard} />

<style>
    .h-full {
        height: 100%;
        background-color: #f9f9f9;
    }
</style>
