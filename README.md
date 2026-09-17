# Random Coffee Cards

PWA для проведения структурированных парных диалогов. Два участника на отдельных устройствах видят одну и ту же последовательность вопросов, читают их по очереди вслух и отвечают. Роли (читающий/слушающий) чередуются после каждого вопроса.

## Технологии

- Vue 3 (Composition API, `<script setup>`)
- Vite 5
- Tailwind CSS 3
- Vue Router 4
- vite-plugin-pwa
- Vitest (48 тестов)
- localStorage (единственное хранилище)

## Локальный запуск

```bash
npm install
npm run dev        # http://localhost:5173
```

## Сборка

```bash
NODE_ENV=production npm run build
npm run preview    # предпросмотр продакшен-сборки
```

## Тесты

```bash
npm test           # однократно
npm run test:watch # watch-режим
```

Покрытие: `useDeck.js` (migrate, parseShareUrl, prev/next/skip, importState, singleton state, theme) + `decks.js` (PRNG, generateOrder, валидность колод).

## Деплой на GitHub Pages

Конфигурация **автоматически** определяет имя репо через переменную окружения `GITHUB_REPOSITORY`, которую GitHub Actions выставляет в CI. Никаких ручных правок `vite.config.js` не требуется.

1. Создайте репозиторий любого имени (например `random-coffee`) и запушьте код.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**
3. Запуште в `main` — workflow `.github/workflows/deploy-pages.yml` автоматически соберёт и опубликует.
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
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
├── src/
│   ├── composables/useDeck.js  # singleton state, migrate, import/export
│   ├── data/decks.js           # 2 колоды, 10 порядков A..J
│   ├── router/index.js         # routes + nav guard
│   ├── views/
│   │   ├── SetupView.vue       # выбор колоды/порядка/роли + QR
│   │   └── GameView.vue        # карточка вопроса + кнопки
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── tests/useDeck.test.js       # 48 тестов
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── .gitignore
```

## Возможности

- Выбор из 2 колод (Глубокие мысли / Про работу) и 10 порядков (A..J)
- Синхронизация между устройствами через QR-код share-ссылки
- Чередование ролей reader/listener после каждого вопроса
- Сохранение прогресса в localStorage (с версионированием схемы)
- Продолжение прерванной сессии
- Экспорт/импорт состояния в JSON
- Светлая/тёмная/авто тема с подпиской на системную
- Анимация переворота карточки, отключаемая при `prefers-reduced-motion`
- Кнопка «Предыдущий» с пометкой «пропущен ранее»
- Keyboard-навигация в GameView (←, →, Enter, S)
- Тактильная отдача на Android (на iOS недоступна — Web Vibration API не реализован)
- Полная оффлайн-работа после установки PWA

## Лицензия

MIT
