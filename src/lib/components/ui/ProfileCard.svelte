<script lang="ts">
	export let name: string = "Nom de l'utilisateur";
	export let imageUrl: string = "https://via.placeholder.com/150"; // URL de l'image du profil
	export let bio: string = "Une courte bio sur l'utilisateur.";

	export let onClick: () => void = () => {}; // Fonction pour ouvrir un modal ou autre action
</script>

<div class="bg-white shadow-lg rounded-lg overflow-hidden w-64 cursor-pointer" on:click={onClick}>
	<!-- Image de profil -->
	<img src={imageUrl} alt="Photo de profil" class="w-full h-32 object-cover" />

	<!-- Détails du profil -->
	<div class="p-4">
		<h3 class="text-lg font-bold">{name}</h3>
		<p class="text-gray-600 text-sm">{bio}</p>
	</div>
</div>

<style>
    div {
        transition: transform 0.3s ease;
    }

    div:hover {
        transform: scale(1.05);
    }
</style>
