<script lang="ts">
    import Alert from "$lib/components/ui/Alert.svelte";  // Importer le composant Alert

    let chatName = "";
    let showAlert = false;
    let alertMessage = "";

    // Fonction pour valider la création du chat
    const createChat = () => {
        if (chatName.trim()) {
            alertMessage = `Le chat "${chatName}" a été créé avec succès.`;
            showAlert = true;
        } else {
            alertMessage = "Veuillez entrer un nom pour le chat.";
            showAlert = true;
        }
    };
</script>

<!-- Container principal centré -->
<div class="flex items-center justify-center h-screen bg-gray-100">
    <div class="bg-white border border-gray-300 rounded-lg p-8 w-96">
        <h1 class="text-2xl font-bold mb-6 text-center">Créer un nouveau chat</h1>

        <!-- Champ pour entrer le nom du chat -->
        <input
            type="text"
            bind:value={chatName}
            placeholder="Nom du chat..."
            class="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring focus:border-blue-500 mb-4"
        />

        <!-- Bouton pour valider -->
        <button
            on:click={createChat}
            class="bg-blue-500 text-white w-full px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none"
        >
            Créer
        </button>
    </div>
</div>

<!-- Affichage de l'alerte si elle doit être visible -->
{#if showAlert}
    <Alert message={alertMessage} onClose={() => showAlert = false} />
{/if}

<style>
    body {
        background-color: #f9fafb; /* Couleur de fond claire */
        font-family: sans-serif;
    }
</style>
