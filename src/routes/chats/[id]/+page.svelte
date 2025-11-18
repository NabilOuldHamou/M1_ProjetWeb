<script lang="ts">
    import Textarea  from "$lib/components/ui/textarea/textarea.svelte";
    import { Button } from "$lib/components/ui/button";
    import PaperPlane from "svelte-radix/PaperPlane.svelte";
    import Message from "$lib/components/Message.svelte";
    import UserChat from '$lib/components/ui/UserChat.svelte';
    import { tick, onDestroy, onMount } from 'svelte';
    import { initSocket } from '$lib/stores/socket';
    import { ArrowLeft } from 'lucide-svelte';
    import { messagesStore, type Message as MsgType } from '$lib/stores/messagesStore';
    import ProfileCard from '$lib/components/ui/ProfileCard.svelte';
    import type { Socket } from 'socket.io-client';
    import { userStore } from '$lib/stores/userStore';

    type User = {
        id: string;
        username?: string;
        name?: string;
        surname?: string;
        email?: string;
        profilePicture?: string;
        state?: string;
        socketId?: string;
        [k:string]: unknown;
    };

    type Data = { channelId: string; userId: string; user: User; messages?: { messages: MsgType[] } };
    export let data: Data;

    // Définition robuste du scrollToBottom placée avant son utilisation
    const scrollToBottom = async (retries = 20) => {
        // Attendre la mise à jour du DOM
        await tick();
        if (!scrollContainer) return;
        const doScroll = () => {
            try {
                // Utiliser auto (instant) plutôt que smooth pour fiabilité
                scrollContainer!.scrollTo({ top: scrollContainer!.scrollHeight, behavior: 'auto' });
            } catch (e) {
                // fallback
                if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        };
        // Première tentative immédiate
        doScroll();
        // Réessayer plusieurs fois sur les frames suivantes (utile si des images ou lazy render changent la hauteur)
        for (let i = 0; i < retries; i++) {
            await new Promise((res) => {
                if (typeof requestAnimationFrame === 'function') requestAnimationFrame(res);
                else setTimeout(res, 16);
            });
            doScroll();
        }
        // Petit délai final pour s'assurer (si des ressources asynchrones modifient encore la hauteur)
        await new Promise((r) => setTimeout(r, 50));
        doScroll();
    }

    // Assurez-vous que les messages sont du bon type
    messagesStore.set((data?.messages?.messages ?? []) as MsgType[]);

    let user: User = data.user as User;
    // s'abonner au userStore pour refléter les changements globaux du profil
    let unsubscribeUser: (() => void) | null = null;
    onMount(() => {
        unsubscribeUser = userStore.subscribe((u) => {
            if (u && u.id === user.id) {
                // mettre à jour l'objet user local
                user = { ...user, ...u };
            }
        });
    });
    onDestroy(() => {
        if (unsubscribeUser) unsubscribeUser();
    });

    let socket: Socket | null = null;
    let users: User[] = [];
    let socketJoined = false; // indique si le socket a rejoint la room côté serveur

    let scrollContainer: HTMLElement | null = null;
    let messageText = '';

    let stopWritingTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleEnter = async (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            await sendMessage();
        }
    };

    const handleWriting = () => {
        if (stopWritingTimeout) clearTimeout(stopWritingTimeout as ReturnType<typeof setTimeout>);
        try {
            socket?.emit('writing', { userId: data.userId, channelId: data.channelId });
        } catch (e) {
            console.warn('handleWriting emit failed', e);
        }
        stopWritingTimeout = setTimeout(() => {
            handleStopWriting();
        }, 2000);
    };

    const handleStopWriting = () => {
        try {
            socket?.emit('stop-writing', { userId: data.userId, channelId: data.channelId });
        } catch (e) {
            console.warn('handleStopWriting emit failed', e);
        }
        if (stopWritingTimeout) {
            clearTimeout(stopWritingTimeout as ReturnType<typeof setTimeout>);
            stopWritingTimeout = null;
        }
    }

    // Exposer joinChannelWithRetry au scope supérieur pour pouvoir le réutiliser (ex: sendMessage)
    const joinChannelWithRetry = async (retries = 3, delayMs = 200): Promise<boolean> => {
        if (!socket) return false;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`Tentative join (attempt ${attempt}) pour channel ${data.channelId}`);
                const ackPromise = new Promise<{ ok: boolean; room?: string; users?: User[] } | undefined>((resolve) => {
                    socket?.emit('new-user-join', { user: { ...user, socketId: socket?.id, state: 'En ligne' }, channelId: data.channelId }, (ack?: { ok: boolean; room?: string; users?: User[] }) => resolve(ack));
                });
                const ack = await ackPromise;
                console.log('ACK new-user-join:', ack);
                if (ack && ack.ok) {
                    socketJoined = true;
                    if (ack.users) users = Array.isArray(ack.users) ? ack.users as User[] : [];
                    // ensure we have the latest list by requesting explicitly if needed
                    socket?.emit('request-users', { channelId: data.channelId }, (r: { ok: boolean; users?: User[] }) => {
                        if (r?.ok && r.users) users = r.users;
                    });
                    return true;
                }
            } catch (e) {
                console.warn('Erreur joinChannelWithRetry attempt', attempt, e);
            }
            await new Promise(r => setTimeout(r, delayMs));
        }
        // Si échec, forcer une demande explicite
        socket?.emit('request-users', { channelId: data.channelId }, (r: { ok: boolean; users?: User[] }) => {
            if (r?.ok && r.users) users = r.users;
        });
        return false;
    };

    let activeProfileId: string | null = null;
    let userChatSelected: User = {
        id: '',
        username: '',
        name: '',
        surname: '',
        email: '',
        profilePicture: '',
        state: '',
    };
    let showProfileCard = false;

    function openProfileCard(u: User) {
        userChatSelected = u;
        showProfileCard = true;
    }

    function closeProfileCard() {
        showProfileCard = false;
    }

    function setActiveProfile(id: string | null) {
        activeProfileId = id;
    }

    async function sendMessage() {
        // S'assurer que le socket a rejoint la room avant d'appeler l'API
        if (socket && !socketJoined) {
            const ok = await joinChannelWithRetry(3, 200);
            if (!ok) {
                console.warn('Impossible de rejoindre la room avant envoi, le message sera envoyé mais peut ne pas être reçu en temps réel');
            }
        }
        // Appel API pour envoyer le message
        const response = await fetch(`/api/channels/${data.channelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: data.userId, text: messageText, socketId: socket?.id ?? null }),
        });

        console.log('POST /api/channels response status:', response.status);
        const bodyText = await response.text();
        console.log('POST /api/channels response body (text):', bodyText);

        if (response.ok) {
            let newMessage: MsgType | null = null;
            try {
                newMessage = JSON.parse(bodyText) as MsgType;
            } catch (e) {
                console.warn('Failed to parse response JSON for new message:', e);
            }
             await tick();
             await scrollToBottom();
             console.log('Message envoyé avec succès');
             messageText = '';
         } else {
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

        const previousMessages = $messagesStore as MsgType[];

        let newMessagesResponse: { messages: MsgType[] } | null = null;

        try {
            // Calculer la page à charger en fonction du nombre total de messages existants
            const totalMessages = previousMessages.length;
            const pageToLoad = Math.floor(totalMessages / limit) + 1;

            const response = await fetch(`/api/channels/${data.channelId}/messages?page=${pageToLoad}&limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                newMessagesResponse = await response.json();

                if (!newMessagesResponse?.messages || newMessagesResponse.messages.length <= 0) {
                    console.log("Pas d'autres anciens messages");
                    return;
                }

                // Éviter les doublons en filtrant les messages déjà présents
                const existingMessageIds = new Set(previousMessages.map((msg: MsgType) => msg.id));
                const filteredMessages = newMessagesResponse.messages.filter((msg: MsgType) => !existingMessageIds.has(msg.id));

                if (filteredMessages.length > 0) {
                    $messagesStore = [...filteredMessages, ...previousMessages]; // Ajouter les nouveaux messages en haut
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
            await tick();
            const filteredNewMessages = (newMessagesResponse?.messages ?? []).filter((msg: MsgType) => {
                return !previousMessages.some((m: MsgType) => m.id === msg.id);
            });
            if (scrollContainer) scrollContainer.scrollTo({
                top: filteredNewMessages.length * 300,
            });

        }
    }

    function handleScroll() {
        if (scrollContainer) {
            // Détection quand on est en haut du scroll
            if (scrollContainer.scrollTop <= 0 && !isLoading) {
                loadMoreMessages();
            }
        }
    }

    onDestroy(() => {
        if (socket) {
            socket.emit('leave-channel', { userId: data.userId, channelId: data.channelId });
            // Ne PAS déconnecter le socket global ici : il est partagé par l'application.
            // socket.disconnect(); // removal of global disconnection avoids losing connection across pages
        }
        if (scrollContainer) {
            scrollContainer.removeEventListener('scroll', handleScroll);
        }
    });

    onMount(() => {
        // Initialise le socket en passant channelId/userId pour que le serveur puisse auto-join via handshake.auth
        socket = initSocket({ channelId: data.channelId, userId: String(data.userId) });
        if (!socket) return;

        // Émettre immédiatement un 'new-user-join' — socket.io bufferise les emits si la connexion n'est pas encore établie.
        try {
            socket.emit('new-user-join', { user:{ ...user, socketId: socket.id, state: 'En ligne' }, channelId: data.channelId }, (ack: { ok: boolean; room?: string; users?: string[] | User[] } | undefined) => {
                console.log('ACK new-user-join from server (immediate emit):', ack);
                if (ack?.ok) {
                    socketJoined = true;
                    if (ack.users) users = Array.isArray(ack.users) ? (ack.users as User[]) : [];
                }
            });
        } catch (e) {
            console.warn('Immediate emit new-user-join failed (will rely on connect handler):', e);
        }

        // Ecoute des événements socket
        // Retirer d'éventuels anciens listeners pour éviter duplicates
        socket.off('new-message');
        socket.off('load-users-channel');
        socket.off('user-writing');
        socket.off('user-stop-writing');

        socket.on("new-message", async (message: MsgType) => {
            console.log('new-message reçu (client):', message, ' socketId=', socket?.id);
            // Eviter doublon si le message est déjà présent (optimistic update)
            const exists = $messagesStore.some((m: MsgType) => m.id === message.id);
            if (!exists) {
                $messagesStore = [...$messagesStore, message]; // Add the new message to the store
                await tick();
                await scrollToBottom(); // Scroll to the bottom after the message is added
            } else {
                console.log('Message déjà présent localement, skip add ; id=', message.id);
            }
         });


        // Listener de debug envoyé par l'API pour vérifier la connectivité
        socket.on('debug-new-message', (info: { channelId: string; messageId: string }) => {
            console.log('debug-new-message reçu (client):', info, ' socketId=', socket?.id);
        });

        socket.on("load-users-channel", async (us: User[]) => {
            console.log('load-users-channel reçu (client), users:', us);
            // Forcer la réactivité en clonant les objets
            users = Array.isArray(us) ? us.map(u => ({ ...u })) : [];
            await tick();
        });

        // Si le socket est déjà connecté (cas reconnect), émettre join immédiatement
        if (socket.connected) {
            // handled by immediate emit above; kept for backward-compat
            joinChannelWithRetry();
        }

        socket.on("connect", () => {
            // Quand le socket se connecte, tenter de rejoindre la room
            // appeler la version globale définie plus haut
            joinChannelWithRetry();
        });

        socket.on('user-writing', async (userId: string) => {
            console.log('user-writing reçu pour userId:', userId);

            // On met à jour l'état de l'utilisateur
            users = users.map((u: User) => {
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

        socket.on('user-stop-writing', async (userId: string) => {
            console.log('user-stop-writing reçu pour userId:', userId);

            users = users.map((u: User) => {
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

    });

    messagesStore.subscribe(async () => {
        await tick();
    });

    let firstPageLoad = true;

    onMount(async () => {
        await tick();
        if(firstPageLoad){
            firstPageLoad = false;
            await scrollToBottom();
        }
    });

</script>

<div class="h-full flex">
    <!-- Liste des utilisateurs (colonne gauche) -->
    <div class="w-1/4 bg-gray-100 border-r overflow-y-auto">
        <div class="flex gap-4 px-4 mt-5 items-center">
            <Button href="/chats" variant="outline" size="icon" ><ArrowLeft /></Button>
            <h2 class="text-3xl font-bold">Utilisateurs</h2>
            <div class="ml-2 text-sm text-gray-500 font-bold">({users.length})</div>
         </div>
        <div class="flex flex-col m-5 gap-2">
            {#each users as u (u.id)}
                <UserChat
                  user={u}
                  openProfileCard={() => openProfileCard(u)}
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
          on:scroll={handleScroll}
        >
            {#if isLoading}
                <div class="loading-indicator">Chargement...</div>
            {/if}
            {#if $messagesStore !== undefined && $messagesStore.length > 0}
                {#each $messagesStore as message}
                    <Message
                      userId={String(data.userId)}
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
            <Button size="icon" class="h-16 w-16 bg-blue-500 hover:bg-blue-600 h-full flex items-center justify-center" on:click={sendMessage}>
                <PaperPlane class="h-6 w-6 text-white" />
            </Button>
        </div>
    </div>
</div>

<ProfileCard user={userChatSelected} userSessionId={String(data.userId)} show={showProfileCard} onClose={closeProfileCard}></ProfileCard>

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
