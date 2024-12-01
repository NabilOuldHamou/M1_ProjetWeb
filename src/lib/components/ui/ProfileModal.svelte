<script lang="ts">
	export let name: string = "Nom de l'utilisateur";
	export let imageUrl: string = "https://via.placeholder.com/150";
	export let bio: string = "Bio de l'utilisateur détaillée.";
	export let onClose: () => void = () => {};  // Fonction pour fermer le modal
</script>

<div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center" on:click={onClose}>
	<div class="bg-white rounded-lg w-96 p-8" on:click|stopPropagation>
		<div class="flex justify-between items-center">
			<h2 class="text-2xl font-bold">{name}</h2>
			<button on:click={onClose} class="text-gray-600 hover:text-gray-900">×</button>
		</div>

		<div class="mt-4 text-center">
			<img src={imageUrl} alt="Photo de profil" class="w-24 h-24 rounded-full mx-auto mb-4" />
			<p class="text-gray-800">{bio}</p>
		</div>

		<div class="mt-6 text-center">
			<button on:click={onClose} class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
				Fermer
			</button>
		</div>
	</div>
</div>

<style>
    div {
        transition: opacity 0.3s ease, transform 0.3s ease;
    }

    div:hover {
        opacity: 1;
    }
</style>
