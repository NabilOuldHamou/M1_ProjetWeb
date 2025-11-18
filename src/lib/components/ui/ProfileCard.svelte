<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { imageUrl } from '$lib/utils/imageUrl';

	export let user;
	export let userSessionId;
	export let show = false; // Contrôle si la carte est visible
	export let onClose = () => {}; // Fonction pour fermer la carte

	let imgSrc = '/profile-default.svg';

	async function checkImageExists(url: string): Promise<boolean> {
		try {
			const resp = await fetch(url, { method: 'HEAD' });
			return resp.ok;
		} catch {
			return false;
		}
	}

	async function resolveImageSrc(path?: string | null) {
		const candidate = imageUrl(path);
		try {
			const exists = await checkImageExists(candidate);
			imgSrc = exists ? candidate : imageUrl(null);
		} catch {
			imgSrc = imageUrl(null);
		}
	}

	$: if (user) resolveImageSrc(user.profilePicture);

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
	<div class="overlay" role="button" aria-label="Fermer la fenêtre" tabindex="0" on:click={onClose} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onClose?.(); }}>
		<div class="profile-card flex flex-col gap-5" on:click|stopPropagation role="dialog" aria-modal="true" tabindex="0" on:keydown|stopPropagation={(e) => { if (e.key === 'Escape') onClose?.(); }}>
			<div class="profile-header">
				<img src={imgSrc} alt={`${user?.username ?? 'Profil'} image`} class="profile-image" on:error={(e) => ((e.target as HTMLImageElement).src = imageUrl(null))} />
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
