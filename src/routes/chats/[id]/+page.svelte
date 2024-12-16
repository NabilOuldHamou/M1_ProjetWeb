<script lang="ts">
    import Textarea  from "$lib/components/ui/textarea/textarea.svelte";
    import { Button } from "$lib/components/ui/button";
    import PaperPlane from "svelte-radix/PaperPlane.svelte";
    import Message from "$lib/components/Message.svelte";
    import UserChat from '$lib/components/ui/UserChat.svelte';
    import { tick, onDestroy, onMount } from 'svelte';
    import { initSocket } from '$lib/stores/socket';
    import { ArrowLeft } from 'lucide-svelte';
    import { messagesStore } from '$lib/stores/messagesStore';

    export let data;

    messagesStore.set(data.messages.messages);

    let user = data.user;

    const socket = initSocket(); // Initialiser le socket
    let users= [];

    let scrollContainer: HTMLElement;
    let messageText = '';

    let activeProfileId = null;

    function setActiveProfile(id) {
        activeProfileId = id;
    }

    async function sendMessage() {
        // Appel API pour envoyer le message
        const response = await fetch(`/api/channels/${data.channelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: data.userId, text: messageText }),
        });

        if (response.ok) {
            let newMessage =await response.json();
            // Envoyer le message avec les sockets (à implémenter)
            socket.emit('new-message', newMessage);
            console.log('Message envoyé avec succès');
            messageText = '';
        }else{
            console.log('Erreur lors de l\'envoi du message');
        }
    }

    let isLoading = false;
    const limit = 10;

    async function loadMoreMessages() {
        if (isLoading) {
            return;
        }
        isLoading = true;

        try {
            // Calculer la page à charger en fonction du nombre total de messages existants
            const totalMessages = $messagesStore.length;
            const pageToLoad = Math.floor(totalMessages / limit) + 1;

            const response = await fetch(`/api/channels/${data.channelId}/messages?page=${pageToLoad}&limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const newMessages = await response.json();

                if (newMessages.messages.length <= 0) {
                    console.log("Pas d'autres anciens messages");
                    return;
                }

                // Éviter les doublons en filtrant les messages déjà présents
                const existingMessageIds = new Set($messagesStore.map((msg) => msg.id));
                const filteredMessages = newMessages.messages.filter(
                  (msg) => !existingMessageIds.has(msg.id)
                );

                if (filteredMessages.length > 0) {
                    $messagesStore = [...filteredMessages, ...$messagesStore]; // Ajouter les nouveaux messages en haut
                    console.log(`${filteredMessages.length} nouveaux messages ajoutés`);
                } else {
                    console.log("Aucun nouveau message à ajouter (tous déjà chargés)");
                }
            } else {
                console.error("Erreur lors du chargement des anciens messages");
            }
        } catch (error) {
            console.error("Erreur réseau lors du chargement des messages:", error);
        } finally {
            isLoading = false;
        }
    }

    async function handleEnter(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            await sendMessage();
        }
    }

    let stopWritingTimeout;

    function handleWriting() {
        clearTimeout(stopWritingTimeout);
        socket.emit('writing', { userId: data.userId, channelId: data.channelId });
        stopWritingTimeout = setTimeout(() => {
            handleStopWriting();
        }, 2000); // Attendre 2 secondes d'inactivité avant d'émettre stop-writing
    }

    function handleStopWriting() {
        socket.emit('stop-writing', { userId: data.userId, channelId: data.channelId });
    }

    async function scrollToBottom(retries = 3) {
        await tick();

        const attemptScroll = () => {
            if (scrollContainer) {
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: 'smooth',
                });
            }
        };

        attemptScroll();

        if (retries > 0) {
            requestAnimationFrame(() => scrollToBottom(retries - 1));
        }
    }

    onDestroy(() => {
        socket.emit('leave-channel', { userId: data.userId, channelId: data.channelId });
        socket.disconnect(); // Déconnexion propre du socket
    });

    // Ecoute des événements socket
    socket.on("new-message", async (message) => {
        $messagesStore = [...$messagesStore, message]; // Add the new message to the store
        await tick();
        await scrollToBottom(); // Scroll to the bottom after the message is added
    });


    socket.on("load-users-channel", async (us) => {
        users = us;
        await tick();
    });

    socket.on("connect", () => {
        socket.emit('new-user-join', { user:{ ...user, socketId:socket.id, state:"En ligne" }, channelId: data.channelId });
    });

    socket.on('user-writing', async (userId) => {
        console.log('user-writing reçu pour userId:', userId);

        // On met à jour l'état de l'utilisateur
        users = users.map((u) => {
            if (u.id === userId) {
                // Mettre à jour le state
                return { ...u, state: "Ecrit" }; // On recrée l'objet pour garantir la réactivité
            }
            return u;
        });

        // On recrée une nouvelle référence du tableau `users`
        users = [...users]; // Cela force Svelte à détecter le changement dans la liste

        console.log('Utilisateurs après mise à jour de l\'état:', users);

        // Forcer une mise à jour avec tick
        await tick();
    });

    socket.on('user-stop-writing', async (userId) => {
        console.log('user-stop-writing reçu pour userId:', userId);

        users = users.map((u) => {
            if (u.id === userId) {
                // Mettre à jour le state
                return { ...u, state: "En ligne" }; // On recrée l'objet pour garantir la réactivité
            }
            return u;
        });

        users = [...users]; // Cela force Svelte à détecter le changement dans la liste

        console.log('Utilisateurs après mise à jour de l\'état:', users);

        await tick();
    });

    messagesStore.subscribe(async () => {
        await tick();
        await scrollToBottom();
    });

    onMount(async () => {
        await tick();
        await scrollToBottom();
    });

</script>

<div class="h-full flex">
    <!-- Liste des utilisateurs (colonne gauche) -->
    <div class="w-1/4 bg-gray-100 border-r overflow-y-auto">
        <div class="flex gap-4 px-4 mt-5">
            <Button href="/chats" variant="outline" size="icon" ><ArrowLeft /></Button>
            <h2 class="text-3xl font-bold">Utilisateurs</h2>
        </div>
        <div class="flex flex-col m-5 gap-2">
            {#each users as u (u.id)}
                <UserChat
                  user={u}
                />
            {/each}
        </div>
    </div>

    <!-- Chat principal (colonne droite) -->
    <div class="flex-1 flex flex-col h-full">
        <!-- Messages -->
        <div
          class="m-10 flex flex-col gap-5 overflow-auto flex-grow"
          bind:this={scrollContainer}
        >
            {#if isLoading}
                <div class="loading-indicator">Chargement...</div>
            {/if}
            {#if $messagesStore !== undefined && $messagesStore.length > 0}
                {#each $messagesStore as message}
                    <Message
                      userId={data.userId}
                      message={message}
                      activeProfileId={activeProfileId}
                      setActiveProfile={setActiveProfile}
                    />
                {/each}
            {:else}
                <div class="text-center text-gray-500 mt-10">Sélectionnez un message le chat est vide.</div>
            {/if}
        </div>

        <!-- Input pour envoyer un message -->
        <div class="px-10 py-5 w-full flex gap-2 border-t">
            <Textarea
              class="h-16 resize-none flex-grow"
              placeholder="Écrivez un message..."
              bind:value={messageText}
              on:keypress={handleEnter}
              on:input={handleWriting}
              on:blur={handleStopWriting}
            />
            <Button size="icon" class="h-16 w-16 bg-blue-500 hover:bg-blue-600 h-full" on:click={sendMessage}>
                <PaperPlane class="h-6 w-6" />
            </Button>
        </div>
    </div>
</div>

<style>
    .h-full {
        height: 100%;
    }
    .loading-indicator {
        text-align: center;
        padding: 10px;
        color: gray;
    }
    .overflow-y-auto {
        scroll-behavior: smooth; /* Défilement fluide */
    }
</style>
