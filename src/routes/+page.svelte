<script lang="ts">
  import Alert from "$lib/components/ui/Alert.svelte";
  import { Label } from "$lib/components/ui/label";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Card from "$lib/components/ui/card";
  import { enhance } from '$app/forms';
  import * as Tabs from "$lib/components/ui/tabs";
  let { data, form } = $props();
  import { writable } from 'svelte/store';

  const showAlert = writable(false);
  const alertMessage = writable("");

  $effect(() => {
    // Manipuler l'état via les stores, ce qui est plus réactif
    if (form?.error) {
      alertMessage.set(form.error);
      showAlert.set(true);
    } else {
      showAlert.set(false);
    }
  });


  let random = Math.trunc(Math.random() * 10);

</script>

<div class="w-full h-full flex justify-center items-center">

  <Tabs.Root value="login" class="w-[450px]">
    <Tabs.List class="grid w-full grid-cols-2">
      <Tabs.Trigger value="login">Se connecter</Tabs.Trigger>
      <Tabs.Trigger value="register">S'inscrire</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="login">
      <Card.Root>
        <Card.Header>
          {#if random > 8}
            <Card.Title>🌳 - Arabes</Card.Title>
          {:else}
            <Card.Title>🌳 - Arbres</Card.Title>
          {/if}
          <Card.Description>Connectez vous pour chatter!</Card.Description>
        </Card.Header>
        <form method="POST" action="?/login" use:enhance>
          <Card.Content>
            <div class="grid w-full max-w-sm items-center gap-1.5">
              <Label for="email">Adresse email</Label>
              <Input type="text" name="email" id="email" />
            </div>
            <div class="pt-4 grid w-full max-w-sm items-center gap-1.5">
              <Label for="password">Mot de passe</Label>
              <Input type="password" name="password" id="password" />
            </div>
          </Card.Content>
          <Card.Footer>
            <Button type="submit">Se connecter</Button>
          </Card.Footer>
        </form>
      </Card.Root>
    </Tabs.Content>

    <Tabs.Content value="register">
      <Card.Root>
        <Card.Header>
          {#if random > 8}
            <Card.Title>🌳 - Arabes</Card.Title>
          {:else}
            <Card.Title>🌳 - Arbres</Card.Title>
          {/if}
          <Card.Description>Inscrivez-vous pour chatter!</Card.Description>
        </Card.Header>
        <form method="POST" action="?/register" use:enhance>
          <Card.Content>
            <div class="grid w-full max-w-sm items-center gap-1.5">
              <Label for="username">Nom d'utilisateur</Label>
              <Input type="text" name="username" id="username" />
            </div>
            <div class="pt-4 grid w-full max-w-sm items-center gap-1.5">
              <Label for="email">Adresse email</Label>
              <Input type="text" name="email" id="email" />
            </div>
            <div class="pt-4 grid w-full max-w-sm items-center gap-1.5">
              <Label for="password">Mot de passe</Label>
              <Input type="password" name="password" id="password" />
            </div>
          </Card.Content>
          <Card.Footer>
            <Button type="submit">S'inscrire</Button>
          </Card.Footer>
        </form>
      </Card.Root>
    </Tabs.Content>

  </Tabs.Root>
</div>

<Alert message={$alertMessage} show={$showAlert} onClose={() => ($showAlert = false)} />