<script lang="ts">
	import Alert from "$lib/components/ui/Alert.svelte"; // Importer le composant Alert

	export let show = false;

	export let onClose: () => void; // Callback pour fermer le composant

	let showAlert = false;
	let alertMessage = "";

	export let socket;

	let chatName = "";

	const createChat = async () => {
		if (chatName.trim()) {
			try {
				// Appel API pour créer le chat
				const response = await fetch('/api/channels', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ name: chatName }),
				});

				if (response.ok) {
					const data = await response.json();
					alertMessage = `Le chat "${data.name}" a été créé avec succès.`;
					chatName = ""; // Réinitialiser
					socket.emit("new-channel", data);
					onClose?.(); // Fermer le composant après création
				} else {
					response.json().then(error => {
						alertMessage = error.error;
					});
				}
			} catch (err) {
				alertMessage = err;
			}

			showAlert = true;
		} else {
			alertMessage = "Veuillez entrer un nom pour le chat.";
			showAlert = true;
		}
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

<Alert show={showAlert} message={alertMessage} onClose={() => (showAlert = false)} />

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
