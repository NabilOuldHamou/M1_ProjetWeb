<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { formatDistanceToNow } from "$lib/utils/date.js";
  import { onMount } from "svelte";
  import ProfileInfo from "$lib/components/ui/ProfileInfo.svelte"; // Importer le composant ProfileInfo

  export let myMessage: boolean; // Si c'est le message de l'utilisateur courant

  export let user = null; // Infos utilisateur
  export let messageContent = ""; // Contenu du message
  export let createdAt = new Date(); // Date de création du message

  let defaultProfilePicture = "/images/default-profile.png";
  let showProfileInfo = false; // Contrôle la visibilité des informations de profil

  // Temps écoulé (calculé périodiquement)
  let timeElapsed: string;

  // Fonction pour mettre à jour le temps écoulé
  const updateElapsed = () => {
    timeElapsed = formatDistanceToNow(createdAt);
  };

  // Initialisation de l'intervalle
  onMount(() => {
    updateElapsed(); // Calcul initial
    const interval = setInterval(updateElapsed, 1000); // Mise à jour toutes les secondes

    return () => {
      clearInterval(interval); // Nettoyage lors du démontage
    };
  });
</script>

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
        on:mouseenter={() => (showProfileInfo = true)}
        on:mouseleave={() => (showProfileInfo = false)}
      >
        <!-- Image de profil -->
        <img
          src={user.profilePicture ? `http://localhost:5173/${user.profilePicture}` : defaultProfilePicture}
          alt="Profile Picture"
          class="h-10 w-10 rounded-full border border-gray-300"
        />

        <!-- Infos du profil (affichées au survol) -->
        <ProfileInfo user={user} show={showProfileInfo} position={myMessage ? "right" : "left"} />
      </div>

      <div class="flex flex-col text-right {myMessage ? 'text-right' : 'text-left'}">
        <Card.Title
          class="text-gray-800 text-sm sm:text-base md:text-lg truncate {myMessage ? 'font-black' : ''}"
        >
          {myMessage ? "(Moi)" : ""} {user.username}
        </Card.Title>
      </div>
    </div>
  </Card.Header>

  <!-- Contenu du message -->
  <Card.Content class="text-sm sm:text-base md:text-lg text-gray-700">
    <p>{messageContent}</p>
  </Card.Content>
</Card.Root>

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
