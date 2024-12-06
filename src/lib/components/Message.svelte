<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { formatDistanceToNow } from "$lib/utils/date.js";
  import { onMount, onDestroy } from "svelte";

  export let username: string;
  export let messageContent: string;
  export let profilePicture: string | null; // Peut être null
  export let createdAt: string; // Date de création du message

  let defaultProfilePicture = "/images/default-profile.png";

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
  <Card.Header class="flex items-center flex-row justify-between">
    <!-- Image de profil collée à gauche -->
    <div class="flex flex-row gap-3 items-center">
      <img
        src={profilePicture || defaultProfilePicture}
        alt="Profile Picture"
        class="h-10 w-10 rounded-full border border-gray-300"
      />
      <!-- Section contenant le pseudo -->
      <div class="flex flex-col">
        <Card.Title class="text-gray-800 text-sm sm:text-base md:text-lg truncate">
          {username}
        </Card.Title>
      </div>
    </div>
    <!-- Temps depuis la création -->
    <span class="text-xs sm:text-sm md:text-base text-gray-500 items-top">
      {timeElapsed}
    </span>
  </Card.Header>

  <!-- Contenu du message -->
  <Card.Content>
    <p class="text-sm sm:text-base md:text-lg text-gray-700">
      {messageContent}
    </p>
  </Card.Content>
</Card.Root>

<style>
  img {
    object-fit: cover; /* Assure un bon rendu des images */
  }
</style>
