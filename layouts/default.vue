<template>
  <div>
    <nav class="h-16 shadow flex items-center px-10">
      <a class="pr-40" href="/">Logo</a>
      <div class="flex justify-between w-full items-center">
        <ul class="flex gap-6">
          <li>Nos solutions</li>
          <li>Prix</li>
        </ul>
        <div class="flex gap-6">
          <Button label="Connexion" severity="secondary" />
          <Button label="S'Inscrire" />
        </div>
      </div>
    </nav>
    <slot />
  </div>
</template>