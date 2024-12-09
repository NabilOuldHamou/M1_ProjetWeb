<script>
	export let user; // Infos utilisateur
	export let position = 'right'; // Position de la photo de profil: 'left' ou 'right'
	export let show = false; // Afficher ou masquer les infos utilisateur
</script>

{#if show}
	<div class="user-info {position ? 'left' : 'right' }">
		<h2 class="text-lg font-semibold">{user.username}</h2>
		<p class="text-sm text-gray-500">{user.email}</p>
		<p class="text-sm text-gray-500">{user.name} {user.surname}</p>
	</div>
{/if}

<style>
    .user-info {
        position: absolute;
        top: 0; /* Aligner en haut */
        left: auto;
        right: auto;
        width: 200px; /* Largeur par défaut */
        background: rgba(255, 255, 255, 0.95); /* Fond semi-transparent */
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10; /* Gérer les priorités d'affichage */
        transition: all 0.3s ease-in-out; /* Animation fluide pour les changements */
    }

    .user-info.left {
        right: 110%; /* Position à gauche avec un espace */
    }

    .user-info.right {
        left: 110%; /* Position à droite avec un espace */
    }

    /* Media Queries pour adapter le style */
    @media (max-width: 768px) {
        .user-info {
            width: 150px; /* Réduire la largeur sur les écrans plus petits */
            padding: 10px; /* Réduire le padding */
            font-size: 0.9rem; /* Réduire la taille de la police */
        }
    }

    @media (max-width: 480px) {
        .user-info {
            position: fixed; /* Position fixe pour éviter les débordements */
            left: 10px; /* Centrer avec un padding interne */
            right: 10px;
            width: auto; /* Utiliser toute la largeur disponible */
            max-width: 90%; /* Limiter la largeur pour éviter les débordements */
            padding: 8px; /* Réduire le padding davantage */
            font-size: 0.8rem; /* Police encore plus petite */
        }

        .user-info.left,
        .user-info.right {
            left: 10px; /* Ignorer les positionnements relatifs */
            right: 10px;
        }
    }
</style>

