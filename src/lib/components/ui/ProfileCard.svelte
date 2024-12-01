<script>
	export let user = {
		pseudo: '',
		prenom: '',
		nom: '',
		description: '',
		profilePictureUrl: '',  // Ajouter l'URL de l'image de profil
	}; // Infos utilisateur
	export let show = false; // Contrôle si la carte est visible
	export let onClose = () => {
	}; // Fonction pour fermer la carte
</script>

{#if show}
	<div class="overlay" role="dialog" aria-labelledby="profile-card-title" on:click={onClose}>
		<div class="profile-card" on:click|stopPropagation>
			<div class="profile-header">
				<!-- Image de profil -->
				<img src={user.profilePictureUrl} alt="Profile" class="profile-image" />
				<h2 id="profile-card-title" class="profile-name">{user.pseudo}</h2>
			</div>
			<p>{user.prenom} {user.nom}</p>
			<p>{user.description}</p>
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
        justify-content: center;
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
