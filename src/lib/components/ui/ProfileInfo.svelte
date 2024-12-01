<script>
	export let user = { pseudo: '', prenom: '', nom: '', description: '' }; // Infos utilisateur
	export let position = 'right'; // Position de la photo de profil: 'left' ou 'right'
</script>

<div class="user-info" style="left: {position === 'left' ? 'auto' : '0'}; right: {position === 'right' ? '0' : 'auto'};">
	<h3>{user.pseudo}</h3>
	<p>{user.prenom} {user.nom}</p>
	<p>{user.description}</p>
</div>

<style>
    .user-info {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.9);
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        max-width: 200px;
        transition: all 0.3s ease;
    }

    .user-info h3 {
        margin: 0;
        font-size: 18px;
    }

    .user-info p {
        margin: 5px 0;
        font-size: 14px;
    }
</style>
