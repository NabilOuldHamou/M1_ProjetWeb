<script lang="ts">
    import { fade, fly } from 'svelte/transition';  // Importer fade et fly

    export let message: string = "";  // Le message d'alerte
    export let onClose: () => void = () => {};  // Fonction de fermeture de l'alerte
    export let duration: number = 5000;

    // Fonction pour fermer l'alerte
    const closeAlert = () => {
        onClose();
    };

    setTimeout(() => {
        closeAlert();
    }, duration);
</script>

<!-- Alerte avec animation d'apparition (glissement et fade) -->
<div class="fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg"
    in:fly={{ y: -20, opacity: 0, duration: 300 }}
    out:fly={{ y: -20, opacity: 0, duration: 300 }}>

    <span>{message}</span>

    <!-- Bouton pour fermer l'alerte -->
    <button on:click={closeAlert} class="ml-4 text-xl">&times;</button>
</div>

<style>
    /* Styles de l'alerte */
    .alert {
        position: absolute;
        top: 20px;
        right: 20px;
        background-color: #3182ce;
        color: white;
        padding: 10px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    button {
        background: transparent;
        border: none;
        color: white;
        font-size: 1.2em;
        cursor: pointer;
    }
</style>
