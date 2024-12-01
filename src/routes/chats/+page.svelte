<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import Plus from "svelte-radix/Plus.svelte"; // Icône pour "Ajouter"
	import Search from "$lib/components/ui/Search.svelte";
	import ChatItem from "$lib/components/ui/ChatItem.svelte";
	import ProfileCard from "$lib/components/ui/ProfileCard.svelte"; // Importer le composant ProfileCard
	import CreateChat from "$lib/components/ui/CreateChat.svelte"; // Importer le composant CreateChat
	import { formatDistanceToNow } from "$lib/utils/date.js";
	import { io } from 'socket.io-client';

	let showProfileCard = false;  // État pour afficher ou masquer le ProfileCard
	let showCreateChat = false;  // État pour afficher ou masquer CreateChat
	let user = {
		pseudo: 'JohnDoe',
		prenom: 'John',
		nom: 'Doe',
		description: 'Développeur passionné',
		profilePictureUrl: 'path/to/profile-picture.jpg',  // URL de l'image de profil
	};

	function openProfileCard() {
		console.log('openProfileCard');
		showProfileCard = true;  // Inverser l'état pour afficher/masquer le ProfilCard
	}

	function closeProfileCard() {
		console.log('closeProfileCard');
		showProfileCard = false;  // Inverser l'état pour afficher/masquer le ProfilCard
	}

	function openCreateChat() {
		console.log('openCreateChat');
		showCreateChat = true;  // Afficher le composant CreateChat
	}

	function closeCreateChat() {
		console.log('closeCreateChat');
		showCreateChat = false;  // Fermer le composant CreateChat
	}

	export let data;
	export let channels = data.channels;// Assurez-vous que 'lastMessage' est facultatif si nécessaire
	console.log(channels);

</script>

<div class="h-full flex flex-col gap-5 p-5">
	<div class="flex justify-between items-center">
		<!-- Bouton Profile avec l'image de l'utilisateur -->
		<Button
			size="default"
			class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
			on:click={openProfileCard}
		>
			<img src={user.profilePictureUrl} alt="Profile" class="h-8 w-8 rounded-full" />
			Profile
		</Button>

		<div class="flex items-center gap-2 w-full mr-6 ml-6">
			<div class="relative w-full">
				<Search class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
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

	<div class="flex flex-col gap-4 overflow-y-auto">
		{#each channels as channel}
			<ChatItem id={channel.id} title={channel.name} lastMessage={channel.lastMessage} time={formatDistanceToNow(channel.createdAt)} />
		{/each}
	</div>

</div>
<CreateChat show={showCreateChat} onClose={closeCreateChat} />
<ProfileCard {user} show={showProfileCard} onClose={closeProfileCard} />

<style>
    .h-full {
        height: 100%;
        background-color: #f9f9f9;
    }
</style>
