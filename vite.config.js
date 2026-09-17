import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// ─── Автоопределение base для GitHub Pages ────────────────────────
// GitHub Actions всегда экспортирует GITHUB_REPOSITORY как "owner/repo".
// Локально этой переменной нет → base = '/' (dev-сервер работает как обычно).
// В CI → base = "/<repo-name>/" (правильно для https://<user>.github.io/<repo>/).
//
// Если репо называется <user>.github.io (персональный домен), GITHUB_REPOSITORY
// вернёт "<user>/<user>.github.io" — auto-detect это пропускает, и тогда base = '/'.
//
// Альтернативно — задать имя репо вручную через env:
//   REPO_NAME=random-coffee-app npm run build
const envRepoName = process.env.REPO_NAME
const ghRepoName = process.env.GITHUB_REPOSITORY?.split('/')?.[1] || ''
const repoName = envRepoName ?? (ghRepoName && !ghRepoName.endsWith('.github.io') ? ghRepoName : '')
// base:
//   - в dev (NODE_ENV !== 'production'): всегда '/' — локальный сервер Vite
//   - в production с repoName: "/<repo>/"  — GitHub Pages для поддомена репо
//   - в production без repoName: '/'        — корневой домен (<user>.github.io) или другой статик-хостинг
const base = process.env.NODE_ENV === 'production' && repoName
  ? `/${repoName}/`
  : '/'

// Для логирования в CI (помогает при отладке)
if (process.env.NODE_ENV === 'production') {
  console.log(`[vite.config] base = "${base}", repoName = "${repoName}"`)
}

export default defineConfig({
  base,
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
        // start_url и scope наследуются от base, можно явно не задавать —
        // vite-plugin-pwa автоматически подставит base если их опустить.
        // Но для надёжности укажем явно через import.meta.env.BASE_URL не получится
        // (это доступно только внутри кода, не в config), поэтому берём base из замыкания.
        start_url: base,
        scope: base,
        // Иконки — относительные пути, разрешаются относительно scope.
        icons: [
          { src: 'icon-192.png',         sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png',         sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
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
