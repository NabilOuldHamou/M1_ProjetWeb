<script>
	export let user; // Infos utilisateur
	export let position = 'right'; // Position de la photo de profil: 'left' ou 'right'
	export let show = false; // Afficher ou masquer les infos utilisateur
</script>

{#if show}
	<div class="user-info" style="left: {position === 'left' ? 'auto' : '0'}; right: {position === 'right' ? '0' : 'auto'};">
		<h3>{user.pseudo}</h3>
		<p>{user.name} {user.surname}</p>
		<p>{user.description}</p>
	</div>
{/if}

<style>
    .user-info {
        position: absolute;
        top: 0; /* Aligner en haut */
        left: auto;
        right: auto;
        width: 200px; /* Largeur appropriée */
        background: rgba(255, 255, 255, 0.95); /* Fond semi-transparent */
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10; /* Gérer les priorités d'affichage */
    }

    .user-info.left {
        right: 110%; /* Position à gauche avec un espace */
    }

    .user-info.right {
        left: 110%; /* Position à droite avec un espace */
    }
</style>

