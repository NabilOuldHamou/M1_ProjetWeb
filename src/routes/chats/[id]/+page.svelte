<script lang="ts">
	import Textarea from "../../../lib/components/ui/textarea/textarea.svelte";
    import { Button } from "$lib/components/ui/button";
    import PaperPlane from "svelte-radix/PaperPlane.svelte";
	import Message from "$lib/components/Message.svelte";
</script>

<div class="h-full">
    <div class="px-10 flex flex-col gap-5 h-[90%]">
        <Message username="Yanax" messageContent="Salut les amis" />
        <Message username="Luxray" messageContent="Salut Yanax" />
    </div>
    <div class="fixed bottom-5 px-10 w-full flex gap-2">
        <Textarea class="h-20 resize-none" placeholder="Messsage..." />
        <Button size="icon" class="h-20 w-20">
            <PaperPlane class="h-18 w-18" />
          </Button>
    </div>
</div>