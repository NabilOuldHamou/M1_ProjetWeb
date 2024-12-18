<script lang="ts">
	export let user;

	export let openProfileCard = () => {};
</script>

<div
	class="flex items-center gap-4 justify-between p-3 cursor-pointer hover:bg-gray-100 rounded-lg border border-gray-300 shadow-sm"
	on:click={openProfileCard}
>
	<div class="flex items-center gap-4">
		<img
			src={`https://arbres.oxyjen.io/${user.profilePicture}`}
			alt="Profile"
			class="h-12 w-12 rounded-full border border-gray-300"
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
