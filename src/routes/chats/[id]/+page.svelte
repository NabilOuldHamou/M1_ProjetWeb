<script lang="ts">
    import Textarea from "../../../lib/components/ui/textarea/textarea.svelte";
    import { Button } from "$lib/components/ui/button";
    import PaperPlane from "svelte-radix/PaperPlane.svelte";
    import Message from "$lib/components/Message.svelte";
    import UserChat from '$lib/components/ui/UserChat.svelte';

    export let data;
    export let messages = data.messages;
    export let users = data.users; // Liste des utilisateurs
    let selectedUser = null; // Utilisateur actuellement sélectionné
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
        <div class="m-10 flex flex-col gap-5 overflow-y-auto flex-grow ">
            <!-- Afficher les messages (mock d'un utilisateur sélectionné ou aucun message par défaut) -->
            {#if messages.length > 0}
                {#each messages as message}
                    <Message username={message.username} messageContent={message.messageContent} />
                {/each}
            {:else}
                <div class="text-center text-gray-500 mt-10">Sélectionnez un message le chat est vide.</div>
            {/if}
        </div>

        <!-- Input pour envoyer un message -->
        <div class="px-10 py-5 w-full flex gap-2 border-t">
            <Textarea class="h-16 resize-none flex-grow" placeholder="Écrivez un message..." />
            <Button size="icon" class="h-16 w-16 bg-blue-500 hover:bg-blue-600 h-full">
                <PaperPlane class="h-6 w-6" />
            </Button>
        </div>
    </div>
</div>

<style>
    .h-full {
        height: 100%;
    }
    .selected {
        background-color: #e2e8f0;
    }
</style>
