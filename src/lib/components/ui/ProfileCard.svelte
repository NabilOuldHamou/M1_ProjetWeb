<script>
	import Button  from '$lib/components/ui/button/button.svelte';

	export let user;
	export let userId;
	export let show = false; // Contrôle si la carte est visible
	export let onClose = () => {}; // Fonction pour fermer la carte


	const disconnect = async () => {
		try {
			// Envoyer une requête POST à l'endpoint /disconnect
			const response = await fetch('/disconnect', {
				method: 'POST',
			});

			// Vérifier si la déconnexion a réussi (ici, on se base sur le code de redirection)
			if (response.redirected) {
				// Si la redirection est effectuée, vous pouvez rediriger manuellement côté client
				window.location.href = response.url;
			}
		} catch (error) {
			console.error('Erreur lors de la déconnexion:', error);
		}
	};

	const editProfile = () => {
		window.location.href = '/user/edit';
	};
</script>

{#if show}
	<div class="overlay" role="dialog" aria-labelledby="profile-card-title" on:click={onClose}>
		<div class="profile-card flex flex-col gap-5" on:click|stopPropagation>
			<div class="flex flex-col gap-2">
				<div class="profile-header">
					<!-- Image de profil -->
					<img src="http://localhost:5173/{user.profilePicture}" alt="Profile" class="profile-image" />
					<h2 id="profile-card-title" class="profile-name">{user.username}</h2>
				</div>
				<p>{user.name} {user.surname}</p>
				<p>{user.email}</p>
			</div>

			<div class="flex flex-col gap-3">
				<Button on:click={editProfile}>Editer</Button>
				<Button on:click={disconnect} variant="destructive">Déconnexion</Button>
			</div>

		</div>
	</div>
{/if}

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.7); /* Fond noir avec opacité */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .profile-card {
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
        text-align: center;
        width: 400px; /* Taille de la carte ajustée */
        max-width: 90%; /* Limite la largeur */
    }

    .profile-header {
        display: flex;
        justify-content: left;
        align-items: center;
        margin-bottom: 20px;
    }

    .profile-image {
        width: 80px;
        height: 80px;
        border-radius: 50%; /* Rendre l'image ronde */
        object-fit: cover; /* Pour que l'image remplisse bien le cercle */
        margin-right: 15px;
    }

    .profile-name {
        font-size: 1.5rem;
        font-weight: bold;
    }
</style>
