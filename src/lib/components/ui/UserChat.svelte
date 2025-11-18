<script lang="ts">
	import { imageUrl } from '$lib/utils/imageUrl';

	type User = {
		id: string;
		username?: string;
		profilePicture?: string;
		state?: string;
		[s:string]: unknown;
	};

	export let user: User;

	export let openProfileCard = () => {};

	let imgSrc: string = '/profile-default.svg';

	// vérifie si l'URL existe via HEAD
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

	$: if (user) {
		// whenever user changes, resolve image
		resolveImageSrc(user.profilePicture);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openProfileCard();
		}
	}
</script>

<div
	class="flex items-center gap-4 justify-between p-3 cursor-pointer hover:bg-gray-100 rounded-lg border border-gray-300 shadow-sm"
	on:click={openProfileCard}
	role="button"
	tabindex="0"
	on:keydown={handleKeyDown}
>
	<div class="flex items-center gap-4">
		<img
			src={imgSrc}
			alt="Profile"
			class="h-12 w-12 rounded-full border border-gray-300"
			on:error={(e) => ((e.target as HTMLImageElement).src = imageUrl(null))}
		/>
		<div class="flex flex-col">
			<span class="font-medium text-gray-800">{user.username}</span>
			<div class="flex items-center gap-1">
				<span class="text-xs text-gray-500">{user.state}</span>
			</div>
		</div>
	</div>
	{#if user.state === "En ligne"}
		<div class="online-indicator"></div>
	{:else if user.state === "Ecrit"}
		<div class="typing-animation">
			<span class="dot"></span>
			<span class="dot"></span>
			<span class="dot"></span>
		</div>
	{/if}
</div>

<style>
    /* Ajout d'une animation subtile lors du survol */
    div:hover {
        background-color: #f3f4f6;
        transition: background-color 0.2s ease-in-out;
    }

    /* Styles pour le point vert (En ligne) */
    .online-indicator {
        width: 12px;
        height: 12px;
        background-color: #22c55e; /* Couleur verte */
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(34, 197, 94, 0.6); /* Glow léger */
    }

    /* Styles pour l'animation des trois points */
    .typing-animation {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .dot {
        width: 6px;
        height: 6px;
        background-color: #3b82f6; /* Couleur bleue */
        border-radius: 50%;
        animation: bounce 1.2s infinite ease-in-out;
    }

    .dot:nth-child(2) {
        animation-delay: 0.2s;
    }

    .dot:nth-child(3) {
        animation-delay: 0.4s;
    }

    @keyframes bounce {
        0%, 80%, 100% {
            transform: scale(0);
        }
        40% {
            transform: scale(1);
        }
    }
</style>
