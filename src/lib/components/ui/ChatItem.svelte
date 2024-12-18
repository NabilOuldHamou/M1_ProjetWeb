<script lang="ts">
    import { formatDistanceToNow } from '$lib/utils/date';
    import { onMount } from 'svelte';

    export let id: string; // ID du chat
    export let title: string; // Nom ou titre du chat
    export let lastMessage: string; // Dernier message affiché
    export let createdAt: string; // Heure du dernier message

    let timeElapsed: string;

    // Fonction pour mettre à jour le temps écoulé
    const updateElapsed = () => {
        timeElapsed = formatDistanceToNow(createdAt);
    };

    // Initialisation de l'intervalle
    onMount(() => {
        updateElapsed(); // Calcul initial
        const interval = setInterval(updateElapsed, 1000); // Mise à jour toutes les secondes

        return () => {
            clearInterval(interval); // Nettoyage lors du démontage
        };
    });
</script>

<a href={`/chats/${id}`} class="chat-item p-4 border rounded-md hover:bg-gray-100 cursor-pointer flex justify-between items-center">
    <div>
        <p class="font-semibold text-lg">{title}</p>
        <p class="text-sm text-gray-500 truncate">{lastMessage}</p>
    </div>
    <p class="text-xs text-gray-400">{timeElapsed}</p>
</a>

<style>
    .chat-item {
        transition: background-color 0.2s ease-in-out;
    }
</style>
