# Random Coffee Cards

> **Offline-first PWA. No account. No server.**

PWA для проведения структурированных парных диалогов. Два участника на отдельных устройствах видят одну и ту же последовательность вопросов, читают их по очереди вслух и отвечают. Роли (читающий/отвечающий) чередуются после каждого вопроса.

Все данные — сессии, настройки, кастомные колоды — хранятся только в `localStorage` браузера на устройстве пользователя. Никаких аккаунтов, бэкенда, аналитики и cookies. После первой загрузки приложение работает полностью офлайн.

## Технологии

- Vue 3 (Composition API, `<script setup>`)
- Vite 5
- Tailwind CSS 3 (`darkMode: 'class'`)
- Vue Router 4
- vite-plugin-pwa (Service Worker, install prompt, `registerType: 'prompt'`)
- Vitest (142 теста)
- localStorage (единственное хранилище данных пользователя)

## Документация

- [`docs/SPEC.md`](docs/SPEC.md) — полная техническая спецификация (включая раздел «Privacy model»)
- [`CHANGELOG.md`](CHANGELOG.md) — история версий (Keep a Changelog, русский)
- [`AGENTS.md`](AGENTS.md) — гайдлайны для AI-агентов, работающих с кодом
- Каталог колод: [r3code/random-coffee-decks](https://github.com/r3code/random-coffee-decks) — отдельный репозиторий с JSON-колодами

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
npm test           # 142 теста, однократно
npm run test:watch # watch-режим
```

Покрытие: `useDeck.js` (migrate, parseShareUrl, prev/next/skip, nextTurn, isJumpedTurn,
isNextOpened, sessions history, pruneSessions, exportSession, importState, custom decks,
catalog) + `decks.js` (PRNG, generateOrder, валидность колод).

## Деплой на GitHub Pages

Конфигурация **автоматически** определяет имя репо через переменную окружения
`GITHUB_REPOSITORY`, которую GitHub Actions выставляет в CI. Никаких ручных правок
`vite.config.js` не требуется.

1. Создайте репозиторий любого имени (например `random-coffee`) и пушьте код.
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
│   └── SPEC.md               # полная техническая спецификация (вкл. Privacy model)
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── InstallPrompt.vue     # кнопка "Установить" (beforeinstallprompt + iOS)
│   │   └── OnboardingScreen.vue  # онбординг-экран при первом заходе (v5.15)
│   ├── composables/useDeck.js    # singleton state, sessions, migrate, import/export, catalog
│   ├── data/decks.js             # 2 встроенные колоды (deep, work), 10 порядков A..J
│   ├── router/index.js           # routes + nav guard
│   ├── views/
│   │   ├── SetupView.vue         # главный экран + история сессий + каталог колод + форма
│   │   └── GameView.vue          # карточка вопроса + кнопки + footer навигация
│   ├── App.vue                   # <router-view/> + InstallPrompt + SW баннеры
│   ├── main.js
│   └── style.css
├── tests/useDeck.test.js         # 142 теста
├── AGENTS.md                     # гайдлайны для AI-агентов
├── CHANGELOG.md                  # история версий
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js                # auto-detect base, VitePWA, workbox runtimeCaching
└── .gitignore
```

## Возможности

- **Каталог колод** — 2 встроенные (Глубокие мысли / Про работу) + каталог с GitHub Pages ([r3code/random-coffee-decks](https://github.com/r3code/random-coffee-decks)): пары, первое свидание, друзья, семья, детство, самопознание и др.
- **Кастомные колоды** — импорт из файла или URL, хранение в `localStorage` (до 20). 7 категорий с монохромными Unicode-иконками (❤☕∞⌂⚒◉✺).
- **Синхронизация** между устройствами через QR-код share-ссылки (с инверсией роли партнёра). Поддержка параметра `&turn=N` для mid-session sync.
- **Прогрессивные шаги формы** — progressive disclosure: выбор колоды → порядок → роль.
- **Логика ролей** — читающий видит карточку и жмёт «Партнёр ответил», отвечающий не видит карточку и жмёт «Я ответил». Skip = пропуск всего раунда (+2).
- **История сессий** — до 20 сессий с переключением, экспортом, удалением, «↻ Снова».
- **Онбординг-экран** — при первом заходе: как это работает + privacy-блок (v5.15).
- **Темы** — реально светлая (`bg-stone-50`), тёмная (фиолетовый градиент), авто (по системной `prefers-color-scheme`). Default — тёмная.
- **Privacy-маркеры** — `🔒 Локально` в footer + `ℹ️ О приложении` (повторный показ онбординга).
- **PWA** — устанавливается на домашний экран (Chrome/Edge) / инструкция для iOS Safari. Полная оффлайн-работа после первой загрузки.
- **Кэш-стратегия** — `NetworkFirst` для HTML (3 сек, 5 entries, 7 дней) + `StaleWhileRevalidate` для ассетов (60 entries, 30 дней). Без авто-перезагрузки в середине сессии.
- **UI уведомления об обновлении PWA** — баннер просит обновиться, пользователь решает когда.
- **Анимация переворота карточки** — отключаемая при `prefers-reduced-motion`.
- **Keyboard-навигация** в GameView (←, →, Enter, S).
- **Тактильная отдача** на Android (`navigator.vibrate`). На iOS недоступна.

## Приватность

- Все данные пользователя (сессии, кастомные колоды, настройки темы, флаг онбординга) хранятся **только в `localStorage` браузера** на устройстве.
- **Единственный сетевой запрос** — fetch каталога колод с GitHub Pages (`https://r3code.github.io/random-coffee-decks/index.json`). Кэшируется на 24 часа. Без этого запроса доступны 2 встроенные колоды.
- **Нет аналитики, нет cookies, нет трекеров, нет аккаунтов.**
- Удалить данные: через DevTools браузера → Application → Local Storage → удалить ключи `coffee_*`, `theme_preference`, `catalog_cache`.

Полное описание — в [`docs/SPEC.md`](docs/SPEC.md), раздел «Privacy model».

## Лицензия

MIT
