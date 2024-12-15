<script lang="ts">
	export let user;
</script>

<div class="flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-100 rounded-lg border border-gray-300 shadow-sm">
	<img
		src={`http://localhost:5173/${user.profilePicture}`}
		alt="Profile"
		class="h-12 w-12 rounded-full border border-gray-300"
	/>
	<div class="flex flex-col">
		<span class="font-medium text-gray-800">{user.username}</span>
		<div class="flex items-center gap-1">
			<span class="text-xs text-gray-500">{user.state}</span>
			{#if user.state === "En ligne"}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3 w-3 text-green-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6v6m0 0v6m0-6h6m-6 0H6"
					/>
				</svg>
			{:else if status === "Ecrit"}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3 w-3 text-blue-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6v6m0 0v6m0-6h6m-6 0H6"
					/>
				</svg>
			{/if}
		</div>
	</div>
</div>

<style>
    /* Ajout d'une animation subtile lors du survol */
    div:hover {
        background-color: #f3f4f6;
        transition: background-color 0.2s ease-in-out;
    }
</style>
