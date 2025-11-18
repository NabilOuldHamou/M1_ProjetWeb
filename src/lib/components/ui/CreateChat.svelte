<script lang="ts">
	import Alert from "$lib/components/ui/Alert.svelte"; // Importer le composant Alert
	import type { Socket } from 'socket.io-client';
	import { initSocket } from '$lib/stores/socket';

	export let show = false;

	export let listRef: HTMLElement | null = null;

	export let onClose: () => void; // Callback pour fermer le composant

	let showAlert = false;
	let alertMessage = "";

	export let socket: Socket | null | undefined;
	export let onCreate: ((channel: any) => void) | undefined;

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
					// Appel du callback parent pour mise à jour optimiste
					if (onCreate) onCreate(data);
					console.log('CreateChat: emission new-channel, socketProp=', socket, 'data=', data);
					// S'assurer d'avoir une socket connectée : utiliser la prop si fournie, sinon initSocket()
					let socketToUse: Socket | null | undefined = socket;
					if (!socketToUse) {
						socketToUse = initSocket();
					}
					// attendre la connexion si nécessaire (max 2s)
					if (socketToUse && !socketToUse.connected) {
						const start = Date.now();
						while (!socketToUse.connected && Date.now() - start < 2000) {
							await new Promise((r) => setTimeout(r, 50));
						}
					}
					if (socketToUse && socketToUse.connected) {
						socketToUse.emit("new-channel", data, (ack?: { ok: boolean }) => {
							console.log('CreateChat: ACK new-channel from server:', ack);
							if (!ack?.ok) {
								alertMessage = 'Le serveur n\'a pas confirmé la création du channel via sockets.';
								showAlert = true;
							}
						});
					} else {
						console.warn('CreateChat: pas de socket connectée, new-channel non émis');
					}
					if (listRef) {
						listRef.scrollTo({ top: 0, behavior: 'smooth' });
					}
					onClose?.(); // Fermer le composant après création
				} else {
					response.json().then(error => {
						alertMessage = error.error;
					});
				}
			} catch (err: unknown) {
				if (err instanceof Error) {
					alertMessage = err.message;
				} else {
					alertMessage = String(err);
				}
			}

			showAlert = true;
		} else {
			alertMessage = "Veuillez entrer un nom pour le chat.";
			showAlert = true;
		}
	};

	// Fonction pour détecter le clic en dehors
	let createChatRef: HTMLElement | null = null;

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
			onClose?.();
		}
	}

</script>

{#if show}
	<div class="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50" role="button" aria-label="Fermer la fenêtre" tabindex="0" on:click={onClose} on:keydown={handleBackdropKeydown}>
		<div
			class="bg-white border border-gray-300 rounded-lg p-8 w-96"
			bind:this={createChatRef}
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="0"
			on:keydown|stopPropagation={e => { if (e.key === 'Escape') onClose?.(); }}
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
