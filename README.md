# Random Coffee Cards

PWA для проведения структурированных парных диалогов. Два участника на отдельных устройствах видят одну и ту же последовательность вопросов, читают их по очереди вслух и отвечают. Роли (читающий/отвечающий) чередуются после каждого вопроса.

## Технологии

- Vue 3 (Composition API, `<script setup>`)
- Vite 5
- Tailwind CSS 3
- Vue Router 4
- vite-plugin-pwa (Service Worker, install prompt)
- Vitest (92 теста)
- localStorage (единственное хранилище)

## Документация

- [`docs/SPEC.md`](docs/SPEC.md) — полная техническая спецификация (1700+ строк)
- [`CHANGELOG.md`](CHANGELOG.md) — история версий (Keep a Changelog, русский)
- [`AGENTS.md`](AGENTS.md) — гайдлайны для AI-агентов, работающих с кодом

## Локальный запуск

```bash
npm install
npm run dev        # http://localhost:5173
```

## Сборка

```bash
NODE_ENV=production npm run build
npm run preview    # предпросмотр продакшен-сборки на http://localhost:4173
```

## Тесты

```bash
npm test           # 92 теста, однократно
npm run test:watch # watch-режим
```

Покрытие: `useDeck.js` (migrate, parseShareUrl, prev/next/skip, nextTurn, isJumpedTurn,
isNextOpened, sessions history, pruneSessions, exportSession, importState) + `decks.js`
(PRNG, generateOrder, валидность колод).

## Деплой на GitHub Pages

Конфигурация **автоматически** определяет имя репо через переменную окружения
`GITHUB_REPOSITORY`, которую GitHub Actions выставляет в CI. Никаких ручных правок
`vite.config.js` не требуется.

1. Создайте репозиторий любого имени (например `random-coffee`) и запушьте код.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**
3. Запуште в `main` — workflow `.github/workflows/deploy-pages.yml` автоматически соберёт
   и опубликует.
4. Откройте `https://<user>.github.io/<repo-name>/` — установите как PWA.

**Как это работает:**

| Окружение | `GITHUB_REPOSITORY` | `base` |
|-----------|---------------------|--------|
| Локально (`npm run dev` или `npm run build`) | отсутствует | `/` |
| GitHub Actions, репо `random-coffee` | `r3code/random-coffee` | `/random-coffee/` |
| GitHub Actions, репо `<user>.github.io` | `<user>/<user>.github.io` | `/` (авто-пропуск) |

**Ручное переопределение** — если автоопределение не работает (например, кастомный домен):

```bash
REPO_NAME=my-custom-app NODE_ENV=production npm run build
```

или для корневого домена:

```bash
REPO_NAME= NODE_ENV=production npm run build   # base = "/"
```

## Структура проекта

```
random-coffee/
├── .github/workflows/
│   ├── ci.yml               # CI: npm ci + test + build
│   └── deploy-pages.yml      # Деплой на GitHub Pages
├── docs/
│   └── SPEC.md               # полная техническая спецификация
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png
│   └── favicon.ico
├── src/
│   ├── components/
│   │   └── InstallPrompt.vue # кнопка "Установить" (beforeinstallprompt + iOS)
│   ├── composables/useDeck.js  # singleton state, sessions, migrate, import/export
│   ├── data/decks.js           # 2 колоды, 10 порядков A..J
│   ├── router/index.js         # routes + nav guard
│   ├── views/
│   │   ├── SetupView.vue       # главный экран + история сессий + форма новой
│   │   └── GameView.vue        # карточка вопроса + кнопки + footer навигация
│   ├── App.vue                 # <router-view/> + InstallPrompt + SW баннеры
│   ├── main.js
│   └── style.css
├── tests/useDeck.test.js       # 92 теста
├── AGENTS.md                   # гайдлайны для AI-агентов
├── CHANGELOG.md                # история версий
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js              # auto-detect base, VitePWA, workbox runtimeCaching
└── .gitignore
```

## Возможности

- Выбор из 2 колод (Глубокие мысли / Про работу) и 10 порядков (A..J)
- Синхронизация между устройствами через QR-код share-ссылки (с инверсией роли партнёра)
- Новая логика ролей: читающий видит карточку и жмёт «Партнёр ответил», отвечающий
  не видит карточку и жмёт «Я ответил». Skip = пропуск всего раунда (+2).
- История сессий (до 20) с переключением, экспортом, удалением, «↻ Снова»
- Сохранение прогресса в localStorage (с версионированием схемы)
- Светлая/тёмная/авто тема с подпиской на системную
- Кнопка «Установить приложение» (Chrome/Edge) / инструкция (iOS Safari)
- Кэш-стратегия: `NetworkFirst` для HTML (3 сек) + `StaleWhileRevalidate` для ассетов
- UI уведомления об обновлении PWA (без авто-перезагрузки в середине сессии)
- Анимация переворота карточки, отключаемая при `prefers-reduced-motion`
- Keyboard-навигация в GameView (←, →, Enter, S)
- Тактильная отдача на Android (на iOS недоступна)
- Полная оффлайн-работа после установки PWA

## Лицензия

MIT
