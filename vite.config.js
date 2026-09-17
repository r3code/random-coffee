import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

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

// ─── Версия приложения и git-коммит ────────────────────────────────
// Читаем version из package.json и определяем git commit hash + date.
// В GitHub Actions используем GITHUB_SHA (гарантированно есть).
// Локально — через git rev-parse / git show.
// Fallback: если git недоступен — пустые строки (UI покажет только версию).
function readPackageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function gitCommitHash() {
  try {
    // В GitHub Actions используем GITHUB_SHA — это коммит, который собирается.
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.substring(0, 7)
    // Локально — через git rev-parse HEAD
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return ''
  }
}

function gitCommitDate() {
  try {
    // Локально — через git show
    const iso = execSync('git show -s --format=%cI HEAD').toString().trim()
    return iso
  } catch {
    return ''
  }
}

const APP_VERSION = readPackageVersion()
const COMMIT_HASH = gitCommitHash()
const COMMIT_DATE = gitCommitDate()

// Для логирования в CI (помогает при отладке)
if (process.env.NODE_ENV === 'production') {
  console.log(`[vite.config] base = "${base}", repoName = "${repoName}"`)
  console.log(`[vite.config] version = ${APP_VERSION}, commit = ${COMMIT_HASH || 'n/a'}, date = ${COMMIT_DATE || 'n/a'}`)
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __COMMIT_HASH__: JSON.stringify(COMMIT_HASH),
    __COMMIT_DATE__: JSON.stringify(COMMIT_DATE)
  },
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
        start_url: base,
        scope: base,
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
