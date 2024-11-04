// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from '@primevue/themes/aura'

export default defineNuxtConfig({
  tailwindcss: {
    cssPath: '~/assets/tailwind.css',
  },
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@primevue/nuxt-module',
    '@nuxt/image'
  ],
  primevue: {
    options: {
        theme: {
            preset: Aura
        }
    }
}
})