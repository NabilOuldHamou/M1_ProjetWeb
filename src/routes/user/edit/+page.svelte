<script lang="ts">
	import { onMount } from 'svelte';
	import ChoosePicture from "$lib/components/ui/ChoosePicture.svelte"; // Import du composant

	export let data;
	const user = data.user;
	console.log(user);

	let pseudo = user.username;
	let firstName = user.name;
	let lastName = user.surname;
	let email = user.email;

	let profilePicture = user.profilePicture; // Chemin initial ou valeur null

	let message = '';
	let showMessage = false;

	// Fonction pour valider l'email
	const validateEmail = (email: string) => {
		const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		return re.test(email);
	};

	// Fonction de soumission du formulaire
	const handleSubmit = () => {
		if (!pseudo || !firstName || !lastName || !email) {
			message = 'Veuillez remplir tous les champs.';
			showMessage = true;
		} else if (!validateEmail(email)) {
			message = 'L\'email est invalide.';
			showMessage = true;
		} else {
			updateUser();
			message = 'Informations mises à jour avec succès!';
			showMessage = true;
		}
	};

	async function updateUser() {
		const formData = new FormData();
		formData.append('username', pseudo);
		formData.append('name', firstName);
		formData.append('surname', lastName);
		formData.append('email', email);

		if (profilePicture) {
			formData.append('profilePicture', profilePicture);
		}

		const res = await fetch(`/api/users/${user.id}`, {
			method: 'PUT',
			body: formData, // Transmet les données comme multipart/form-data
		});
		const result = await res.json();
		console.log(result);
	}

</script>

<div class="flex items-center justify-center min-h-screen bg-gray-100 mg-10">
	<div class="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
		<h2 class="text-2xl font-semibold text-center mb-6">Modifier les informations du compte</h2>

		<!-- Message d'alerte -->
		{#if showMessage}
			<div class="bg-blue-500 text-white p-3 rounded-lg text-center mb-4">
				{message}
			</div>
		{/if}

		<!-- Formulaire de modification du profil -->
		<form on:submit|preventDefault={handleSubmit}>
			<div class="mb-4">
				<label for="pseudo" class="block text-sm font-semibold text-gray-700">Pseudo</label>
				<input
					type="text"
					id="pseudo"
					bind:value={pseudo}
					class="w-full p-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Votre pseudo"
				/>
			</div>

			<div class="mb-4">
				<label for="firstName" class="block text-sm font-semibold text-gray-700">Prénom</label>
				<input
					type="text"
					id="firstName"
					bind:value={firstName}
					class="w-full p-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Votre prénom"
				/>
			</div>

			<div class="mb-4">
				<label for="lastName" class="block text-sm font-semibold text-gray-700">Nom</label>
				<input
					type="text"
					id="lastName"
					bind:value={lastName}
					class="w-full p-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Votre nom"
				/>
			</div>

			<div class="mb-4">
				<label for="email" class="block text-sm font-semibold text-gray-700">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					class="w-full p-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Votre email"
				/>
			</div>

			<!-- Intégration du composant de photo de profil -->
			<div class="mb-4">
				<ChoosePicture bind:profilePicture={profilePicture} />
			</div>

			<div class="mt-6 flex justify-center">
				<button
					type="submit"
					class="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 focus:outline-none"
				>
					Mettre à jour
				</button>
			</div>
		</form>
	</div>
</div>

<style>
    input, button {
        font-family: inherit;
    }
</style>
