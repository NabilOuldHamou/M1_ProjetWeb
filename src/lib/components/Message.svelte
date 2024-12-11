<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { formatDistanceToNow } from "$lib/utils/date.js";
  import { onMount } from "svelte";
  import ProfileInfo from "$lib/components/ui/ProfileInfo.svelte"; // Importer le composant ProfileInfo

  export let myMessage: boolean; // Si c'est le message de l'utilisateur courant

  export let message = null; // Contenu du message

  export let setActiveProfile;
  export let activeProfileId = null;

  // Temps écoulé (calculé périodiquement)
  let timeElapsed: string;

  // Fonction pour mettre à jour le temps écoulé
  const updateElapsed = () => {
    timeElapsed = formatDistanceToNow(message.createdAt);
  };

  let user = null;

  async function fetchUser() {
    const res = await fetch(`/api/users/${message.user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    console.log(data)
    user = data;
  }

  // Initialisation de l'intervalle
  onMount(async () => {
    updateElapsed(); // Calcul initial
    const interval = setInterval(updateElapsed, 1000); // Mise à jour toutes les secondes

    await fetchUser();

    return () => {
      clearInterval(interval); // Nettoyage lors du démontage
    };
  });

  function toggleProfileInfo() {
    if (activeProfileId === message.id) {
      // Si le profil cliqué est déjà actif, le fermer
      setActiveProfile(null);
    } else {
      // Sinon, afficher ce profil et masquer les autres
      setActiveProfile(message.id);
    }
  }



</script>

{#if user !== null}

  <Card.Root class="relative">
    <Card.Header
      class="flex items-center justify-between {myMessage ? 'flex-row' : 'flex-row-reverse'}"
    >
      <!-- Conteneur pour la date -->
      <span class="text-xs sm:text-sm md:text-base text-gray-500 items-top">
      {timeElapsed}
    </span>

      <!-- Conteneur pour l'image et le nom d'utilisateur -->
      <div class="flex items-center gap-3 {myMessage ? 'flex-row-reverse' : 'flex-row'}">
        <div
          class="relative"
          on:click={toggleProfileInfo}
        >
          <!-- Image de profil -->
          <img
            src={`http://localhost:5173/${user.profilePicture}`}
            alt="Profile Picture"
            class="h-10 w-10 rounded-full border border-gray-300 cursor-pointer"
          />

          <!-- Infos du profil (affichées au survol) -->
          <ProfileInfo user={user} show={activeProfileId === message.id} position={myMessage} />
        </div>

        <div class="flex flex-col text-right {myMessage ? 'text-right' : 'text-left'}">
          <Card.Title
            class="text-gray-800 text-sm sm:text-base md:text-lg truncate {myMessage ? 'font-bold' : ''}"
          >
            {myMessage ? "(Moi)" : ""} {user.username}
          </Card.Title>
        </div>
      </div>
    </Card.Header>

    <!-- Contenu du message -->
    <Card.Content class="text-sm sm:text-base md:text-lg text-gray-700">
      <p>{message.text}</p>
    </Card.Content>
  </Card.Root>


{/if}
<style>
  img {
    object-fit: cover; /* Assure un bon rendu des images */
  }

  .flex-row-reverse {
    flex-direction: row-reverse;
  }

  .text-right {
    text-align: right;
  }

  .text-left {
    text-align: left;
  }
</style>
