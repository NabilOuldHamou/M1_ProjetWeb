<script lang="ts">
    export let id: string; // ID du chat
    export let title: string; // Nom ou titre du chat
    export let lastMessage: string; // Dernier message affiché
    export let time: string; // Heure du dernier message
</script>

<a href={`/chat/${id}`} class="chat-item p-4 border rounded-md hover:bg-gray-100 cursor-pointer flex justify-between items-center">
    <div>
        <p class="font-semibold text-lg">{title}</p>
        <p class="text-sm text-gray-500 truncate">{lastMessage}</p>
    </div>
    <p class="text-xs text-gray-400">{time}</p>
</a>

<style>
    .chat-item {
        transition: background-color 0.2s ease-in-out;
    }
</style>
