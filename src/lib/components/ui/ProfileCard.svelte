<script>
	import Button from '$lib/components/ui/button/button.svelte';

	export let user;
	export let userSessionId;
	export let show = false; // Contrôle si la carte est visible
	export let onClose = () => {}; // Fonction pour fermer la carte

	const disconnect = async () => {
		try {
			const response = await fetch('/disconnect', { method: 'POST' });
			if (response.redirected) {
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
			<div class="profile-header">
				<img src="http://localhost:5173/{user.profilePicture}" alt="Profile" class="profile-image" />
				<h2 id="profile-card-title" class="profile-name">{user.username}</h2>
			</div>
			<div class="profile-info">
				<div class="info-row">
					<span class="info-label">Nom :</span>
					<span class="info-value">{user.surname}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Prénom :</span>
					<span class="info-value">{user.name}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Email :</span>
					<span class="info-value">{user.email}</span>
				</div>
			</div>

			{#if user.id === userSessionId}
				<div class="actions">
					<Button on:click={editProfile}>Éditer</Button>
					<Button on:click={disconnect} variant="destructive">Déconnexion</Button>
				</div>
			{/if}
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
        background-color: rgba(0, 0, 0, 0.7);
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
        text-align: left;
        width: 400px;
        max-width: 90%;
    }

    .profile-header {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        margin-bottom: 20px;
    }

    .profile-image {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        margin-right: 15px;
    }

    .profile-name {
        font-size: 1.8rem;
        font-weight: bold;
        color: #333;
    }

    .profile-info {
        margin: 20px 0;
        padding: 15px;
        background-color: #f9f9f9;
        border-radius: 10px;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #eaeaea;
    }

    .info-row:last-child {
        border-bottom: none;
    }

    .info-label {
        font-weight: 600;
        color: #555;
        font-size: 0.9rem;
    }

    .info-value {
        font-weight: 400;
        color: #333;
        font-size: 0.95rem;
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 15px;
    }
</style>
