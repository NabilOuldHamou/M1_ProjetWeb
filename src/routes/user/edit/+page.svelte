<script lang="ts">
	import ChoosePicture from "$lib/components/ui/ChoosePicture.svelte";
	import { Button } from '$lib/components/ui/button';
	import { setUser } from '$lib/stores/userStore';
    import { goto } from '$app/navigation';

	export let data;
	const user = data.user;
	console.log(user);

	let pseudo = user.username;
	let firstName = user.name;
	let lastName = user.surname;
	let email = user.email;

	let profilePicture: File | string | null = user.profilePicture || null; // peut être filename (string) ou File

	let message = '';
	let showMessage = false;
	let isSaving = false;
	let errorMessage: string | null = null;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastProfilePicture: File | string | null = profilePicture;

	// Fonction pour valider l'email
	const validateEmail = (email: string) => {
		const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		return re.test(email);
	};

	// Debounce: schedule save 3s après la dernière frappe
	function scheduleSave() {
		errorMessage = null;
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			updateUser();
			saveTimeout = null;
		}, 3000);
	}

	// Save immediately (used on blur)
	function saveNow() {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}
		updateUser();
	}

	// Sur changement d'image : upload immédiat ou suppression
	$: if (profilePicture !== undefined && profilePicture !== lastProfilePicture) {
		const previous = lastProfilePicture;
		lastProfilePicture = profilePicture;
		// si c'est un File (nouvelle image) on la sauvegarde tout de suite
		if (profilePicture instanceof File) {
			updateUser();
		} else if (profilePicture === null && typeof previous === 'string' && previous) {
			// L'utilisateur a supprimé son image : demander la suppression côté serveur
			updateUser({ removeProfilePicture: true });
		}
	}

	// onBlur handlers pour inputs
	function handleBlur() {
		saveNow();
	}

	// Quand l'utilisateur clique pour retourner au menu, s'assurer que tout est sauvegardé
	async function handleReturn(event: Event) {
	    // empêcher le comportement par défaut du lien si c'est un <a>
	    event?.preventDefault?.();
	    // forcer la sauvegarde maintenant
	    saveNow();
	    // attendre que isSaving soit false (max 5s)
	    const start = Date.now();
	    while (isSaving && Date.now() - start < 5000) {
	        await new Promise((r) => setTimeout(r, 50));
	    }
	    // aller sur la page chats
	    goto('/chats');
	}

	async function updateUser(opts?: { removeProfilePicture?: boolean }) {
		// Validate basic fields before sending
		if (!pseudo || !firstName || !lastName || !email) {
			errorMessage = 'Veuillez remplir tous les champs.';
			showMessage = true;
			return;
		}
		if (!validateEmail(email)) {
			errorMessage = 'L\'email est invalide.';
			showMessage = true;
			return;
		}

		isSaving = true;
		errorMessage = null;

		try {
			const formData = new FormData();
			formData.append('username', pseudo);
			formData.append('name', firstName);
			formData.append('surname', lastName);
			formData.append('email', email);

			// Si profilePicture est un File, on l'ajoute
			if (profilePicture && typeof profilePicture !== 'string') {
				formData.append('profilePicture', profilePicture as File);
			}

			// Si on demande la suppression explicite de l'image de profil
			if (opts?.removeProfilePicture) {
				formData.append('removeProfilePicture', '1');
			}

			const res = await fetch(`/api/users/${user.id}`, {
				method: 'PUT',
				body: formData,
			});

			const result = await res.json();
			console.log('updateUser result', res.status, result);

			if (res.ok) {
				// Mettre à jour le store utilisateur global pour propager le changement
				setUser(result);
				message = 'Informations sauvegardées';
				showMessage = true;
				// si le serveur a renvoyé un filename, mettre à jour profilePicture string si upload
				if (result.profilePicture && typeof result.profilePicture === 'string') {
					profilePicture = result.profilePicture;
					lastProfilePicture = profilePicture;
				} else if (result.profilePicture === null) {
					// serveur a explicitement supprimé l'image
					profilePicture = null;
					lastProfilePicture = null;
				}
			} else {
				// Afficher message d'erreur retourné par l'API (ex: nom déjà pris)
				errorMessage = result?.error || result?.message || 'Erreur lors de la sauvegarde';
				showMessage = true;
			}
		} catch (e) {
			console.error('updateUser exception', e);
			errorMessage = String(e);
			showMessage = true;
		} finally {
			isSaving = false;
		}
	}

	// Supprimer le handler submit form (on garde la form mais on bloque submit)
	function handleSubmit() {
		// noop — on enregistre automatiquement
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

		{#if errorMessage}
			<div class="bg-red-500 text-white p-3 rounded-lg text-center mb-4">{errorMessage}</div>
		{/if}

		<!-- Formulaire de modification du profil -->
		<form on:submit|preventDefault={handleSubmit}>
			<div class="mb-4">
				<label for="pseudo" class="block text-sm font-semibold text-gray-700">Pseudo</label>
				<input
					type="text"
					id="pseudo"
					bind:value={pseudo}
					on:input={scheduleSave}
					on:blur={handleBlur}
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
					on:input={scheduleSave}
					on:blur={handleBlur}
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
					on:input={scheduleSave}
					on:blur={handleBlur}
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
					on:input={scheduleSave}
					on:blur={handleBlur}
					class="w-full p-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Votre email"
				/>
			</div>

			<!-- Intégration du composant de photo de profil -->
			<div class="mb-4">
				<ChoosePicture bind:profilePicture={profilePicture} />
			</div>

			<div class="mt-6 flex flex-col gap-6 items-center justify-center">
				<!-- remplacement du bouton de validation par une sauvegarde automatique -->
				{#if isSaving}
					<div class="text-sm text-gray-500">Sauvegarde en cours...</div>
				{:else}
					<div class="text-sm text-green-600">Dernière modification sauvegardée</div>
				{/if}

				<!-- attendre la sauvegarde puis naviguer -->
				<Button on:click={handleReturn} variant="secondary">Retour au menu principal</Button>
			</div>
		</form>

		</div>
</div>

<style>
    input {
        font-family: inherit;
    }
</style>
