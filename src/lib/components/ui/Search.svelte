<script lang="ts">
    import { Search } from "lucide-svelte"; // Icône de recherche depuis Lucide Svelte

    export let placeholder: string = "Rechercher..."; // Texte par défaut pour l'input

    export let onChange: (value: string) => void = () => {}; // Callback pour la recherche

    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement | null;
        if (target) onChange(target.value);
    }
</script>

<div class="w-full relative">
    <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5 pointer-events-none" />

    <input
        type="text"
        placeholder={placeholder}
        class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 block"
        on:input={handleInput}
        aria-label={placeholder}
    />
</div>
