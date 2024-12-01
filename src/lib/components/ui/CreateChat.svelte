<script lang="ts">
	import { onMount } from "svelte";
	import Alert from "$lib/components/ui/Alert.svelte"; // Importer le composant Alert

	export let show = false;

	export let onClose: () => void; // Callback pour fermer le composant

	let showAlert = false;
	let alertMessage = "";

	let chatName = "";

	const createChat = () => {
		if (chatName.trim()) {
			alertMessage = `Le chat "${chatName}" a été créé avec succès.`;
			showAlert = true;
			chatName = ""; // Réinitialiser
			onClose?.(); // Fermer le composant après création
		} else {
			alertMessage = "Veuillez entrer un nom pour le chat.";
			showAlert = true;
		}
	};

	const closeAlert = () => {
		showAlert = false;
	};

	// Fonction pour détecter le clic en dehors
	let createChatRef: HTMLElement | null = null;

</script>

{#if show}
	<div class="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50" on:click={onClose}>
		<div
			class="bg-white border border-gray-300 rounded-lg p-8 w-96"
			bind:this={createChatRef}
			on:click|stopPropagation
		>
			<h1 class="text-2xl font-bold mb-6 text-center">Créer un nouveau chat</h1>
			<input
				type="text"
				bind:value={chatName}
				placeholder="Nom du chat..."
				class="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring focus:border-blue-500 mb-4"
			/>
			<button
				on:click={createChat}
				class="bg-blue-500 text-white w-full px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none"
			>
				Créer
			</button>
		</div>
	</div>
{/if}

<Alert show={showAlert} message={alertMessage} onClose={closeAlert} />

<style>
    .fixed {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .bg-white {
        background-color: white;
    }
</style>
