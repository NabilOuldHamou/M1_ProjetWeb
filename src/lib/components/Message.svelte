<script lang="ts">
  import { formatDistanceToNow } from '$lib/utils/date.js';
  import { onMount } from "svelte";
  import ProfileInfo from "$lib/components/ui/ProfileInfo.svelte"; // Importer le composant ProfileInfo
  import { imageUrl } from '$lib/utils/imageUrl';
  import type { Message as MsgType } from '$lib/stores/messagesStore';

  export type User = { id: string; username?: string; profilePicture?: string; [k:string]: unknown };

  export let userId: string; // Si c'est le message de l'utilisateur courant

  export let message: MsgType | null = null; // Contenu du message

  export let setActiveProfile: (id: string | null) => void;
  export let activeProfileId: string | null = null;

  let user: User | null = null;

  let myMessage: boolean = false;

  let imgSrc: string = '/profile-default.svg';

  async function fetchUser() {
    const res = await fetch(`/api/users/${message?.user.id}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    user = await res.json();

    // une fois l'utilisateur chargé, résoudre l'URL de l'image sans provoquer 404
    await resolveImageSrc(user.profilePicture);
  }

  async function checkImageExists(url: string): Promise<boolean> {
    try {
      // Utiliser HEAD pour ne pas télécharger la ressource
      const resp = await fetch(url, { method: 'HEAD' });
      return resp.ok;
    } catch {
      // échec possible à cause du CORS ou du DNS ; retourner false pour tomber sur le fallback
      return false;
    }
  }

  async function resolveImageSrc(path?: string | null) {
    const candidate = imageUrl(path);

    // debug
    console.debug('[Message] resolveImageSrc candidate:', candidate);

    // Si en DEV et candidate est un chemin relatif, faire HEAD pour vérifier
    try {
      const exists = await checkImageExists(candidate);
      console.debug('[Message] checkImageExists ->', exists, candidate);
      imgSrc = exists ? candidate : imageUrl(null);
    } catch {
      imgSrc = imageUrl(null);
    }
  }

  function toggleProfileInfo() {
    if (activeProfileId === message.id) {
      setActiveProfile(null);
    } else {
      setActiveProfile(message.id);
    }
  }

  // Fallback handler pour les images manquantes
  function handleImgError(e: Event) {
    const target = e.target as HTMLImageElement | null;
    if (target) target.src = imageUrl(null);
  }

  let timeElapsed: string;

  const updateElapsed = () => {
    timeElapsed = formatDistanceToNow(message.createdAt);
  };

  onMount(() => {
    fetchUser();
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    myMessage = message.user.id === userId;
    return () => clearInterval(interval);
  });

</script>

{#if user !== null}

  <div class="relative">
    <div class="flex items-center justify-between {myMessage ? 'flex-row' : 'flex-row-reverse'}">
      <span class="text-xs sm:text-sm md:text-base text-gray-500 items-top">{timeElapsed}</span>

      <div class="flex items-center gap-3 {myMessage ? 'flex-row-reverse' : 'flex-row'}">
        <div class="relative" on:click={toggleProfileInfo} role="button" tabindex="0" on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProfileInfo(); } }}>
          <img
            src={imgSrc}
            alt={`${user?.username ?? 'Profil'} image`}
            class="h-10 w-10 rounded-full border border-gray-300 cursor-pointer"
            on:error={handleImgError}
          />

          <ProfileInfo user={user} show={activeProfileId === message.id} position={myMessage} />
        </div>

        <div class="flex flex-col text-right {myMessage ? 'text-right' : 'text-left'}">
          <div class="text-gray-800 text-sm sm:text-base md:text-lg truncate {myMessage ? 'font-bold' : ''}">
            {myMessage ? "(Moi)" : ""} {user.username}
          </div>
        </div>
      </div>
    </div>

    <div class="text-sm sm:text-base md:text-lg text-gray-700">
      <p>{message.text}</p>
    </div>
  </div>

{/if}

<style>
  img {
    object-fit: cover; /* Assure un bon rendu des images */
  }

  .text-right {
    text-align: right;
  }
</style>
