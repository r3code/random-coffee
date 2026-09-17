import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

const repoName = 'random-coffee'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Random Coffee Cards',
        short_name: 'Coffee Cards',
        description: 'Карточки вопросов для глубоких бесед',
        theme_color: '#4f46e5',
        background_color: '#1e1b4b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: `/${repoName}/`,
        scope: `/${repoName}/`,
        icons: [
          { src: `/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true
  }
})
