<script lang="ts">
    import Textarea  from "$lib/components/ui/textarea/textarea.svelte";
    import { Button } from "$lib/components/ui/button";
    import PaperPlane from "svelte-radix/PaperPlane.svelte";
    import Message from "$lib/components/Message.svelte";
    import UserChat from '$lib/components/ui/UserChat.svelte';
    import { onMount, tick, onDestroy } from 'svelte';
    import { initSocket } from '$lib/stores/socket';
    import { ArrowLeft } from 'lucide-svelte';

    export let data;
    export let messages = data.messages.messages;
    let user = data.user;

    const socket = initSocket(); // Initialiser le socket
    let users= [];


    let isAtBottom = true;
    let previousHeight = 0;
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
            isAtBottom = true;
            await scrollToBottom();
        }else{
            console.log('Erreur lors de l\'envoi du message');
        }
    }

    let currentPage = 1;
    let isLoading = false;

    async function loadMoreMessages() {

        if (isLoading) {
            return;
        }
        isLoading = true;

        try {
            const response = await fetch(`/api/channels/${data.channelId}/messages?page=${currentPage + 1}&limit=10`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const newMessages = await response.json();
                if(newMessages.messages.length <= 0){
                    console.log('Pas d\'autres anciens messages');
                    return;
                }
                messages = [...newMessages.messages, ...messages]; // Ajouter les nouveaux messages en haut
                currentPage++;
            } else {
                console.error('Erreur lors du chargement des anciens messages');
            }
        } catch (error) {
            console.error('Erreur réseau lors du chargement des messages:', error);
        } finally {
            isLoading = false;



        }
    }

    function handleScroll(event: Event) {
        const container = event.target as HTMLElement;

        // Vérifiez si l'utilisateur est proche du bas du conteneur
        const threshold = 50; // Pixels avant d'atteindre le bas
        const position = container.scrollHeight - container.scrollTop - container.clientHeight;

        isAtBottom = position <= threshold;
        if(container.scrollTop <= threshold){
            loadMoreMessages();
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

    async function scrollToBottom() {
        if (scrollContainer && isAtBottom) {
            await tick();
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }



    onMount(async () => {
        if (scrollContainer) {
            const observer = new MutationObserver(async () => {
                await scrollToBottom();
                if(scrollContainer.scrollTop <= 5){
                    const newHeight = scrollContainer.scrollHeight;
                    if (newHeight !== previousHeight) {
                        scrollContainer.scrollTop = scrollContainer.scrollHeight - previousHeight;
                        previousHeight = newHeight;
                    }
                }
            });

            observer.observe(scrollContainer, { childList: true, subtree: true });

            isAtBottom = true;

            return () => observer.disconnect();
        }
    });

    onDestroy(() => {
        socket.emit('leave-channel', { userId: data.userId, channelId: data.channelId });
        socket.disconnect(); // Déconnexion propre du socket
    });

    // Ecoute des événements socket
    socket.on("new-message", async (message) => {
        messages = [...messages, message]; // Ajouter le message à l'historique
        await tick();
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

        // On met à jour l'état de l'utilisateur
        users = users.map((u) => {
            if (u.id === userId) {
                // Mettre à jour le state
                return { ...u, state: "En ligne" }; // On recrée l'objet pour garantir la réactivité
            }
            return u;
        });

        // On recrée une nouvelle référence du tableau `users`
        users = [...users]; // Cela force Svelte à détecter le changement dans la liste

        console.log('Utilisateurs après mise à jour de l\'état:', users);

        // Forcer une mise à jour avec tick
        await tick();
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
          class="m-10 flex flex-col gap-5 overflow-y-auto flex-grow "
          bind:this={scrollContainer}
          on:scroll={handleScroll}
        >
            {#if isLoading}
                <div class="loading-indicator">Chargement...</div>
            {/if}
            {#if messages !== undefined && messages.length > 0}
                {#each messages as message}
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
