<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import Plus from "svelte-radix/Plus.svelte"; // Icône pour "Ajouter"
	import Search from "$lib/components/ui/Search.svelte";
	import ChatItem from "$lib/components/ui/ChatItem.svelte";
	import ProfileCard from "$lib/components/ui/ProfileCard.svelte"; // Importer le composant ProfileCard
	import CreateChat from "$lib/components/ui/CreateChat.svelte"; // Importer le composant CreateChat
	import { initSocket } from "$lib/stores/socket";

	let chatListRef: HTMLElement | null = null;

	let showProfileCard = false;  // État pour afficher ou masquer le ProfileCard
	let showCreateChat = false;  // État pour afficher ou masquer CreateChat

	let socket = initSocket(); // Initialiser le socket

	socket.on("new-channel", (channel) => {
		channels = [channel, ...channels];
	});

	socket.on("new-message", (message) => {
		const channel = message.channel
		if(channels.find(c => c.id === channel.id)) {
			channels = channels.map((c) => {
				if (c.id === channel.id) {
					c.lastMessage = message;
					c.lastUpdate = message.createdAt;
				}
				return c;
			});
			channels = [channel, ...channels.filter((c) => c.id !== channel.id)];
		}else{
			channels = [channel, ...channels];
		}
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

	export let data;
	export let channels = data.channels;// Assurez-vous que 'lastMessage' est facultatif si nécessaire
</script>

<div class="h-full flex flex-col gap-5 p-5">
	<div class="flex justify-between items-center">
		<!-- Bouton Profile avec l'image de l'utilisateur -->
		<Button
			size="default"
			class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
			on:click={openProfileCard}
		>
			<img src={data.user.profilePicture} alt="Profile" class="h-8 w-8 rounded-full" />
			Profile
		</Button>

		<div class="flex items-center gap-2 w-full mr-6 ml-6">
			<div class="relative w-full">
				<Search class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" onChange={loadNewChannels}/>
			</div>
		</div>

		<!-- Bouton Nouveau Chat -->
		<Button
			size="default"
			class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
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
<CreateChat show={showCreateChat} socket={socket} onClose={closeCreateChat} listRef={chatListRef} />
<ProfileCard user={data.user} userSessionId={data.userId} show={showProfileCard} onClose={closeProfileCard} />

<style>
    .h-full {
        height: 100%;
        background-color: #f9f9f9;
    }
</style>
