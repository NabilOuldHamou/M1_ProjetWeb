<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { fade, fly } from 'svelte/transition';  // Importer fade et fly

    export let message: string = "";  // Le message d'alerte
    export let onClose: () => void = () => {};  // Fonction de fermeture de l'alerte
    export let duration: number = 5000;

    export let show = false;

    // Fonction pour fermer l'alerte
    const closeAlert = () => {
        onClose();
    };

    // Gestion du timeout pour fermer l'alerte après un certain délai
    let timeout: NodeJS.Timeout;

    $: {
        if (show) {
            timeout = setTimeout(() => {
                closeAlert();  // Fermer l'alerte après la durée
            }, duration);
        } else {
            clearTimeout(timeout);  // Si l'alerte est fermée, on annule le timeout
        }
    }

    // Nettoyage du timeout si le composant est démonté avant la fin du délai
    onDestroy(() => {
        clearTimeout(timeout);
    });

</script>

{#if show}
    <div class="alert fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg"
        in:fly={{ y: -20, opacity: 0, duration: 300 }}
        out:fly={{ y: -20, opacity: 0, duration: 300 }}>

        <span>{message}</span>
    </div>
{/if}

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
        z-index: 1000;
    }

    button {
        background: transparent;
        border: none;
        color: white;
        font-size: 1.2em;
        cursor: pointer;
    }
</style>
