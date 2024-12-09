<script lang="ts">
	import { onMount } from 'svelte';

	export let profilePicture: File | null = null;
	export let defaultImage = '/profile-default.svg'; // Image par défaut si aucune image n'est sélectionnée

	let clientPicture: string | null = profilePicture ? `/${profilePicture}` : defaultImage;

	// Fonction exécutée lorsque l'utilisateur sélectionne une image
	const handleFileChange = (event: Event) => {
		const input = event.target as HTMLInputElement;
		if (input.files?.length) {
			profilePicture = input.files[0]; // Affectation du fichier sélectionné
			clientPicture = URL.createObjectURL(profilePicture); // Prévisualisation de l'image
		} else {
			clientPicture = null;
			profilePicture = null;
		}
	};

	const handleDelete = () => {
		profilePicture = null;
	};
</script>

<!-- Conteneur principal -->
<div class="container">
	<!-- Image de profil ou image par défaut -->
	<img
		src={clientPicture}
		alt="Image de profil"
		class="image-preview mb-10"
	/>

	<!-- Sélectionner une image -->
	<label for="profilePicture" class="file-upload-btn">
		Sélectionner une image
		<input
			type="file"
			id="profilePicture"
			class="file-input"
			accept="image/*"
			on:change={handleFileChange}
		/>
	</label>

	<div class="action-buttons">
		<!-- Bouton Supprimer l'image -->
		<button
			type="button"
			class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
			on:click={handleDelete}
			disabled={!profilePicture}
		>
			Supprimer l'image
		</button>
	</div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        text-align: center;
    }

    .file-upload-btn {
        position: relative;
        display: inline-block;
        background-color: #3182ce;
        color: white;
        font-size: 16px;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-bottom: 10px;
    }

    .file-upload-btn:hover {
        background-color: #2563eb;
    }

    .file-upload-btn:active {
        background-color: #1e40af;
    }

    .file-input {
        display: none;
    }

    .image-preview {
        margin-top: 20px;
        width: 150px;
        height: 150px;
        object-fit: cover;
        border-radius: 50%; /* Arrondir l'image en cercle */
        border: 4px solid #3182ce; /* Bordure autour de l'image */
    }

    .action-buttons {
        margin-top: 20px;
    }

    .action-buttons button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
</style>
