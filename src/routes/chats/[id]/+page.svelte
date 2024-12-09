<script lang="ts">
    import Textarea  from "$lib/components/ui/textarea/textarea.svelte";
    import { Button } from "$lib/components/ui/button";
    import PaperPlane from "svelte-radix/PaperPlane.svelte";
    import Message from "$lib/components/Message.svelte";
    import UserChat from '$lib/components/ui/UserChat.svelte';
    import { onMount, tick } from 'svelte';
    import { initSocket } from '$lib/stores/socket';

    export let data;
    export let messages = data.messages.messages;
    export let users = data.users;


    let scrollContainer: HTMLElement;
    let messageText = '';

    let socket = initSocket(); // Initialiser le socket

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

    let currentPage = 1;
    let isLoading = false;

    async function loadMoreMessages() {
        if (isLoading) return;
        isLoading = true;

        // Sauvegarder la hauteur actuelle
        const previousHeight = scrollContainer.scrollHeight;

        try {
            const response = await fetch(`/api/channels/${data.channelId}/messages?page=${currentPage + 1}&limit=10`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const newMessages = await response.json();
                console.log(newMessages);
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

            // Réajuster la position de défilement
            await tick(); // Attendre la mise à jour du DOM
            const newHeight = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = newHeight - previousHeight;
        }
    }

    function handleScroll(event: Event) {
        const container = event.target as HTMLElement;
        if (container.scrollTop === 0 && !isLoading) {
            loadMoreMessages();
        }
    }

    onMount(() => {
        scrollToBottom(scrollContainer);

        socket.on("new-message", (message) => {
            messages = [...messages , message ];
        });
    });

    async function handleEnter(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            await sendMessage();
        }
    }

    const scrollToBottom = node => {
        const scroll = () => node.scroll({
            top: node.scrollHeight,
            behavior: 'smooth',
        });
        scroll();

        return { update: scroll }
    };

</script>

<div class="h-full flex">
    <!-- Liste des utilisateurs (colonne gauche) -->
    <div class="w-1/4 bg-gray-100 border-r overflow-y-auto">
        <h2 class="text-3xl font-bold px-4 mt-5">Utilisateurs</h2>
        <div class="flex flex-col m-5 gap-2">
            {#each users as user}
                <UserChat
                  profilePicture={user.profilePicture}
                  username={user.username}
                  status={user.status}
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
          use:scrollToBottom={messages}
          on:scroll={handleScroll}
        >
            {#if isLoading}
                <div class="loading-indicator">Chargement...</div>
            {/if}
            <!-- Afficher les messages (mock d'un utilisateur sélectionné ou aucun message par défaut) -->
            {#if messages !== undefined && messages.length > 0}
                {#each messages as message}
                    <Message myMessage={data.userId == message.user.id} user={message.user}  messageContent={message.text} createdAt={message.createdAt} />
                {/each}
            {:else}
                <div class="text-center text-gray-500 mt-10">Sélectionnez un message le chat est vide.</div>
            {/if}
        </div>

        <!-- Input pour envoyer un message -->
        <div class="px-10 py-5 w-full flex gap-2 border-t">
            <Textarea class="h-16 resize-none flex-grow" placeholder="Écrivez un message..." bind:value={messageText} on:keypress={handleEnter}/>
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
</style>
