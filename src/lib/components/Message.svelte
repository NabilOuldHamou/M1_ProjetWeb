<script lang="ts">
    import * as Card from "$lib/components/ui/card";

    export let username;
    export let messageContent;
</script>

<Card.Root>
    <Card.Header>
      <Card.Title>{username}</Card.Title>
    </Card.Header>
    <Card.Content>
      {messageContent}
    </Card.Content>
</Card.Root>