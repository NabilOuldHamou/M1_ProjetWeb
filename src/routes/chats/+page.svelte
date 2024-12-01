<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import Plus from "svelte-radix/Plus.svelte"; // Icône pour "Ajouter"
	import Search from "$lib/components/ui/Search.svelte";
	import ChatItem from "$lib/components/ui/ChatItem.svelte";
</script>

<div class="h-full flex flex-col gap-5 p-5">
	<div class="flex justify-between items-center">
		<div class="flex items-center gap-2 w-full mr-10">
			<div class="relative w-full">
				<Search class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
			</div>
		</div>
		<Button size="default" class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white">
			<Plus class="h-5 w-5" />
			Nouveau Chat
		</Button>
	</div>

	<div class="flex flex-col gap-4 overflow-y-auto">
		<ChatItem title="Discussion avec Yanax" lastMessage="Salut les amis !" time="12:34" />
		<ChatItem title="Discussion avec Luxray" lastMessage="Salut Yanax" time="12:30" />
	</div>
</div>

<style>
	.h-full {
		height: 100%;
		background-color: #f9f9f9;
	}
</style>