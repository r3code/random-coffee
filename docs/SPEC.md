# Random Coffee Cards — Техническое задание (v5.11)

**Версия:** 5.11 (актуальная спецификация реализованного продукта)
**Дата ревизии:** 2026-09-26
**Статус:** Approved — соответствует коду в репозитории `r3code/random-coffee`
**Живая страница:** https://r3code.github.io/random-coffee/

---

## Что изменилось в v5.11 (категории колод + 4 новые колоды)

### v5.11.0 — Категории колод + 4 новые встроенные колоды

- **`deckCategory` — категория КОЛОДЫ** (одна на колоду, slug из белого списка). Не путать с `categories` (категории вопросов ВНУТРИ колоды, v5.3). 7 категорий:
  - `couples` — Для пар (`#ec4899` розовый) — установленные пары, благодарность, будущее
  - `first-date` — Знакомство (`#f59e0b` янтарный) — первое свидание, лёгкие, без интимности
  - `friendship` — Дружба (`#10b981` изумрудный) — старая дружба, воспоминания
  - `family` — Семья (`#8b5cf6` фиолетовый) — традиции, история, благодарность
  - `work` — Работа (`#3b82f6` синий) — карьера, цели, выгорание
  - `self` — Самопознание (`#06b6d4` бирюзовый) — рефлексия, ценности, страхи
  - `party` — Группа (`#f43f5e` коралловый) — ледоколы для новой компании (готов для будущих колод)
- **4 новые встроенные колоды**: `couples` (12 вопросов), `first-date` (12), `friends` (12), `family` (12). В каждой — свои `categories` для разметки вопросов внутри (отдельные от `deckCategory`).
- **Размечены старые**: `deep` → `self`, `work` → `work`.
- **Бейджи в карточках** (каталог, выбранная, «Продолжить сессию»): категория — **первый** бейдж в ряду `[Категория] [Тип] [RU]`. Цвет бейджа — цвет категории. Раньше было `[Тип] [RU]` без категории.
- **Бейдж категории в шапке GameView** — рядом с «порядок A • Вопрос N из M». Помогает сохранять mood-рамку сессии. Не заменяет имя колоды (которого в шапке и не было — оно в карточке выбора и в «Продолжить сессию»).
- **Второй ряд чипов-фильтров по категориям** в шапке каталога (под чипами «Все / Мои колоды»). Показывается только когда категорий ≥3 (есть из чего выбирать). Каждая категория — кнопка с цветным кружком и счётчиком. Активная категория кликабельна (повторный клик — сброс). Счётчики учитывают активный поиск (как «Все»/«Мои колоды»).
- **`deckCategoryFilter`** — новый ref (`null | slug`). Применяется в `filteredCatalogDecks` и `filteredRemoteCatalog`.
- **Валидация `deckCategory`** в `validateDeckFormat`: строка, slug из белого списка `deckCategorySlugs`. Пустая строка / не-строка / не из списка — ошибка. Опционально (если нет — `null`, обратно совместимо со старыми колодами).
- **Экспорт**: `deckCategories` и `deckCategorySlugs` экспортируются из `data/decks.js` и из `useDeck()`. `exportDeck` сохраняет `deckCategory` в выгрузке.
- **`normalizeDeck`** прокидывает `deckCategory` (по умолчанию `null`).
- 9 новых тестов (всего 136): новые колоды (12 вопросов), `deckCategory` у встроенных, экспорт `deckCategories`, валидация (5 кейсов: валидный slug, неизвестный, пустой, не-строка, опциональный, сохранение в customDecks).

### v5.10.0 — Счётчики фильтров с учётом поиска, упрощённый набор фильтров

- **Счётчики в фильтрах считают с учётом активного поиска** — раньше показывали полные числа без поиска, что вводило в заблуждение. Например, при поиске «глуб» показывало «Все (4)», хотя найдено всего 2. Теперь счётчики применяют поисковый фильтр к каждой подгруппе:
  - `Все` = (builtin matches search) + (custom matches search) + (remote matches search & not loaded)
  - `Мои колоды` = (builtin matches search) + (custom matches search)
- **Убран фильтр «Встроенные»** — бесполезен, т.к. встроенных всего 2 (`deep`, `work`) и они всегда видны. Раньше добавлял визуальный шум, не давая реальной пользы.
- **Фильтр «Загруженные» переименован в «Мои колоды»** — звучит дружелюбнее, привычно (как «My apps»). Включает и встроенные, и кастомные (всё, что доступно локально).
- **`deckFilter` теперь `'all' | 'mine'`** (раньше `'all' | 'builtin' | 'custom'`).
- **Секция «ЗАГРУЖЕННЫЕ» переименована в «МОИ КОЛОДЫ»** — соответствует фильтру.
- **Секция «ДОСТУПНЫ ДЛЯ ЗАГРУЗКИ» переименована в «КАТАЛОГ»** — короче, понятнее, соответствует ментальной модели «есть на устройстве» vs «можно скачать».
- При фильтре `'mine'` секция «Каталог» скрывается (как раньше при `'builtin'`/`'custom'`).

### v5.9.0 — Карточка колоды + кнопка «Продолжить» = один кликабельный блок

- **Вся карточка колоды стала кнопкой «Продолжить»** — тап в любом месте карточки (имя, бейджи, описание, «N вопросов • порядок X», «Вопрос N из M») вызывает `continueSession`. Раньше кнопка «Продолжить» была отдельно под карточкой.
- **Структура**: жёлтая карточка колоды сверху + зелёная полоса «Продолжить →» снизу — продолжение карточки, явный CTA. Один `<button>` с `@click="continueSession"`.
- **Hover/active feedback**: `hover:scale-[1.01] active:scale-[0.99]` + `focus:ring-2 ring-yellow-400` для keyboard nav.
- **aria-label**: `Продолжить сессию: <имя колоды>, порядок <X>` — для screen readers.
- Кнопка «Новая сессия» осталась отдельно (другое действие, не должно сработать по тапу на карточку).
- QR-блок с иконкой копирования остался под кнопками — там своя интерактивность (копирование ссылки), не должна вызывать continueSession.

### v5.8.0 — Счётчики, полная карточка колоды, единообразие QR, browser back

- **Счётчик «Все» в фильтре** теперь включает и удалённые колоды (каталог), которые ещё не загружены. Раньше показывал только локальные (`builtin + custom`), что вводило в заблуждение — было видно «Все (2)» при куче доступных для загрузки. Теперь `Все = builtin + custom + remote_count`.
- **Счётчик в заголовке секции «Доступны для загрузки (N)»** — видно, сколько удалённых колод в каталоге. Обновляется реактивно с `filteredRemoteCatalog.length`.
- **Кнопка «↻ Обновить» стилизована как кнопка** — `border border-white/20 rounded-lg px-3 py-1.5 bg-white/15`. Раньше была просто текстовой ссылкой `text-blue-400 hover:underline` — выглядела не как кнопка. Добавлен `:disabled="catalogLoading"` с `⏳` во время загрузки.
- **Полная карточка колоды после выбора** — компактная плашка заменена на полную карточку (как в каталоге): имя + бейджи + описание + число вопросов + иконки действий для кастомных. Широкая кнопка `✎ Сменить колоду` под карточкой (как кнопка «Загрузить» у удалённых). Удалённая секция «Доступны для загрузки» скрывается после выбора (как и верхний каталог).
- **Карточка колоды на «Продолжить сессию»** — стандартизирована с карточкой выбора колоды. Та же структура: имя + бейджи + описание + `N вопросов • порядок X`. Жёлтый фон как у выбранной.
- **QR на «Продолжить сессию» стандартизирован** с QR на «Новая сессия»: тот же текст инструкции (ℹ️ блок), тот же QR 256×256, та же иконка `⧉` для копирования с feedback `✓` на 2 сек. Раньше QR был 40×40 (другой размер), кнопка `📋` (другая иконка), текст «Покажите партнёру QR-код, чтобы продолжить с того же вопроса» (другой формат).
- **Browser back / swipe-left закрывает форму** — при `enterNewForm` добавляем `history.pushState({coffee_form_open: true})`. `popstate` listener закрывает форму (`showNewForm = false`). `exitNewForm` вызывает `history.back()` чтобы триггерить popstate. Решает проблему: раньше swipe-left на мобиле возвращал на `/game` (предыдущая история), а не закрывал форму.

### v5.7.0 — Progressive disclosure шагов 2/3 + QR с копированием ссылки

- **Progressive disclosure шага 2 (порядок)** — после выбора порядка A..J шаг коллапсируется в компактную плашку: большая буква + подсказка «порядок» + кнопка `✎ Сменить`. Плавный автоскролл к шагу 3 (`step3Ref.scrollIntoView`).
- **Progressive disclosure шага 3 (роль)** — после выбора роли шаг коллапсируется в плашку: иконка (🗣️/👂) + название роли + подсказка + кнопка `✎ Сменить`. Плавный автоскролл к кнопке «Начать сессию» (`startButtonRef.scrollIntoView({ block: 'center' })`).
- **`selectOrder` теперь сбрасывает `selectedRole`** — логическая несогласованность: порядок поменялся, роль «под старый порядок» больше неактуальна. `isRoleExpanded` принудительно true, чтобы пользователь увидел шаг 3.
- **`selectDeck` разворачивает шаги 2 и 3** — при смене колоды все выборы ниже инвалидируются, шаги показываются развёрнутыми.
- **QR-блок — ссылка под QR-кодом + компактная иконка копирования `⧉`** — не везде есть нативный Web Share API, поэтому добавлена иконка рядом со ссылкой. Ссылка показывается простым текстом (без блока с фоном). Текст инструкции: «Покажите партнёру QR-код — он попадёт в ту же сессию. Или отправьте ссылку сообщением. Потом нажмите «Начать сессию».»
- **Визуальный feedback копирования** — `linkCopiedRef` (✓ на 2 сек), с fallback через `document.execCommand('copy')` для старых браузеров.
- Новые refs в `SetupView.vue`: `isOrderExpanded`, `isRoleExpanded`, `step3Ref`, `startButtonRef`, `linkCopiedRef`.
- Новые функции: `expandOrder()`, `expandRole()`, `handleCopyLink()`.

### v5.6.0 — Progressive disclosure выбора колоды

- После выбора колоды каталог коллапсируется в компактную плашку с именем + бейджами + кнопкой `✎ Сменить`.
- Плавный автоскролл к шагу 2 (`step2Ref.scrollIntoView` через `nextTick`).
- `v-show` (а не `v-if`) — состояние поиска/фильтра сохраняется при коллапсе.
- Share URL: каталог коллапсируется мгновенно (без скролла/анимации).
- `enterNewForm`: каталог разворачивается.

### v5.5.0 — Edge cases (откат, активная сессия, валидация)

- **Секция «Доступны для загрузки»** — удалённый каталог не спрятан за кнопкой, показывается сразу под «Загруженными» при фильтре «Все».
- **Авто-загрузка каталога** через `ensureCatalogLoaded()` в `onMounted` + `enterNewForm`.
- **Авто-select загруженной колоды** — `handleLoadFromCatalog` вызывает `selectDeck(result.deck.deckId)` без alert.
- **Кнопка очистки поиска** — ✕ внутри input справа, Esc сбрасывает, hit area ≥ 28×28px.
- **Карточка колоды** — имя на отдельной строке (`line-clamp-2`), бейджи одного размера (`leading-none + border`).
- **`saveCustomDecks()` возвращает bool** — `importDeck`/`deleteDeck`/`renameDeck`/`checkDeckUpdates` откатывают `customDecks.value` при `QuotaExceededError`.
- **`deleteDeck` активной сессии** — warn в confirm + `resetProgress()`.
- **Валидация** — имя не пустое (`trim().length > 0`), вопросы с уникальными `id`.
- **`loadCatalog` применяет дефолт `lang='ru_RU'`** к элементам без `lang`.
- **`checkDeckUpdates` при HTTP 404** — `{ ok: false, notFound: true, error: 'Колода больше недоступна в каталоге...' }`.
- 13 новых тестов (всего 127).

### v5.4.0 — Единый каталог колод (VSCode-like)

- **Единый каталог** — встроенные и загруженные колоды в одном списке с бейджами `[Встроенная]`/`[Загруженная]`.
- **Поиск + чипы-фильтры** `Все / Встроенные / Загруженные` со счётчиками.
- **`sourcePath`** — метаданные происхождения (`'embedded'` / `file.name` / URL-path), хранятся в `customDecks`, не показываются в UI.
- **`catalogDecks` computed** — массив `{ ...deck, kind: 'builtin' | 'custom', sourcePath }`, отсортированный (встроенные → кастомные, по алфавиту имени).
- **`isCustomDeck(deckId)`** helper + **`SOURCE_EMBEDDED`** константа.
- `importDeck(deckData, { sourcePath })`, `loadDeckFromUrl` выводит sourcePath из URL pathname, `exportDeck` сохраняет sourcePath.
- 11 новых тестов (всего 114).

---

## Что изменилось в v5.0 (история)

### v5.0.0 — Управление сессиями (переименование + таймер + статистика)

- **Переименование сессий** — поле `name` в `Session`. В карточке истории — кнопка ✎, inline input под карточкой. Имя ≤128 символов, пустое → null. Если имя есть — показываем его жирным, колода+порядок — мелким шрифтом.
- **Таймер сессии** — в шапке GameView `⏱ MM:SS` (или `H:MM:SS` если больше часа). Пауза при `goBack`, resume при `continueSession` / `openSession`. Накопленное время `elapsedMs` сохраняется в Session, переносится при экспорте/импорте.
- **Статистика на экране завершения** — `Отвечено: X | Пропущено: Y | Время: MM:SS | Начали: DD мес., HH:MM`.
- **Функции `renameSession(id, name)`, `formatDuration(ms)`, `resumeTimer()`, `pauseTimer()`, `getCurrentElapsedMs()`** — в `useDeck` exported API.
- **Session schema v5** — добавлены поля `name` (string|null), `startTime` (ISO), `elapsedMs` (number, мс).
- **Миграция v1→v2** — `startTime` берётся из `old.startTime || old.createdAt || old.updatedAt`.
- 12 новых тестов (всего 104): `renameSession` (5 кейсов), `formatDuration` (4), `startSession`/`loadSession`/`migrateV1ToV2` с новыми полями.

---

## Что изменилось по сравнению с v4.1 (v4.2 → v4.3)

### v4.3.0 — Кэш-стратегия и UI обновлений

- **`NetworkFirst` для HTML** с таймаутом 3 секунды — при наличии интернета браузер спрашивает сервер, есть ли свежий `index.html`. Решает проблему рассинхрона между пользователями.
- **`StaleWhileRevalidate` для ассетов** (JS/CSS/иконки) — быстро из кэша, в фоне проверяем свежую версию.
- **UI уведомления об обновлении** через `useRegisterSW` (`virtual:pwa-register/vue`) — баннер «🔄 Доступна новая версия» с кнопкой «Обновить». `registerType: 'prompt'` — пользователь сам решает, когда перезагрузить.
- **Баннер «✓ Готово к оффлайн»** при первом кэшировании SW.
- Конфигурация в `workbox.runtimeCaching` — expiration rules (HTML — 7 дней/5 записей, ассеты — 30 дней/60 записей).

### v4.2.0 — Установка на главный экран

- **`InstallPrompt.vue`** — кнопка «Установить приложение» для Android/Desktop Chrome (через `beforeinstallprompt`).
- **iOS Safari** — текстовая инструкция «Нажмите Поделиться → На главный экран» (Apple не даёт программно вызвать установку).
- **Не показывается в standalone-режиме** (PWA уже установлено и открыто с иконки).
- **Запоминание отказа** в `localStorage['install_dismissed']`.

---

## Что изменилось по сравнению с v3

### UX кнопок в GameView
- **Основная кнопка отдельной строкой под контентом** — не в одном flex-ряду с навигационными. Не прыгает по высоте при смене карточки на 🤔 и обратно.
- **Footer отдельно** — для навигационных кнопок "← Предыдущий", "⏭️ Пропустить", "Следующий →".
- **"← Предыдущий" с надписью** (раньше была просто стрелка ←).
- **Кнопки разных цветов:** "Партнёр ответил" — жёлтая (`bg-yellow-500`), "Я ответил" — зелёная (`bg-emerald-500`). Пользователь сразу видит по цвету, в каком он режиме.
- **`min-height: 35vh` для main** — фиксирует высоту, основная кнопка всегда на одном уровне.

### Тема в GameView — разные фоны для свет/тёмной
- **Читающий** — `bg-indigo-100` (светлая, пастельный) / `bg-indigo-950` (тёмная, насыщенный)
- **Отвечающий** — `bg-emerald-100` (светлая) / `bg-emerald-950` (тёмная)
- Текст: `text-gray-900` в светлой, `text-white` в тёмной
- Теперь темы реально отличаются (раньше обе были тёмными)

### Навигация по отвеченным/перепрыгнутым ходам
- **Кнопка "Следующий →"** — видна если следующий ход в пределах `maxReachedTurn` (мы туда уже доходили). Использует новое действие `nextTurn()` — переход без модификации `passedIds`/`skippedIds`.
- **`maxReachedTurn`** — новый ref, отслеживает максимальный достигнутый ход в текущей сессии. Сохраняется в localStorage, восстанавливается при перезагрузке.
- **`isJumpedTurn`** — текущий ход был перепрыгнут skip'ом (currentTurn < maxReachedTurn И текущий вопрос не в passed/skipped). На перепрыгнутом ходу: нет основной кнопки, нет "⏭️ Пропустить", только "← Предыдущий" и "Следующий →" + компактный заголовок "⏭️ Этот ход был пропущен".

### Защита от дублей
- `nextQuestion` — не добавляет id в `passedIds`, если уже там (защита от повторного нажатия на уже отвеченном ходе после `prev`).
- `skipQuestion` — не добавляет id в `skippedIds`, если уже там.

### Качество
- **85 тестов Vitest** (+13 новых: nextTurn, isJumpedTurn, isNextOpened, maxReachedTurn).
- Все тесты проходят. Сборка без warnings.

---

## Что изменилось по сравнению с v2

### Геймдизайн
- **Новая логика ролей:** "Читающий" видит карточку и нажимает "Партнёр ответил", "Отвечающий" не видит карточку (только 🤔 + подсказку) и нажимает "Я ответил".
- **Skip = пропуск всего раунда (+2 к currentTurn):** если читающий пропустил вопрос, партнёр не услышал его — отвечать нечего, переходим к следующему "читающему" ходу.
- **Тексты на "ты" форму** вместо казённого "вы".
- **Названия ролей:** "Я читаю первым" / "Я слушаю первым" вместо "Начну с чтения" / "Начну со слушания".

### UX
- **Кнопки под карточкой/подсказкой**, а не в отдельном `<footer>` — палец на телефоне легче достаёт.
- **Инверсия роли в share-ссылке:** если я reader, партнёр откроет ссылку с `role=listener`.
- **Параметр `turn=N` в share-ссылке** — партнёр может продолжить с того же вопроса.
- **QR-код в блоке "Продолжить сессию"** — для продолжения с того же места.
- **Плейсхолдер QR-кода** до выбора всех опций — не "пустая зона", а понятная подсказка.
- **Кнопка "⏭️ Пропустить"** с надписью, не мелкий значок.

### Логика состояния
- **История сессий:** массив `coffee_sessions` в localStorage + `coffee_active_session_id`. Можно параллельно вести несколько сессий с разными колодами и возвращаться к ним позже.
- **Миграция v1 → v2:** старый `game_state` автоматически конвертируется в запись истории при первом открытии.
- **Счётчик `activeSkippedCount`** — только актуальные пропуски (не "перекрытые" последующим ответом).
- **Пометки на карточке:** "✅ Отвечен ранее" имеет приоритет над "⚠️ Пропущен ранее".
- **`hasSavedSession` = false если `isFinished`** — завершённая сессия не показывается в блоке "Продолжить".

### Инфраструктура
- **Auto-detect `base`** через `GITHUB_REPOSITORY` — без привязки к жёсткому имени репо.
- **Иконки в manifest относительные** — работают на любом поддомене.
- **`favicon.ico`** добавлен.

### Качество
- 72 теста Vitest в v3 (включая 13 на sessions: создание, переключение, удаление, завершение, миграция v1→v2).
- Все тесты проходили. Сборка без warnings.

---

## 1. Обзор и цели

### 1.1. Продукт

Progressive Web App «Random Coffee Cards» — оффлайн-приложение для проведения структурированных парных диалогов. Два участника на отдельных устройствах видят одну и ту же последовательность вопросов (синхронизированную выбором "порядка" — буквы A..J). Роли (читающий/отвечающий) чередуются после каждого вопроса.

### 1.2. Ключевые свойства

- **Полностью оффлайн.** После первой установки не требует сети. Все данные в `localStorage`.
- **Без бэкенда.** Синхронизация между устройствами — через выбор одинакового "порядка" или share-ссылку с QR-кодом.
- **Mobile-first.** Дизайн оптимизирован под смартфоны, кнопки — под большой палец.
- **Устанавливается как PWA.** Иконка на домашнем экране, full-screen, оффлайн-работа.
- **История сессий.** Параллельно можно вести несколько сессий с разными колодами и возвращаться к ним позже.

### 1.3. Стек

| Слой | Технология | Версия |
|------|------------|--------|
| Фреймворк | Vue 3 (Composition API, `<script setup>`) | ^3.5 |
| Сборщик | Vite | ^5.4 |
| CSS | Tailwind CSS | **v3.x** (фиксация важна) |
| Роутер | Vue Router | ^4.6 |
| PWA | vite-plugin-pwa | ^0.20 |
| QR-коды | qrcode (npm) | ^1.5 |
| Тесты | Vitest + @vue/test-utils + jsdom | ^2.1 |
| Хранилище | localStorage | — |

**Строго:** Composition API только. Options API не использовать.

### 1.4. Ограничения

- Синхронизация между устройствами — ручная (договорились о букве порядка) или через share-ссылку с QR.
- Нет мультиплеера в реальном времени (планируется в v4 через WebRTC).
- `navigator.vibrate` не работает на iOS — тактильной отдачи на iPhone нет.

---

## 2. Архитектура и состояние

### 2.1. Singleton-композабл с историей сессий

Refs состояния находятся на уровне модуля `useDeck.js`. Все компоненты, вызывающие `useDeck()`, получают общий реактивный источник. Запись в `localStorage` происходит через один `watch` с `flush: 'sync'` — состояние всегда консистентно.

```javascript
// useDeck.js — singleton
const sessions = ref(loadSessions())
const activeSessionId = ref(loadActiveSessionId())

const activeSession = computed(() => {
  if (!activeSessionId.value) return null
  return sessions.value.find(s => s.id === activeSessionId.value) || null
})

const deckId      = ref(activeSession.value?.deckId ?? null)
const orderIndex  = ref(activeSession.value?.orderIndex ?? null)
const currentTurn = ref(activeSession.value?.currentTurn ?? 0)
const role        = ref(activeSession.value?.role ?? null)
const passedIds   = ref(activeSession.value?.passedIds ? [...activeSession.value.passedIds] : [])
const skippedIds  = ref(activeSession.value?.skippedIds ? [...activeSession.value.skippedIds] : [])
```

### 2.2. Схема состояния

```typescript
interface Session {
  id: string                         // 'sess_<timestamp36>_<random6>'
  deckId: 'deep' | 'work' | string   // v5.1+: кастомные колоды (coffee_custom_decks)
  orderIndex: number                  // 0..9
  currentTurn: number                // 0..sequence.length
  role: 'reader' | 'listener'
  passedIds: string[]                 // id отвеченных вопросов (история)
  skippedIds: string[]                // id пропущенных вопросов (история)
  name: string | null                // v5.0: пользовательское имя сессии (≤128 символов)
  startTime: string                   // v5.0: ISO timestamp, когда сессия начата (для таймера и статистики)
  elapsedMs: number                   // v5.0: накопленное время игры в миллисекундах (с учётом пауз)
  maxReachedTurn: number              // максимальный достигнутый ход (для isJumpedTurn, isNextOpened)
  createdAt: string                   // ISO timestamp
  updatedAt: string                   // ISO timestamp
  completed: boolean                  // true если currentTurn >= sequence.length
}

// localStorage:
//   coffee_sessions        — Session[] (массив)
//   coffee_active_session_id — string | null
//   theme_preference        — 'light' | 'dark' | 'auto'
//   install_dismissed       — '1' | null (запоминание отказа от install prompt)
//
// Поля passedIds/skippedIds/maxReachedTurn/name/startTime/elapsedMs — реактивные refs в useDeck,
// синхронизируются с Session при изменении через watch(flush: 'sync').
// resumeLast — module-level переменная (не сохраняется), указывает когда продолжили после паузы.
```

### 2.3. Миграция v1 → v2

При первом открытии после обновления со старой версии (где было единое `game_state`) — автоматически конвертируется в одну запись истории:

```javascript
function migrateV1ToV2() {
  try {
    const oldRaw = localStorage.getItem('game_state')
    if (!oldRaw) return
    const old = JSON.parse(oldRaw)
    if (!old.deckId || old.orderIndex === null || !old.role) return

    // Вычисляем completed на основе currentTurn vs длины последовательности
    const total = decks[old.deckId]?.orders?.[old.orderIndex]?.sequence.length ?? 0
    const completed = total > 0 && (old.currentTurn || 0) >= total

    const session = {
      id: genId(),
      deckId: old.deckId,
      orderIndex: old.orderIndex,
      currentTurn: old.currentTurn || 0,
      role: old.role,
      passedIds: old.passedIds || [],
      skippedIds: old.skippedIds || [],
      name: null,                                                   // v5.0
      startTime: old.startTime || old.createdAt || old.updatedAt || new Date().toISOString(),  // v5.0
      elapsedMs: old.elapsedMs || 0,                                // v5.0
      maxReachedTurn: old.maxReachedTurn ?? old.currentTurn ?? 0,
      createdAt: old.updatedAt || new Date().toISOString(),
      updatedAt: old.updatedAt || new Date().toISOString(),
      completed
    }
    saveSessions([session])
    saveActiveSessionId(session.id)
    localStorage.removeItem('game_state')
  } catch (e) {
    console.warn('[coffee-cards] v1→v2 migration failed:', e)
  }
}
```

### 2.4. Логика ролей

| Ход | Reader видит | Listener видит |
|-----|--------------|----------------|
| 1 (reader ход) | 🗣️ "Зачитай вопрос партнеру" + карточку + "Партнёр ответил ➔" + "⏭️ Пропустить" | 💬 "Теперь ты отвечаешь" + 🤔 + "Я ответил ➔" (карточки нет) |
| 2 (listener ход) | 💬 "Теперь ты отвечаешь" + 🤔 + "Я ответил ➔" (карточки нет) | 🗣️ "Зачитай вопрос партнеру" + карточку + "Партнёр ответил ➔" + "⏭️ Пропустить" |
| 3 (reader ход) | Как ход 1 | Как ход 1 |

"Reader/listener" — это **кто начал**. На каждом конкретном ходе есть конкретная роль: **читающий** (видит карточку) или **отвечающий** (не видит).

### 2.5. Логика skip

Пропуск читающим = пропуск всего раунда (моё чтение + ответ партнёра), потому что партнёр не услышал вопрос — ему нечего отвечать. `currentTurn += 2`, переход сразу к следующему "читающему" ходу.

У отвечающего кнопки "Пропустить" нет в UI — он не видит карточку.

### 2.6. Навигация по ходам: maxReachedTurn, isJumpedTurn, isNextOpened

В v4 добавлена полноценная навигация по уже пройденным/перепрыгнутым ходам:

**`maxReachedTurn`** — максимальный ход, до которого доходили в текущей сессии:
- `startSession` — устанавливается в `startTurn` (обычно 0)
- `nextQuestion` / `skipQuestion` — обновляется, если новый `currentTurn` больше
- `prevQuestion` / `nextTurn` — НЕ обновляется (мы возвращаемся/движемся в пределах)
- Сохраняется в `Session.maxReachedTurn`, восстанавливается при `loadSession`

**`isJumpedTurn`** — текущий ход был перепрыгнут skip'ом (читатель сделал skip +2, ответчик на +1 ходу не услышал вопрос). Условие:
```
isJumpedTurn = currentTurn < maxReachedTurn
              && currentQuestion.id НЕ в passedIds
              && currentQuestion.id НЕ в skippedIds
```
На перепрыгнутом ходе UI не показывает основную кнопку и "⏭️ Пропустить" — только "← Предыдущий" и "Следующий →" + компактный заголовок "⏭️ Этот ход был пропущен".

**`isNextOpened`** — следующий ход находится в пределах `maxReachedTurn` (мы туда уже доходили):
```
isNextOpened = (currentTurn + 1) < sequence.length
              && (currentTurn + 1) <= maxReachedTurn
```
Используется для показа кнопки "Следующий →" — переход без модификации `passedIds`/`skippedIds`.

### 2.7. Таймер сессии (v5.0)

Таймер отслеживает активное время игры (с учётом пауз при возврате на главный экран).

**Поля Session:**
- `startTime` — ISO timestamp, когда сессия была начата (для статистики)
- `elapsedMs` — накопленное время игры в миллисекундах

**Module-level переменная:**
- `resumeLast` — timestamp последнего resume (0 если на паузе). Не сохраняется в localStorage.

**Функции (exported через `useDeck`):**
```javascript
function resumeTimer() {
  // Продолжить отсчёт (вызывается при startSession, loadSession незавершённой, onMounted GameView)
  if (resumeLast > 0) return
  resumeLast = Date.now()
}

function pauseTimer() {
  // Остановить, накопить elapsedMs (вызывается при goBack, resetProgress, isFinished, onBeforeUnmount)
  if (resumeLast === 0) return
  const now = Date.now()
  elapsedMs.value = elapsedMs.value + (now - resumeLast)
  resumeLast = 0
  persistActiveSession()
}

function getCurrentElapsedMs() {
  // Текущее время с учётом пауз (для UI таймера)
  if (resumeLast > 0) {
    return elapsedMs.value + (Date.now() - resumeLast)
  }
  return elapsedMs.value
}

function formatDuration(ms) {
  // Форматирует мс в "MM:SS" или "H:MM:SS" если больше часа
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
```

**Жизненный цикл:**
1. `startSession` → `pauseTimer()` (предыдущей) → `elapsedMs = 0`, `startTime = now` → `resumeTimer()`
2. Игра → `getCurrentElapsedMs()` растёт (UI обновляется раз в секунду)
3. `goBack` (на главную) → `pauseTimer()` (накопит `elapsedMs`, `resumeLast = 0`)
4. `continueSession` / `loadSession` → `resumeTimer()` (если сессия не завершена)
5. `isFinished` → `pauseTimer()` (финальное время сохраняется в `finalDuration`)
6. `resetProgress` → `pauseTimer()` → сброс `elapsedMs = 0`

**В UI:**
- GameView шапка: `⏱ MM:SS` — обновляется через `setInterval(() => tick.value++, 1000)`
- GameView завершение: блок статистики с финальным временем

### 2.8. Структура проекта

```
random-coffee/
├── .github/workflows/
│   ├── ci.yml
│   └── deploy-pages.yml
├── docs/
│   └── SPEC.md               # полная техническая спецификация (этот файл)
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png
│   └── favicon.ico
├── src/
│   ├── components/
│   │   └── InstallPrompt.vue      # кнопка "Установить" (beforeinstallprompt + iOS)
│   ├── composables/useDeck.js     # singleton state, sessions, timer, rename, export/import
│   ├── data/decks.js              # 2 колоды, 10 порядков A..J, deterministic PRNG
│   ├── router/index.js            # routes + nav guard
│   ├── views/
│   │   ├── SetupView.vue          # главный экран + история сессий + форма новой
│   │   └── GameView.vue          # карточка вопроса + кнопки + footer nav + таймер + статистика
│   ├── App.vue                    # <router-view/> + InstallPrompt + SW update banners
│   ├── main.js
│   └── style.css
├── tests/useDeck.test.js          # 104 теста
├── AGENTS.md                      # гайдлайны для AI-агентов
├── CHANGELOG.md                   # история версий (Keep a Changelog, русский)
├── README.md
├── index.html
├── package.json                   # version 5.0.0
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js                 # auto-detect base, VitePWA, workbox runtimeCaching, git commit hash
└── .gitignore
```

---

## 3. Конфигурация проекта

### 3.1. Инициализация

```bash
npm create vite@latest random-coffee -- --template vue
cd random-coffee
npm install vue-router@4 qrcode
npm install -D tailwindcss@3 postcss autoprefixer @vitejs/plugin-vue vite-plugin-pwa
npm install -D vitest @vue/test-utils jsdom
npx tailwindcss init -p
```

**Важно:** `tailwindcss@3` — фиксация обязательна. v4 использует CSS-first конфигурацию, `npx tailwindcss init` в v4 не работает как в v3.

### 3.2. `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// ─── Auto-detect base для GitHub Pages ────────────────────────
// GitHub Actions экспортирует GITHUB_REPOSITORY как "owner/repo".
// Локально → base = '/'. В CI → base = "/<repo-name>/".
// Если репо называется <user>.github.io (персональный домен) — auto-detect
// это пропускает, base = '/'.
// Ручное переопределение: REPO_NAME=my-app npm run build
const envRepoName = process.env.REPO_NAME
const ghRepoName = process.env.GITHUB_REPOSITORY?.split('/')?.[1] || ''
const repoName = envRepoName ?? (ghRepoName && !ghRepoName.endsWith('.github.io') ? ghRepoName : '')
const base = process.env.NODE_ENV === 'production' && repoName
  ? `/${repoName}/`
  : '/'

if (process.env.NODE_ENV === 'production') {
  console.log(`[vite.config] base = "${base}", repoName = "${repoName}"`)
}

export default defineConfig({
  base,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png', 'favicon.ico'],
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
        // Иконки — относительные пути, разрешаются относительно scope
        icons: [
          { src: 'icon-192.png',          sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png',          sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  test: { environment: 'jsdom', globals: true }
})
```

### 3.3. `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      animation: { flip: 'flip 0.6s ease-in-out' },
      keyframes: {
        flip: {
          '0%':   { transform: 'rotateY(0deg)',  opacity: '0' },
          '50%':  { transform: 'rotateY(90deg)', opacity: '0.5' },
          '100%': { transform: 'rotateY(0deg)',  opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
```

`@keyframes flip` определён **только здесь**. Дублирование в `style.css` запрещено.

### 3.4. `postcss.config.js`

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}
```

### 3.5. `package.json` (scripts)

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## 4. Данные: `src/data/decks.js`

```javascript
// Линейный конгруэнтный генератор — детерминирован на всех платформах
export function makeRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function generateOrder(questions, seed) {
  const ids = questions.map(q => q.id)
  const random = makeRandom(seed)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

// v5.11: Категории КОЛОД — slug, name, color. Slug — для валидации в формате колоды.
// ВАЖНО: это НЕ категории вопросов внутри колоды (те — отдельное поле `categories`).
export const deckCategories = {
  'couples':     { name: 'Для пар',        color: '#ec4899' },
  'first-date':  { name: 'Знакомство',     color: '#f59e0b' },
  'friendship':  { name: 'Дружба',         color: '#10b981' },
  'family':      { name: 'Семья',          color: '#8b5cf6' },
  'work':        { name: 'Работа',        color: '#3b82f6' },
  'self':        { name: 'Самопознание',   color: '#06b6d4' },
  'party':       { name: 'Группа',         color: '#f43f5e' }
}
export const deckCategorySlugs = Object.keys(deckCategories)  // для валидации

// v5.3: категории вопросов ВНУТРИ колод (поля `categories` в каждой колоде)
const deepCategories = { relationships: {...}, self: {...}, ... }

const deepQuestions = [
  { id: 'q1',  text: 'Какое событие в жизни сильно изменило твои взгляды?', categoryId: 'self' },
  // ... 15 вопросов всего
]

const workQuestions = [
  { id: 'w1',  text: 'Какой самый полезный совет ты получал на работе?', categoryId: 'career' },
  // ... 10 вопросов всего
]

// v5.11: 4 новые встроенные колоды по 12 вопросов (couples, first-date, friends, family).
// Каждая со своими `categories` для разметки вопросов внутри.

export const decks = {
  deep: {
    deckId: 'deep',
    id: 'deep',                    // обратная совместимость
    name: 'Глубокие мысли',
    description: 'Вопросы для глубоких размышлений о жизни',
    lang: 'ru_RU',
    baseDeckId: 'deep',
    deckCategory: 'self',          // v5.11
    questions: deepQuestions,
    categories: deepCategories,     // v5.3: категории вопросов ВНУТРИ
    orders: Array.from({ length: 10 }, (_, i) => ({
      id: `order_${i + 1}`,
      name: String.fromCharCode(65 + i),   // A, B, ..., J
      sequence: generateOrder(deepQuestions, (i + 1) * 12345)
    })),
    isCustom: false
  },
  work: { /* аналогично с deckCategory: 'work' */ },
  couples:      { /* deckCategory: 'couples', 12 вопросов */ },
  'first-date': { /* deckCategory: 'first-date', 12 вопросов */ },
  friends:     { /* deckCategory: 'friendship', 12 вопросов */ },
  family:      { /* deckCategory: 'family', 12 вопросов */ }
}

export const deckIds = Object.keys(decks)
export const ORDER_COUNT = 10
```

#### Формат колоды (v5.11 — расширен)

```typescript
interface Deck {
  deckId: string          // 3-64 символа, ^[a-zA-Z0-9_-]+$
  id?: string             // обратная совместимость (для v5.0)
  name: string            // ≤128, trim в normalizeDeck
  description?: string
  source?: string         // URL для обновлений (используется в checkDeckUpdates)
  sourcePath?: string     // v5.4: 'embedded' | file.name | URL pathname
  version?: number        // для checkDeckUpdates
  lang?: string           // 'ru_RU' (default), формат ^[a-z]{2}_[A-Z]{2}$
  baseDeckId?: string     // v5.3: для группировки переводов
  deckCategory?: string   // v5.11: slug из deckCategorySlugs (опц., null если нет)
  questions: Question[]
  orders?: Order[]        // если нет — авто-генерация 10 порядков A..J
  categories?: { [id]: { name: string, color: string } }  // v5.3: категории вопросов ВНУТРИ колоды
  isCustom?: boolean
  createdAt?: string      // ISO
  updatedAt?: string      // ISO
}

interface Question {
  id: string              // уникальный в пределах колоды (v5.5)
  text: string
  categoryId?: string     // ссылка на categories
}
```

---

## 5. Композабл `src/composables/useDeck.js`

Полный код (см. репозиторий). Ключевые части:

### 5.1. Хранение сессий

```javascript
const SCHEMA_VERSION = 2
const sessionsKey = 'coffee_sessions'
const activeSessionIdKey = 'coffee_active_session_id'
const themeKey = 'theme_preference'

function genId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(sessionsKey)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    localStorage.removeItem(sessionsKey)
    return []
  }
}
```

### 5.2. Computed состояния

```javascript
const deck = computed(() => deckId.value ? decks[deckId.value] : null)
const currentOrder = computed(() => deck.value?.orders[orderIndex.value] || null)
const currentQuestion = computed(() => {
  if (!currentOrder.value) return null
  const id = currentOrder.value.sequence[currentTurn.value]
  return deck.value.questions.find(q => q.id === id) || null
})

const amIReading = computed(() => {
  if (!role.value || !currentOrder.value) return false
  const isEvenTurn = currentTurn.value % 2 === 0
  return role.value === 'reader' ? isEvenTurn : !isEvenTurn
})

// isAnswered имеет приоритет над isSkipped
const isAnswered = computed(() =>
  !!currentQuestion.value && passedIds.value.includes(currentQuestion.value.id)
)

const isSkipped = computed(() => {
  if (!currentQuestion.value) return false
  const id = currentQuestion.value.id
  return skippedIds.value.includes(id) && !passedIds.value.includes(id)
})

// isJumpedTurn: текущий ход был перепрыгнут skip'ом.
// Условие: currentTurn < maxReachedTurn (вернулись назад) И текущий
// вопрос НЕ в passedIds и НЕ в skippedIds (никто его не открывал).
// На новом ходу (currentTurn === maxReachedTurn) — false, даже если
// текущий вопрос ещё не в passed/skipped (только что открыли).
const isJumpedTurn = computed(() => {
  if (!currentQuestion.value) return false
  if (currentTurn.value >= maxReachedTurn.value) return false
  const id = currentQuestion.value.id
  return !passedIds.value.includes(id) && !skippedIds.value.includes(id)
})

// isNextOpened: следующий ход в пределах maxReachedTurn.
// Используется для показа кнопки "Следующий →" — переход без
// модификации passedIds/skippedIds через nextTurn().
const isNextOpened = computed(() => {
  if (!currentOrder.value) return false
  const nextTurn = currentTurn.value + 1
  if (nextTurn >= currentOrder.value.sequence.length) return false
  return nextTurn <= maxReachedTurn.value
})

// Счётчик только актуальных пропусков (не "перекрытых" ответом)
const activeSkippedCount = computed(() =>
  skippedIds.value.filter(id => !passedIds.value.includes(id)).length
)

const isFinished = computed(() =>
  !!currentOrder.value && currentTurn.value >= currentOrder.value.sequence.length
)

// hasSavedSession: false если нет активной сессии, она завершена,
// или currentTurn >= sequence.length (defensive check на старые баги).
const hasSavedSession = computed(() => {
  if (!activeSession.value) return false
  if (activeSession.value.completed) return false
  if (!deckId.value || orderIndex.value === null || !role.value) return false
  if (currentOrder.value && currentTurn.value >= currentOrder.value.sequence.length) return false
  return true
})
```

### 5.3. Persistence через watch (flush: 'sync')

```javascript
watch(
  [deckId, orderIndex, currentTurn, role, passedIds, skippedIds],
  () => {
    if (!activeSessionId.value) return
    const idx = sessions.value.findIndex(s => s.id === activeSessionId.value)
    if (idx === -1) return
    sessions.value[idx] = {
      ...sessions.value[idx],
      deckId: deckId.value,
      orderIndex: orderIndex.value,
      currentTurn: currentTurn.value,
      role: role.value,
      passedIds: [...passedIds.value],
      skippedIds: [...skippedIds.value],
      completed: isFinished.value,
      updatedAt: new Date().toISOString()
    }
    saveSessions(sessions.value)
  },
  { deep: true, flush: 'sync' }
)
```

### 5.4. Actions

```javascript
// ─── isLoading: флаг для блокировки watch во время loadSession/startSession/
// resetProgress. Без этого watch с flush:'sync' срабатывает на КАЖДОЕ
// изменение ref и на промежуточных шагах пишет в sessions[idx] мусор
// (например, completed=false для завершённой сессии).
let isLoading = false

// ─── persistActiveSession: вынесенная логика записи в sessions.
// Используется и из watch, и из loadSession (после загрузки refs).
// Вычисляет completed напрямую из refs (не через isFinished computed,
// чтобы избежать гонок при частичных обновлениях).
function persistActiveSession() {
  if (!activeSessionId.value) return
  const idx = sessions.value.findIndex(s => s.id === activeSessionId.value)
  if (idx === -1) return
  const total = decks[deckId.value]?.orders?.[orderIndex.value]?.sequence.length ?? 0
  const completed = total > 0 && currentTurn.value >= total
  sessions.value[idx] = {
    ...sessions.value[idx],
    deckId: deckId.value, orderIndex: orderIndex.value,
    currentTurn: currentTurn.value, role: role.value,
    passedIds: [...passedIds.value], skippedIds: [...skippedIds.value],
    maxReachedTurn: maxReachedTurn.value,
    completed, updatedAt: new Date().toISOString()
  }
  saveSessions(sessions.value)
}

// Создаёт НОВУЮ сессию в истории, делает её активной
function startSession(selectedDeckId, selectedOrderIndex, selectedRole, startTurn = 0) {
  const total = decks[selectedDeckId]?.orders[selectedOrderIndex]?.sequence.length ?? 0
  const turn = (typeof startTurn === 'number' && startTurn >= 0 && startTurn < total)
    ? startTurn : 0

  const id = genId()
  const now = new Date().toISOString()
  sessions.value = [{ id, deckId: selectedDeckId, orderIndex: selectedOrderIndex,
    currentTurn: turn, role: selectedRole, passedIds: [], skippedIds: [],
    maxReachedTurn: turn,
    createdAt: now, updatedAt: now, completed: false
  }, ...sessions.value]
  saveSessions(sessions.value)
  activeSessionId.value = id
  saveActiveSessionId(id)

  isLoading = true
  deckId.value = selectedDeckId
  orderIndex.value = selectedOrderIndex
  role.value = selectedRole
  currentTurn.value = turn
  passedIds.value = []
  skippedIds.value = []
  maxReachedTurn.value = turn
  isLoading = false
  persistActiveSession()
}

// Переключается на существующую сессию из истории
function loadSession(id) {
  const s = sessions.value.find(x => x.id === id)
  if (!s) return false
  isLoading = true
  activeSessionId.value = id
  deckId.value = s.deckId
  orderIndex.value = s.orderIndex
  role.value = s.role
  currentTurn.value = s.currentTurn
  passedIds.value = [...(s.passedIds || [])]
  skippedIds.value = [...(s.skippedIds || [])]
  maxReachedTurn.value = s.maxReachedTurn ?? s.currentTurn ?? 0
  isLoading = false
  persistActiveSession()
  return true
}

// Удаляет сессию; если удалили активную — сбрасывает текущее состояние
function deleteSession(id) {
  sessions.value = sessions.value.filter(s => s.id !== id)
  saveSessions(sessions.value)
  if (activeSessionId.value === id) {
    activeSessionId.value = null
    deckId.value = null
    orderIndex.value = null
    role.value = null
    currentTurn.value = 0
    maxReachedTurn.value = 0
    passedIds.value = []
    skippedIds.value = []
  }
  return true
}

function nextQuestion() {
  if (!currentQuestion.value) return
  const id = currentQuestion.value.id
  // Защита от дублей: если уже в passedIds — не добавляем (повторное
  // нажатие на уже отвеченном ходе после prev).
  if (!passedIds.value.includes(id)) {
    passedIds.value.push(id)
  }
  currentTurn.value++
  if (currentTurn.value > maxReachedTurn.value) maxReachedTurn.value = currentTurn.value
}

// nextTurn: переход к следующему вопросу БЕЗ модификации passedIds/skippedIds.
// Используется для кнопки "Следующий →" когда следующий ход в пределах maxReachedTurn.
// maxReachedTurn НЕ обновляем — мы движемся в пределах уже достигнутых ходов.
function nextTurn() {
  if (!currentOrder.value) return
  if (currentTurn.value + 1 >= currentOrder.value.sequence.length) return
  currentTurn.value++
}

function prevQuestion() {
  if (currentTurn.value <= 0) return
  currentTurn.value--
  // maxReachedTurn НЕ уменьшаем — мы вернулись назад, но максимум остаётся
}

// Skip +2 — пропуск всего раунда (моё чтение + ответ партнёра)
function skipQuestion() {
  if (!currentQuestion.value) return
  const id = currentQuestion.value.id
  // Защита от дублей в skippedIds
  if (!skippedIds.value.includes(id)) {
    skippedIds.value.push(id)
  }
  currentTurn.value += 2
  if (currentTurn.value > maxReachedTurn.value) maxReachedTurn.value = currentTurn.value
}

// Помечает активную сессию завершённой, сбрасывает activeId
function resetProgress() {
  if (activeSessionId.value) {
    const idx = sessions.value.findIndex(s => s.id === activeSessionId.value)
    if (idx !== -1) {
      sessions.value[idx] = { ...sessions.value[idx], completed: true, updatedAt: new Date().toISOString() }
      saveSessions(sessions.value)
    }
  }
  isLoading = true
  activeSessionId.value = null
  saveActiveSessionId(null)
  currentTurn.value = 0
  passedIds.value = []
  skippedIds.value = []
  maxReachedTurn.value = 0
  deckId.value = null
  orderIndex.value = null
  role.value = null
  isLoading = false
}
```

### 5.5. Share URL helpers

```javascript
// Роль ИНВЕРТИРУЕТСЯ — это ссылка для ПАРТНЁРА.
// Опциональный currentTurn — для продолжения с того же вопроса.
export function buildShareUrl(dId, oIdx, r, currentTurn = null) {
  const partnerRole = r === 'reader' ? 'listener' : 'reader'
  const params = { deck: dId, order: String(oIdx), role: partnerRole }
  if (currentTurn !== null && typeof currentTurn === 'number' && currentTurn >= 0) {
    params.turn = String(currentTurn)
  }
  const qs = new URLSearchParams(params)
  return `${window.location.origin}${window.location.pathname}?${qs}`
}

export function parseShareUrl(query) {
  if (!query || typeof query !== 'object') return null
  const d = query.deck
  const o = parseInt(query.order, 10)
  const r = query.role
  if (d && deckIds.includes(d) && !isNaN(o) && o >= 0 && o < 10 && ['reader', 'listener'].includes(r)) {
    const turn = parseInt(query.turn, 10)
    return {
      deck: d, order: o, role: r,
      turn: (!isNaN(turn) && turn >= 0) ? turn : 0
    }
  }
  return null
}
```

### 5.6. Exported API

```javascript
export function useDeck() {
  return {
    // sessions history
    sessions, activeSessionId, activeSession,
    loadSession, deleteSession, exportSession, renameSession,
    // state
    deck, deckId, orderIndex, currentOrder, currentQuestion, currentTurn,
    role, amIReading, passedIds, skippedIds,
    sessionName, startTime, elapsedMs,                  // v5.0
    isAnswered, isSkipped, isJumpedTurn, isNextOpened,
    activeSkippedCount, theme,
    // computed
    hasSavedSession, isFinished,
    // timer helpers (v5.0)
    resumeTimer, pauseTimer, getCurrentElapsedMs, formatDuration,
    // actions
    startSession, nextQuestion, nextTurn, prevQuestion, skipQuestion, resetProgress,
    exportState, importState, setTheme,
    // v5.1: custom decks
    decks, deckIds, customDecks,
    importDeck, exportDeck, deleteDeck, renameDeck,
    exportBackup, importBackup,
    // v5.4: unified catalog
    catalogDecks, isCustomDeck,
    // v5.2: catalog (remote)
    catalog, catalogLoading, catalogError, catalogLastFetch,
    loadCatalog, loadDeckFromUrl, checkDeckUpdates
  }
}

// Также экспортируются:
export const SOURCE_EMBEDDED = 'embedded'  // v5.4: sourcePath для встроенных колод
export { SCHEMA_VERSION, sessionsKey, activeSessionIdKey, themeKey }
```

#### v5.4: `catalogDecks` — единый список колод для UI-каталога

```javascript
catalogDecks = computed(() => {
  // Array<{ ...deck, kind: 'builtin' | 'custom', sourcePath }>
  // Сортировка: встроенные сверху (по алфавиту имени, ru-locale), затем кастомные (тоже по алфавиту).
  // sourcePath: 'embedded' для встроенных, deck.sourcePath для кастомных (может быть null).
})
```

#### v5.4: `isCustomDeck(deckId)` — helper

Возвращает `true` если колода принадлежит кастомным (загруженным). Используется для отображения разных действий на карточке.

#### v5.4: `sourcePath` — метаданные происхождения колоды

Не показывается в UI, хранится в `customDecks` для диагностики. Возможные значения:
- `'embedded'` — встроенная колода (константа `SOURCE_EMBEDDED`).
- `'<file.name>'` — импортирована из файла (только имя, без пути).
- `'/path/in/repo.json'` — загружена из каталога (path из URL без домена).

`importDeck(deckData, { sourcePath })` — opts.sourcePath имеет приоритет над `deckData.sourcePath` (caller знает контекст).
`loadDeckFromUrl(url, opts)` — автоматически выводит sourcePath из URL: `url.pathname + (url.hash || '')`.
`exportDeck` — выгрузка содержит `sourcePath` (для пере-импорта без потери метаданных).

#### v5.5: Откат при ошибке сохранения

`saveCustomDecks()` возвращает `bool`. Если `localStorage.setItem` бросает (например, `QuotaExceededError`):
- `importDeck` — откатывает `customDecks.value`, возвращает `{ ok: false, error: 'Не удалось сохранить: возможно, переполнен localStorage' }`.
- `deleteDeck` — восстанавливает прежний массив, возвращает `false`.
- `renameDeck` — восстанавливает прежнее имя, возвращает `false`.
- `checkDeckUpdates` — восстанавливает прежнюю версию, возвращает `{ ok: false, error: 'Не удалось сохранить обновление...' }`.

#### v5.5: `deleteDeck` активной сессии

Если удаляется колода, которая используется в активной сессии:
- `confirm` показывает дополнительное предупреждение: «Эта колода используется в активной сессии — она будет завершена.»
- После подтверждения — вызывается `resetProgress()`, который завершает активную сессию (`completed: true`) и сбрасывает `activeSessionId`, `deckId`, `orderIndex`, `role`.
- Удаляем колоду. Сессия остаётся в истории как завершённая.

#### v5.5: Валидация формата колоды (дополнения)

- Имя не должно быть пустым или только из пробелов: `deck.name.trim().length > 0`.
- Вопросы должны иметь уникальные `id`: `new Set(questions.map(q => q.id)).size === questions.length`.
- `normalizeDeck` — имя триммится: `(deck.name || '').trim().slice(0, 128)`.

#### v5.5: `loadCatalog` применяет дефолт `lang`

Элементы каталога без `lang` получают `'ru_RU'` автоматически — чтобы бейдж `[RU]` был consistent с тем, что увидит пользователь после загрузки (т.к. `normalizeDeck` делает то же самое для кастомных колод).

#### v5.5: `checkDeckUpdates` при HTTP 404

Если колоду удалили из репо — `fetch(source)` возвращает 404. Возвращаем `{ ok: false, notFound: true, error: 'Колода больше недоступна в каталоге, обновить нельзя. У вас остаётся локальная версия.' }`. UI показывает это сообщение вместо сырного `HTTP 404`.

---

## 6. Роутер и навигация

### 6.1. `src/router/index.js`

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import SetupView from '@/views/SetupView.vue'
import GameView from '@/views/GameView.vue'

const routes = [
  { path: '/', name: 'setup', component: SetupView },
  {
    path: '/game',
    name: 'game',
    component: GameView,
    beforeEnter: () => {
      // Нельзя зайти в игру без активной незавершённой сессии
      try {
        const activeId = localStorage.getItem('coffee_active_session_id')
        if (!activeId) return { name: 'setup' }
        const sessions = JSON.parse(localStorage.getItem('coffee_sessions') || '[]')
        const s = sessions.find(x => x.id === activeId)
        if (!s || s.completed) return { name: 'setup' }
        if (!s.deckId || s.orderIndex === null || s.orderIndex === undefined || !s.role) {
          return { name: 'setup' }
        }
      } catch {
        return { name: 'setup' }
      }
    }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
```

### 6.2. Share-ссылка

URL вида `https://<user>.github.io/<repo>/?deck=deep&order=3&role=listener&turn=5`.

При заходе на `/` с query-параметрами `SetupView` через `onMounted` парсит их через `parseShareUrl` и предзаполняет форму. Опциональный `turn` — для продолжения с того же вопроса.

Дополнительно генерируется **QR-код** этой ссылки через npm-пакет `qrcode` (рендер в `data:` URL, без сетевых запросов).

---

## 7. `src/views/SetupView.vue`

### 7.1. Структура экрана (сверху вниз)

**Главный экран** (`showNewForm = false`):

1. Заголовок "Random Coffee"
2. Переключатель темы (Светлая / Тёмная / Авто)
3. **Блок "Продолжить сессию?"** (только если `hasSavedSession`):
   - **Один кликабельный блок** (v5.9): жёлтая карточка колоды (имя + бейджи + описание + `N вопросов • порядок X` + `Вопрос N из M`) + зелёная полоса «Продолжить →» снизу — один `<button>` с `@click="continueSession"`. Тап в любом месте вызывает продолжение.
   - Кнопка «Новая сессия» отдельно под блоком.
   - QR-код для продолжения (с `turn=currentTurn`) — под кнопками, с иконкой `⧉` для копирования ссылки.
4. Если нет активной — **большая кнопка "➕ Начать новую сессию"**
5. **Блок "История сессий"** (если есть хоть одна):
   - Подсказка про параллельные сессии + "Хранится не более 20 последних сессий."
   - Список карточек (scrollable `max-h-96`), каждая в 2 ряда:
     - Ряд 1: иконка (✅/▶️) + название сессии (или `<колода> • порядок <X>` если нет имени) + дата
     - Ряд 2: кнопка действия (Активна бейдж / Открыть / ↻ Снова) + утилитарные (✎ ↓ ✕)
   - Внизу: кнопка "📥 Импорт сессии из файла"
6. **Footer**: `v<version> · <commit_hash> · GitHub ↗`

**Экран новой сессии** (`showNewForm = true`):

1. "← Назад" (возвращает на главный)
2. **Шаг 1.** Выбор колоды — **единый каталог** (v5.4) с двумя секциями, с **progressive disclosure** (v5.6):
   - **Состояние «каталог развёрнут»** (по умолчанию, или после кнопки «Сменить»): показывается полный каталог.
     - **Шапка**: поиск (placeholder «Поиск по имени или описанию...», ✕ справа внутри поля для очистки, Esc сбрасывает), чипы-фильтры `Все (N) | Мои колоды (N)` (v5.10 — счётчики учитывают поиск), кнопка `📥 Импорт из файла`.
     - **Второй ряд чипов-фильтров по категориям** (v5.11) — показывается только когда категорий ≥3 (есть из чего выбирать). «Все категории» + чип для каждой категории с цветным кружком и счётчиком. Активная категория кликабельна (повторный клик сбрасывает). Счётчики учитывают поиск.
     - **Секция «МОИ КОЛОДЫ»** — карточки встроенных и кастомных колод:
       - Имя колоды на отдельной строке (`text-lg font-bold`, `line-clamp-2` — всегда видно целиком, до 2 строк).
       - **Бейджи одного размера, порядок: `[Категория] [Тип] [RU]`** (v5.11 — категория первая, важнее). Все `text-[10px] px-2 py-0.5 rounded leading-none border`. Бейдж категории — цвет категории (для выбранной — фон=цвет, для невыбранной — прозрачный фон с цветной рамкой/текстом). Бейдж типа (`Встроенная`/`Загруженная`) и язык (`[RU]`) — нейтральные цвета.
       - Описание, число вопросов.
       - Для кастомных: 3 иконки действий (↓ ✕ 🔄) справа, `@click.stop` — клик не выбирает колоду.
     - **Разделитель** + **Секция «КАТАЛОГ»** (только при фильтре «Все»):
       - Заголовок `КАТАЛОГ (N)` + ↻ обновить справа + дата последнего обновления мелким.
       - **Авто-загрузка** каталога при открытии формы (`ensureCatalogLoaded` в `onMounted` + `enterNewForm`).
       - Карточки удалённых колод, которых ещё нет локально. Скрываются, если уже загружены.
       - Бейджи того же размера: `[Категория] [В каталоге] [RU]`.
       - Кнопка «Загрузить» — после успеха `selectDeck(result.deck.deckId)` автоматически (без alert), колода переходит в верхнюю секцию.
       - Пустое состояние разветвляется: «Каталог пуст.» / «Ничего не найдено в каталоге.» / «✓ Все доступные колоды уже загружены.»
   - **Состояние «каталог коллапсирован»** (после выбора колоды через `selectDeck`): вместо каталога показывается **полная карточка выбранной колоды** (v5.8) — такая же структура, как в каталоге (имя + бейджи `[Категория] [Тип] [RU]` + описание + число вопросов + иконки действий для кастомных). Под карточкой — широкая кнопка `✎ Сменить колоду` (как «Загрузить» у удалённых).
     - **Плавный автоскролл** к шагу 2 (`step2Ref.scrollIntoView({ behavior: 'smooth', block: 'start' })`) через `nextTick` после коллапса. `scroll-mt-4` для небольшого отступа сверху.
     - **Share URL**: при `onMounted` с предзаполненной формой каталог коллапсируется мгновенно (без скролла, без анимации) — пользователь сразу видит шаг 2/3.
     - **`enterNewForm`**: каталог разворачивается (форма открыта заново — пользователь выбирает с нуля).
3. **Шаг 2.** Выбор порядка (A..J) — disabled пока нет колоды. **Progressive disclosure** (v5.7):
   - **Развёрнутое состояние** (по умолчанию, или после `✎ Сменить`): 5×2 сетка кнопок A..J с подсказкой «Договоритесь с партнером о букве порядка — одинаковая буква даст одинаковую последовательность вопросов.» Пока нет колоды — disabled, подсказка «↑ Сначала выберите колоду».
   - **Коллапсированное состояние** (после `selectOrder`): компактная плашка — большая буква (`text-3xl font-bold`) + подпись «порядок» + кнопка `✎ Сменить`. Плавный автоскролл к шагу 3 (`step3Ref.scrollIntoView`).
   - `selectOrder` сбрасывает `selectedRole` (логическая несогласованность при смене порядка). `isRoleExpanded` принудительно true.
   - `selectDeck` (смена колоды) разворачивает шаги 2 и 3, сбрасывает выбор.
4. **Шаг 3.** Выбор роли — "Я читаю первым" / "Я слушаю первым" — disabled пока нет порядка. **Progressive disclosure** (v5.7):
   - **Развёрнутое состояние** (по умолчанию, или после `✎ Сменить`): 2 крупные кнопки с иконкой + названием + подсказкой. Подсказка над ними: «Роли будут чередоваться каждый вопрос» (или «↑ Сначала выберите порядок» если порядок не выбран).
   - **Коллапсированное состояние** (после `selectRole`): компактная плашка — иконка (🗣️/👂) + название роли + подсказка + кнопка `✎ Сменить`. Плавный автоскролл к кнопке «Начать сессию» (`startButtonRef.scrollIntoView({ block: 'center' })`).
5. **Блок "Синхронизация с партнёром"**:
   - Плейсхолдер 📷 + "↑ Выберите колоду, порядок и роль — здесь появится QR-код"
   - После выбора роли:
     - ℹ️ "Покажите партнёру QR-код — он попадёт в ту же сессию. Или отправьте ссылку сообщением. Потом нажмите «Начать сессию»."
     - QR-код (256×256, генерируется через `qrcode.toDataURL`).
     - **Ссылка под QR-кодом** — простой текст (`text-xs opacity-70 break-all`), без фона/рамки.
     - **Иконка копирования `⧉`** рядом со ссылкой (Unicode-символ «два наложенных квадрата»). Feedback `✓` на 2 сек (`linkCopiedRef`). `aria-label` и `title` для a11y. Не везде есть нативный Web Share API, поэтому кнопка обязательна.
6. Кнопка "Начать сессию ➔" (disabled пока нет роли). `ref="startButtonRef"` + `scroll-mt-4` — для автоскролла после выбора роли.
7. Footer (версия + коммит + GitHub)

### 7.2. Тексты

- "1. Выберите колоду"
- "2. Выберите порядок вопросов" / подсказка "Договоритесь с партнером о букве порядка — одинаковая буква даст одинаковую последовательность вопросов."
- "3. Выберите роль" / подсказка "Роли будут чередоваться каждый вопрос"
- "🗣️ Я читаю первым" / "Первый вопрос читаю я"
- "👂 Я слушаю первым" / "Первый вопрос читает партнер"
- "Синхронизация с партнёром" / плейсхолдер "↑ Выберите колоду, порядок и роль — здесь появится QR-код"
- ℹ️ "Покажите партнёру QR-код — он попадёт в ту же сессию. Или отправьте ссылку сообщением. Потом нажмите «Начать сессию»."
- Иконка `⧉` рядом со ссылкой → feedback "✓" на 2 сек (v5.7)
- "Начать сессию ➔"
- "Продолжить сессию?" / "Незавершённая сессия: ..." / "Продолжить" / "Новая"
- "Покажите партнёру QR-код, чтобы продолжить с того же вопроса:"
- "История сессий" / "Можно параллельно вести несколько сессий с разными колодами и возвращаться к ним позже." / "Хранится не более 20 последних сессий."
- Кнопки в карточке истории:
  - Бейдж "● Активна" (не кнопка, span) — для активной незавершённой
  - "Открыть" — для незавершённой неактивной
  - "↻ Снова" — для завершённой
  - ✎ — переименовать (title="Переименовать сессию")
  - ↓ — экспортировать (title="Экспортировать в файл")
  - ✕ — удалить (title="Удалить сессию", hover → красный фон)
- Inline rename: input с placeholder "Например: с Анной в пятницу", кнопки ✓ (сохранить, Enter) / ✕ (отмена, Esc)
- "📥 Импорт сессии из файла" — внизу блока истории
- Подтверждение удаления: "Удалить сессию "<имя или колода • порядок X>" из истории?"
- Footer: "v<version>" + "· <commit_hash>" (ссылка на коммит, title="Коммит от <дата>") + "· GitHub ↗"

### 7.3. Карточка сессии в истории — структура (v5.0)

```
┌─────────────────────────────────────────────────────┐
│ ✅  С Анной в кафе ← имя (если есть, жирным)       │
│     Глубокие мысли • порядок A ← колода (мелким)   │
│     Завершена • 20 сент., 21:02 ← дата             │
│                                                     │
│ [↻ Снова]              [✎] [↓] [✕]                 │
│  ↑ действие       ↑ утилиты (rename/export/delete) │
│                                                     │
│ ← inline rename (если ✎ нажата):                    │
│ [input: "Например: с Анной в пятницу"] [✓] [✕]    │
└─────────────────────────────────────────────────────┘
```

**Два ряда на мобильных** (название + дата сверху, кнопки снизу) — название не обрезается.

**Бейдж "● Активна"** — `<span>`, не кнопка. Зелёная точка + текст, без рамки/фона, не интерактивный. Заменяет кнопку "Открыть" для активной незавершённой сессии.

### 7.4. История сессий — сортировка

```javascript
const sortedSessions = computed(() => {
  return [...sessions.value].sort((a, b) => {
    if (a.id === activeSessionId.value) return -1   // активная всегда первая
    if (b.id === activeSessionId.value) return 1
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)  // затем по updatedAt
  })
})
```

### 7.4. Действия

- `selectDeck(dId)` — выбор колоды, сброс порядка и роли
- `selectOrder(index)` — выбор порядка
- `selectRole(r)` — выбор роли
- `startGame()` — вызов `startSession(deck, order, role, turn?)` и переход в `/game`
- `continueSession()` — переход в `/game` (без смены активной)
- `startNew()` — `resetProgress()` (помечает активную завершённой) + сброс формы
- `openSession(id)` — `loadSession(id)` + переход в `/game`
- `restartCompletedSession(s)` — `startSession(s.deckId, s.orderIndex, s.role)` + переход в `/game`
- `confirmDeleteSession(id)` — `confirm()` + `deleteSession(id)`
- `handleExport()` — проверка `hasSavedSession` + `exportState()`
- `handleImport(event)` — `importState(file)` с alert об успехе/ошибке

### 7.5. QR-коды

- `qrDataUrl` — для новой сессии (без `turn`)
- `continueQrDataUrl` — для продолжения (с `turn=currentTurn`)
- Оба генерируются через `QRCode.toDataURL(url, { width: 256, margin: 1 })`
- Watch'и на `shareUrl` и `continueShareUrl` перевычисляют QR при изменении

---

## 8. `src/views/GameView.vue`

### 8.1. Структура экрана

```
<контейнер :class="amIReading ? indigo : emerald">
  ── светлая: bg-indigo-100 / bg-emerald-100 + text-gray-900
  ── тёмная:  bg-indigo-950 / bg-emerald-950 + text-white

<шапка v-if="!isFinished">
  ⊗ (Закрыть)  |  [Категория колоды] <Порядок> • Вопрос N из M   ← v5.11: бейдж категории колоды
  Отвечено: X | Пропущено: Y ⏱ MM:SS   ← v5.0: таймер
</шапка>

<индикатор роли v-if="!isFinished && !isJumpedTurn">
  Если amIReading:
    🗣️ Зачитай вопрос партнеру (text-indigo-600 / dark:text-yellow-400)
    Прочитай вопрос вслух, дождись ответа партнёра, затем нажми «Партнёр ответил»
  Иначе:
    💬 Теперь ты отвечаешь (text-emerald-600 / dark:text-emerald-300)
    Ответь на услышанный вопрос, затем нажми «Я ответил»
</индикатор>

<индикатор перепрыгнутого хода v-else-if="!isFinished && isJumpedTurn">
  ⏭️ Этот ход был пропущен (text-gray-500)
</индикатор>

<main min-height: 35vh>
  Если amIReading && currentQuestion:
    Карточка с вопросом
      (✅ Отвечен ранее | ⚠️ Пропущен ранее — приоритет у ✅)

  Если !amIReading && !isJumpedTurn && currentQuestion:
    🤔
    Внимательно слушай партнёра, чтобы ответить на вопрос

  Если !amIReading && isJumpedTurn && currentQuestion:
    ⏭️
    Читающий пропустил этот вопрос — партнёр не услышал его,
    поэтому и отвечать не на что.
    Переходи к следующему ходу кнопкой «Следующий →» внизу.

  Если isFinished:
    🎉 Сессия завершена!
    Вы обсудили все вопросы в этом наборе.

    ┌──────────────────────────┐   ← v5.0: статистика
    │ Отвечено    │ Пропущено   │
    │ 15          │ 0          │
    │ Время       │ Начали      │
    │ 00:15       │ 20 сент.    │
    └──────────────────────────┘

    [Начать заново] [На главную]
</main>

<!-- ОСНОВНАЯ КНОПКА — отдельной строкой под main, не в footer -->
<основная кнопка v-if="currentQuestion && !isFinished && !isJumpedTurn"
  :class="amIReading ? 'bg-yellow-500 text-gray-900' : 'bg-emerald-500 text-white'">
  Партнёр ответил ➔  |  Я ответил ➔

<footer v-if="!isFinished">
  ← Предыдущий (disabled если currentTurn === 0)
  ⏭️ Пропустить (только если amIReading && !isJumpedTurn)
  Следующий → (только если isNextOpened)
</footer>
</контейнер>
```

### 8.2. Цветовая схема

| Элемент | Читающий | Отвечающий |
|---------|----------|-----------|
| Фон (светлая) | `bg-indigo-100` | `bg-emerald-100` |
| Фон (тёмная) | `bg-indigo-950` | `bg-emerald-950` |
| Текст | `text-gray-900` (светлая) / `text-white` (тёмная) |
| Индикатор (светлая) | `text-indigo-600` | `text-emerald-600` |
| Индикатор (тёмная) | `text-yellow-400` | `text-emerald-300` |
| Основная кнопка | `bg-yellow-500` + `text-gray-900` | `bg-emerald-500` + `text-white` |

Контрастная жёлтая/зелёная кнопка помогает пользователю мгновенно понять по цвету, в каком он режиме — читающий или отвечающий.

### 8.3. Тексты (на "ты" форму)

| Где | Текст |
|-----|-------|
| Шапка, кнопка "Назад" | "← На главную" |
| Шапка, счётчики | "Отвечено: X \| Пропущено: Y ⏱ MM:SS" (v5.0: таймер) |
| Заголовок роли (читающий) | "🗣️ Зачитай вопрос партнеру" |
| Заголовок роли (отвечающий) | "💬 Теперь ты отвечаешь" |
| Подсказка (читающий) | "Прочитай вопрос вслух, дождись ответа партнёра, затем нажми «Партнёр ответил»" |
| Подсказка (отвечающий) | "Ответь на услышанный вопрос, затем нажми «Я ответил»" |
| Карточка отвечающего | "🤔" + "Внимательно слушай партнёра, чтобы ответить на вопрос" |
| Заголовок перепрыгнутого хода | "⏭️ Этот ход был пропущен" |
| Подсказка перепрыгнутого хода | "Читающий пропустил этот вопрос — партнёр не услышал его, поэтому и отвечать не на что." + "Переходи к следующему ходу кнопкой «Следующий →» внизу." |
| Основная кнопка (читающий) | "Партнёр ответил ➔" |
| Основная кнопка (отвечающий) | "Я ответил ➔" |
| Footer: пред. | "← Предыдущий" |
| Footer: skip (только читающий) | "⏭️ Пропустить" |
| Footer: след. (если isNextOpened) | "Следующий →" |
| Пометка отвеченного | "✅ Этот вопрос был отвечен ранее" |
| Пометка пропущенного | "⚠️ Этот вопрос был пропущен ранее" |
| Завершение | "🎉 Сессия завершена!" + "Вы обсудили все вопросы в этом наборе." |
| Статистика (v5.0) | "Отвечено" / "Пропущено" / "Время" (MM:SS) / "Начали" (DD мес., HH:MM) |
| Завершение, кнопки | "Начать заново" / "На главную" |

### 8.4. Кнопки: условия видимости

| Кнопка | Когда видна |
|--------|-------------|
| ← На главную (шапка) | `!isFinished` |
| ← Предыдущий (footer) | `!isFinished`, disabled если `currentTurn === 0` |
| Партнёр ответил ➔ / Я ответил ➔ (основная) | `currentQuestion && !isFinished && !isJumpedTurn` |
| ⏭️ Пропустить (footer) | `amIReading && currentQuestion && !isJumpedTurn && !isFinished` |
| Следующий → (footer) | `isNextOpened && !isFinished` |

### 8.5. Keyboard navigation

```javascript
function onKeyDown(e) {
  if (isFinished.value) return
  // Стрелки навигации работают всегда
  if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); return }
  if (e.key === 'ArrowRight' && isNextOpened.value) { e.preventDefault(); handleNextTurn(); return }

  // Главная кнопка только у читающего на не-перепрыгнутом ходу
  if (!amIReading.value || isJumpedTurn.value) return
  if (e.key === 'Enter') { e.preventDefault(); handleNext() }
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') { e.preventDefault(); handleSkip() }
}
```

### 8.6. Тактильная отдача

```javascript
function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

function handleNext()     { nextQuestion();  vibrate(50) }
function handlePrev()     { prevQuestion();  vibrate(30) }
function handleSkip()     { skipQuestion();  vibrate([50, 100, 50]) }
function handleNextTurn() { nextTurn();      vibrate(50) }
```

На iOS вибрация недоступна — `navigator.vibrate` не имплементирован в Safari. Заглушка через `if` — UI работает корректно, просто без отдачи.

---

## 9. Глобальные стили и `index.html`

### 9.1. `src/style.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  padding:
    env(safe-area-inset-top)
    env(safe-area-inset-right)
    env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}

/* Reduced motion — отключаем flip-анимацию и pulse */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus-visible для keyboard-навигации */
button:focus-visible {
  outline: 2px solid #facc15;
  outline-offset: 2px;
}
```

`@keyframes flip` здесь **НЕ** определяется — он в `tailwind.config.js`.

### 9.2. `index.html`

```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0" />
    <meta name="theme-color" content="#4f46e5" />
    <meta name="description" content="Карточки вопросов для глубоких бесед" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Coffee Cards" />
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />
    <link rel="icon" type="image/png" href="favicon.ico" />
    <title>Random Coffee Cards</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

**Ключевые моменты:**
- `viewport-fit=cover` — позволяет контенту заходить под safe-area-insets (notch).
- `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style` — для full-screen на iOS.
- `apple-touch-icon` — иконка на домашнем экране iOS (180×180 PNG).
- `favicon.ico` — относительный путь, работает на любом поддомене.
- `lang="ru"` — для screen reader.

### 9.3. `src/main.js` и `src/App.vue`

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

createApp(App).use(router).mount('#app')
```

```vue
<!-- App.vue -->
<template>
  <router-view />
</template>

<script setup>
</script>
```

---

## 10. PWA: манифест, иконки, Service Worker

### 10.1. Иконки в `public/`

| Файл | Размер | Назначение |
|------|--------|------------|
| `icon-192.png` | 192×192 | Базовая иконка Android |
| `icon-512.png` | 512×512 | Иконка для установленных PWA |
| `icon-maskable-512.png` | 512×512 (10% padding) | Адаптивная иконка Android |
| `apple-touch-icon.png` | 180×180 | Иконка на домашнем экране iOS |
| `favicon.ico` | 32×32 | Favicon в браузере |

**Создание через sharp** (npm-пакет) из SVG-исходника с эмодзи ☕ и индиго-фиолетовым градиентом.

### 10.2. `registerType: 'prompt'` + UI уведомления об обновлении

```javascript
VitePWA({ registerType: 'prompt', /* ... */ })
```

- `prompt` — пользователь сам подтверждает обновление SW. Без авто-перезагрузки в середине сессии (важно для диалогового приложения — партнёр может ждать ответа).
- `autoUpdate` НЕ рекомендуется — перезагрузит вкладку в середине сессии, можно потерять прогресс.

**UI уведомления** через `useRegisterSW` из `virtual:pwa-register/vue` (в `App.vue`):

```vue
<script setup>
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const needRefresh = ref(false)
const offlineReady = ref(false)

const { updateServiceWorker } = useRegisterSW({
  onOfflineReady() { offlineReady.value = true },
  onNeedRefresh()   { needRefresh.value = true }
})

function update() { updateServiceWorker(true) }  // true = перезагрузить
function dismissUpdate() { needRefresh.value = false }
</script>
```

| Баннер | Когда показывается | Действие |
|--------|---------------------|---------|
| `✓ Готово к оффлайн` | `onOfflineReady` — SW впервые закэшировал ассеты | Авто-скрытие, можно закрыть ✕ |
| `🔄 Доступна новая версия` | `onNeedRefresh` — SW обнаружил новую версию | Кнопка «Обновить» (перезагрузка) или «✕ Позже» |

### 10.3. Кэш-стратегия: `NetworkFirst` для HTML + `StaleWhileRevalidate` для ассетов

Решает проблему «у одного пользователя старая версия, у другого новая» (рассинхрон). При наличии интернета браузер сначала спрашивает сервер, есть ли свежий `index.html`. Через 3 сек таймаута — fallback на кэш SW.

```javascript
VitePWA({
  registerType: 'prompt',
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
    navigateFallback: 'index.html',
    runtimeCaching: [
      {
        // HTML-навигация: NetworkFirst с таймаутом 3 сек
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'app-html',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 7 }  // 7 дней
        }
      },
      {
        // Ассеты (JS/CSS/иконки): StaleWhileRevalidate
        urlPattern: ({ request }) =>
          ['style', 'script', 'worker', 'image', 'font'].includes(request.destination),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'app-assets',
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }  // 30 дней
        }
      }
    ]
  }
})
```

**Логика:**

| Ресурс | Стратегия | Поведение |
|--------|-----------|-----------|
| HTML (`index.html`) | `NetworkFirst`, таймаут 3 сек | Сначала сеть → свежая версия. Если сеть медленная/оффлайн → кэш. Гарантирует, что оба пользователя с интернетом получают одинаковый HTML. |
| JS/CSS (с хешем в имени) | `StaleWhileRevalidate` | Быстро из кэша, в фоне проверяем свежую версию. При изменении содержимого URL меняется (`index-XXXX.js`) → кэш-мисс → свежая версия. |
| Иконки, manifest | `StaleWhileRevalidate` | То же самое. |
| Превышение лимита | `expiration` | HTML — 5 записей / 7 дней, ассеты — 60 записей / 30 дней. Старые удаляются. |

**Почему не `autoUpdate` или `skipWaiting + clientsClaim`**:
- `autoUpdate` — SW активируется немедленно, страница перезагружается. Если пользователь в середине сессии — теряется состояние. Неприемлемо для диалогового приложения.
- `skipWaiting + clientsClaim` — то же самое.
- `NetworkFirst` для HTML + `prompt` UI — пользователь сам решает, когда перезагрузить. Никаких сюрпризов.

### 10.4. Установка на главный экран — `InstallPrompt.vue`

**Android/Desktop Chrome (событие `beforeinstallprompt`):**

```vue
<script setup>
const deferredPrompt = ref(null)

function onBeforeInstallPrompt(e) {
  e.preventDefault()
  deferredPrompt.value = e  // Сохраняем событие для вызова prompt() позже
}

async function install() {
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'dismissed') {
    localStorage.setItem('install_dismissed', '1')
    dismissed.value = true
  }
  deferredPrompt.value = null
}
</script>
```

**iOS Safari** — `beforeinstallprompt` НЕ поддерживается. Определяем iOS Safari через UA и показываем текстовую инструкцию:

```
📱 Установить на iPhone
Нажмите «Поделиться» в Safari, затем «На главный экран»
```

**Не показывается в standalone-режиме** (PWA уже установлено и открыто с иконки):
```javascript
function detectStandalone() {
  if (navigator.standalone) return true  // iOS
  return window.matchMedia('(display-mode: standalone)').matches  // другие
}
```

**Запоминание отказа**: `localStorage['install_dismissed'] = '1'` — не показываем снова до ручного сброса. После установки — флаг сбрасывается.

### 10.5. `start_url` и `scope`

Динамически наследуются от `base` (см. §3.2). Для `r3code/random-coffee` → `start_url: '/random-coffee/'`, `scope: '/random-coffee/'`.

### 10.6. Оффлайн-сценарии

| Сценарий | Поведение |
|----------|----------|
| PWA установлено, открыто с иконки на домашнем экране | ✅ Работает оффлайн. SW отдаёт всё из кэша. |
| Первое открытие по ссылке из QR, есть интернет | ✅ Загружается, SW регистрируется, кэшируется. |
| Первое открытие по ссылке из QR, НЕТ интернета | ❌ Не откроется (нет кэша, нет сети). |
| Повторное открытие по ссылке, НЕТ интернета, SW ранее зарегистрирован | ✅ `navigateFallback: 'index.html'` отдаёт кэш. |
| После деплоя новой версии, у пользователя интернет | ✅ `NetworkFirst` для HTML — свежая версия через 3 сек. SW обновляется, UI показывает «Доступна новая версия». |
| После деплоя новой версии, пользователь в оффлайне | ⚠️ Работает старая версия. Обновление подтянется при появлении интернета. |

---

## 11. CI/CD: GitHub Actions

### 11.1. `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          NODE_ENV: production
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7
```

### 11.2. `.github/workflows/deploy-pages.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main, master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          NODE_ENV: production
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 11.3. Настройка репозитория

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**
2. `base` в `vite.config.js` определяется автоматически через `GITHUB_REPOSITORY`.
3. После пуша в `main` откройте `https://<user>.github.io/<repo-name>/`.

### 11.4. Таблица auto-detect

| Окружение | `GITHUB_REPOSITORY` | `base` |
|-----------|---------------------|--------|
| Локально | отсутствует | `/` |
| CI, репо `random-coffee` | `r3code/random-coffee` | `/random-coffee/` |
| CI, репо `<user>.github.io` | `<user>/<user>.github.io` | `/` (авто-пропуск) |

Ручное переопределение: `REPO_NAME=my-app npm run build` или `REPO_NAME= npm run build` для корневого домена.

---

## 12. Тестирование

### 12.1. Запуск

```bash
npm test           # однократно
npm run test:watch # watch-режим
```

104 теста в `tests/useDeck.test.js`. Все проходят.

### 12.2. Покрытие

**Чистые функции (без Vue, без localStorage):**
- `makeRandom` — детерминированность, диапазон [0,1)
- `generateOrder` — длина, уникальность, детерминированность, разный seed → разные порядки
- `decks` — наличие deep/work, 10 порядков A..J, уникальные последовательности, все id на месте

**URL helpers:**
- `buildShareUrl` — генерация, инверсия роли (reader ↔ listener), опциональный `turn`
- `parseShareUrl` — парсинг, валидация, round-trip

**Singleton state (через useDeck):**
- `startSession` — устанавливает состояние, создаёт запись в истории
- `nextQuestion` / `prevQuestion` / `skipQuestion` (+2)
- `amIReading` — чередование для reader/listener
- `isAnswered` / `isSkipped` — приоритет answered над skipped
- `activeSkippedCount` — корректный счётчик
- `startSession` с `startTurn` (валидация диапазона)
- `isFinished` (включая isFinished при skip +2)
- `hasSavedSession` — false если isFinished, false при пустом localStorage, defensive check на currentTurn >= length
- Восстановление после перезагрузки модуля

**Sessions history (+13 тестов):**
- `startSession` создаёт запись, устанавливает `activeSessionId`
- Несколько `startSession` → несколько записей
- `nextQuestion` обновляет запись в истории
- `loadSession` — переключение, сохранение прогресса, false для несуществующего id, не портит другие сессии
- `deleteSession` — удаление, сброс активной при удалении текущей, не сброс при удалении чужой
- Завершённая сессия помечается `completed: true`
- `resetProgress` помечает завершённой, оставляет в истории
- После `resetProgress` можно начать новую — старая остаётся в истории
- **Миграция v1 → v2:** старый `game_state` конвертируется в сессию
- **Миграция завершённой v1:** `currentTurn >= sequence.length` → `completed: true` (а не `false`)

**Navigation по ходам (+9 тестов, v4):**
- `nextTurn` — переход без модификации passed/skipped
- `nextTurn` на последнем ходе — не выходит за пределы
- `isJumpedTurn` true после skip +2 и prev на +1 (перепрыгнутый ход)
- `isJumpedTurn` false на обычном ходе (вопрос в passedIds или skippedIds)
- `isNextOpened` false в начале (следующий ещё не открывали)
- `isNextOpened` true когда следующий ход в пределах maxReachedTurn
- `isNextOpened` false на последнем ходе (нет следующего)
- Защита от дублей в `nextQuestion` (не добавляет в passedIds если уже там)
- Защита от дублей в `skipQuestion` (не добавляет в skippedIds если уже там)

**v5.0: Переименование сессий (+5 тестов):**
- `renameSession` — установка имени, обрезка до 128, сброс в null, несуществующий id, trim пробелов

**v5.0: Таймер и статистика (+7 тестов):**
- `formatDuration` — 0 мс, 65с, 1ч, отрицательное
- `startSession` устанавливает `startTime`, `elapsedMs=0`, `name=null`
- `loadSession` восстанавливает `name`, `startTime`, `elapsedMs`
- `migrateV1ToV2` сохраняет `startTime` из `updatedAt`, `name=null`, `elapsedMs=0`

**Import validation:**
- Валидный state импортируется как новая сессия
- Отклоняет неизвестную колоду, невалидный orderIndex, невалидную роль, битой JSON

### 12.3. Lighthouse PWA-аудит

После деплоя на GitHub Pages: Chrome DevTools → Lighthouse → Mobile → PWA.

Чек-лист:
- [ ] Installable
- [ ] Offline работает
- [ ] Maskable icon не обрезается
- [ ] Apple touch icon
- [ ] Theme color
- [ ] Viewport с `viewport-fit=cover`

### 12.4. Тесты на устройствах

| Платформа | Что проверять |
|-----------|---------------|
| iOS Safari 16+ | Install to Home Screen, dark mode, safe areas, нет vibration (норма) |
| Android Chrome | Install, vibration, dark mode, safe areas, maskable icon |
| Desktop Chrome | Install, keyboard nav (←, →, Enter, S) |

### 12.5. Сценарии регресса

| # | Сценарий | Ожидаемый результат |
|---|----------|---------------------|
| 1 | Выбрать колоду → порядок → роль → начать → нажать "Назад" в браузере | Сессия в истории, на setup показывается "Продолжить сессию" |
| 2 | Начать → несколько вопросов → закрыть вкладку → открыть снова | Сессия восстанавливается на правильном вопросе, maxReachedTurn сохранён |
| 3 | Испортить `coffee_sessions` в localStorage → перезагрузить | Без падения, история сбрасывается, console.warn |
| 4 | Импортировать битый JSON | Alert с понятным сообщением |
| 5 | Прямой заход на `/game` без активной сессии | Редирект на `/` |
| 6 | Заход на `/?deck=deep&order=3&role=listener&turn=5` | Форма предзаполнена, "Начать сессию" открывает с вопроса 6 |
| 7 | Skip → "← Предыдущий" (дважды) → на пропущенном вопросе "⚠️ Пропущен ранее" | ✅ |
| 8 | Skip → "← Предыдущий" (×2) → "Партнёр ответил" → "← Предыдущий" → "✅ Отвечен ранее", счётчик пропусков 0 | ✅ |
| 9 | Завершить все вопросы → "🎉 Сессия завершена!" без шапки/роли | ✅ |
| 10 | "На главную" после завершения → нет блока "Продолжить сессию" | ✅ |
| 11 | Начать сессию → "Новая" → старая в истории с ✅, можно "↻ Снова" | ✅ |
| 12 | Несколько сессий в истории → "Открыть" переключает | ✅ |
| 13 | Удаление сессии с подтверждением | ✅ |
| 14 | Skip +2 → "← Предыдущий" → попали на перепрыгнутый ход | "⏭️ Этот ход был пропущен", нет основной кнопки, только "← Предыдущий" и "Следующий →" |
| 15 | На перепрыгнутом ходу → "Следующий →" → возврат на следующий ход | ✅, корректный вопрос |
| 16 | На отвеченном ходе → "← Предыдущий" → "Следующий →" | Возврат на отвеченный, без дублирования в passedIds |
| 17 | Читающий видит жёлтую кнопку "Партнёр ответил" | ✅ |
| 18 | Отвечающий видит зелёную кнопку "Я ответил" | ✅ |
| 19 | Переключение светлая/тёмная тема в игре | Реально разные фоны (indigo/emerald пастельные в светлой, насыщенные в тёмной) |
| 20 | Основная кнопка не прыгает по высоте при смене карточки на 🤔 | ✅ (min-height: 35vh на main) |
| 21 | После деплоя новой версии, пользователь с интернетом | `NetworkFirst` отдаёт свежий HTML за 3 сек → баннер «Доступна новая версия» |
| 22 | После деплоя, пользователь отклонил «Обновить» | Баннер исчезает, SW waiting. При следующем визите снова покажет |
| 23 | После деплоя, пользователь в оффлайне | Работает старая версия из кэша SW |
| 24 | Открыл PWA с иконки на домашнем экране (standalone) | Подсказка «Установить» НЕ показывается |
| 25 | Открыл в браузере впервые на Android Chrome | Подсказка «Установить приложение» появляется (после взаимодействия с сайтом) |
| 26 | На iOS Safari | Текстовая инструкция «Поделиться → На главный экран» |
| 27 | Отклонил подсказку «Установить» | `localStorage['install_dismissed'] = '1'`, не показывается снова |
| 28 | История сессий на мобильном — название не обрезается | Карточка в 2 ряда: название+дата, ниже — кнопки |
| 29 | Таймер ⏱ MM:SS в шапке GameView — растёт раз в секунду | ✅ |
| 30 | При goBack на главную — таймер останавливается (накопит elapsedMs) | ✅ |
| 31 | При continueSession — таймер resume (продолжает расти) | ✅ |
| 32 | Завершение сессии — блок статистики: Отвечено/Пропущено/Время/Начали | ✅ |
| 33 | Нажать ✎ на сессии в истории — inline input под карточкой | ✅ |
| 34 | Ввести имя → ✓ → имя показано жирным, колода+порядок — мелким | ✅ |
| 35 | Имя > 128 символов → обрезается до 128 | ✅ |
| 36 | Пустое имя (только пробелы) → сбрасывается в null | ✅ |
| 37 | Пометка «Вы обсудили все вопросы в этом наборе» (не «в этом порядке») | ✅ |

---

## 13. Accessibility checklist

### 13.1. Семантика и ARIA

- [x] Все `<button>` имеют видимый текст или `aria-label`
- [x] Группы кнопок обёрнуты в `role="group"` с `aria-label`
- [x] `aria-pressed` на toggle-кнопках (тема, колода, порядок, роль)
- [x] `aria-live="polite"` на индикаторе прогресса
- [x] `role="banner"` на `<header>`, `role="main"` на контенте, `role="contentinfo"` на footer
- [x] `lang="ru"` на `<html>`
- [x] `role="note"` на пометках "Отвечен/Пропущен ранее"

### 13.2. Контрасты (WCAG AA 4.5:1 для body)

| Элемент | Контраст | OK |
|---------|----------|----|
| Текст на `bg-indigo-900` | 9.7:1 | ✅ |
| Текст на `bg-yellow-500` | 8.6:1 | ✅ |
| `opacity-70` подсказки | ~5:1 | ✅ |

### 13.3. Keyboard navigation

- [x] Tab проходит по всем интерактивным элементам
- [x] Enter активирует сфокусированную кнопку
- [x] В GameView: `→`/`Enter` = следующий, `←` = предыдущий, `S` = skip (только у читающего)
- [x] `:focus-visible` стили видны (жёлтый outline)
- [x] Disabled-кнопки имеют `aria-disabled` или `disabled` атрибут

### 13.4. Motion sensitivity

- [x] `prefers-reduced-motion: reduce` отключает flip-анимацию
- [x] `animate-pulse` тоже отключается через тот же global rule

### 13.5. Screen reader

- [x] VoiceOver (iOS): индикатор роли озвучивается через `aria-live`
- [x] Кнопки имеют внятные подписи
- [x] Прогресс ("Вопрос 3 из 15") озвучивается при изменении

---

## 14. Критерии приёмки

Итого **44 пункта**. Все должны быть ✅.

### PWA и оффлайн (3)

- [x] Устанавливается как PWA (Chrome install / iOS Add to Home Screen)
- [x] Работает полностью оффлайн после установки
- [x] Lighthouse PWA score ≥ 90

### Кэш-стратегия и обновления (4) — v4.3

- [x] `NetworkFirst` для HTML с таймаутом 3 сек — при наличии интернета пользователь получает свежую версию
- [x] `StaleWhileRevalidate` для ассетов — мгновенно из кэша, в фоне проверяем свежую версию
- [x] `registerType: 'prompt'` — без авто-перезагрузки в середине сессии
- [x] UI уведомления «Доступна новая версия» с кнопкой «Обновить» через `useRegisterSW`

### Установка на главный экран (3) — v4.2

- [x] Кнопка «Установить приложение» на Android/Desktop Chrome через `beforeinstallprompt`
- [x] Текстовая инструкция «Поделиться → На главный экран» на iOS Safari
- [x] Не показывается в standalone-режиме (PWA уже установлено) + запоминание отказа в `localStorage['install_dismissed']`

### UX (5)

- [x] Выбор колоды (deep/work), порядка (A-J), роли ("Я читаю первым" / "Я слушаю первым")
- [x] Роли чередуются: читающий видит карточку и жмёт "Партнёр ответил", отвечающий не видит карточку и жмёт "Я ответил"
- [x] Skip = пропуск всего раунда (+2 к currentTurn)
- [x] Кнопки под карточкой/подсказкой (удобный тап на телефоне)
- [x] Кнопка "⏭️ Пропустить" с надписью

### Кнопки и навигация GameView (5) — v4

- [x] Основная кнопка ("Партнёр ответил" / "Я ответил") отдельной строкой под main, не прыгает по высоте (min-height: 35vh на main)
- [x] Footer отдельно с навигационными кнопками "← Предыдущий", "⏭️ Пропустить", "Следующий →"
- [x] "Партнёр ответил" — жёлтая (`bg-yellow-500`), "Я ответил" — зелёная (`bg-emerald-500`) — визуальное различение режимов
- [x] Кнопка "← Предыдущий" с надписью (раньше была только стрелка)
- [x] Кнопка "Следующий →" видна только если следующий ход в пределах `maxReachedTurn`

### Тема в GameView (2) — v4

- [x] Читающий — индиго фон (`bg-indigo-100` светлая / `bg-indigo-950` тёмная)
- [x] Отвечающий — изумруд фон (`bg-emerald-100` светлая / `bg-emerald-950` тёмная) — темы реально отличаются

### Перепрыгнутый ход (2) — v4

- [x] После skip +2 → "← Предыдущий" попадаем на перепрыгнутый ход с заголовком "⏭️ Этот ход был пропущен"
- [x] На перепрыгнутом ходу нет основной кнопки и "⏭️ Пропустить" — только "← Предыдущий" и "Следующий →"

### Сохранение и история (4)

- [x] Прогресс сохраняется в `coffee_sessions` + `coffee_active_session_id` (включая `maxReachedTurn`)
- [x] История сессий: можно параллельно вести несколько, переключаться, удалять
- [x] "↻ Снова" для завершённой сессии — создаёт новую с теми же параметрами
- [x] Авто-миграция со старого `game_state` (v1) в новую схему (v2), с корректным `completed: true` для завершённых v1-сессий

### Share и синхронизация (3)

- [x] QR-код share-ссылки с инверсией роли (reader ↔ listener)
- [x] Опциональный `turn=N` для продолжения с того же вопроса
- [x] QR-код в блоке "Продолжить сессию"

### Импорт/Экспорт (2)

- [x] Экспорт в JSON работает
- [x] Импорт из JSON валидирует структуру, создаёт новую сессию

### Тема (3)

- [x] Светлая/тёмная/авто переключается
- [x] Авто-тема реагирует на смену системной без перезагрузки
- [x] Выбор сохраняется в `theme_preference`

### Адаптив (3)

- [x] `min-h-dvh` (не `min-h-screen`)
- [x] `env(safe-area-inset-*)` учитываются
- [x] Maskable иконка не обрезается на Android

### Тактильность и motion (2)

- [x] Вибрация на Android (на iOS без вибрации, не ломается)
- [x] `prefers-reduced-motion` отключает анимации

### Accessibility (2)

- [x] `aria-label` / `aria-pressed` / `aria-live` на ключевых элементах
- [x] Keyboard nav (Tab, Enter, стрелки в GameView)

### Качество кода (1) — v4

- [x] 85 тестов Vitest проходят, защита от дублей в `nextQuestion`/`skipQuestion`, `isLoading` флаг против гонок в `loadSession`

### Управление сессиями v5.0 (6) — v5.0

- [x] Переименование сессий через ✎ → inline input, ≤128 символов, trim, пустое → null
- [x] Имя сессии показывается жирным, колода+порядок — мелким шрифтом под ним
- [x] Таймер ⏱ MM:SS в шапке GameView, обновляется раз в секунду, пауза при goBack
- [x] Накопленное время `elapsedMs` сохраняется в Session, переносится при экспорте/импорте
- [x] Статистика на экране завершения: Отвечено / Пропущено / Время / Начали
- [x] 104 теста Vitest проходят (+12: renameSession 5, formatDuration 4, startTime/elapsedMs 3)

---

## 15. Известные ограничения и будущие доработки

### Не работает в v5.11

1. **`navigator.vibrate` на iOS.** Web Vibration API не имплементирован в Safari. Заглушка — UI работает, но без отдачи.

2. **Синхронизация между устройствами** — только через выбор одинакового "порядка" или share-ссылку с QR. Реального мультиплеера нет.

3. **Локализация** — только русский. i18n планируется в v6.

### Реализованные фичи v5.1–v5.11

| Версия | Фича | Подход |
|--------|------|--------|
| v5.1.0 | Кастомные колоды | Загрузка из файла, хранение в `coffee_custom_decks`, `decks` = computed (встроенные + кастомные). `deckId` валидация, конфликт → новое имя. Лимит 20. |
| v5.1.0 | Полный бэкап | `exportBackup()` (все сессии + все кастомные колоды), `importBackup()`. |
| v5.2.0 | Каталог колод | `fetch()` на GitHub Pages из репо `r3code/random-coffee-decks`. Простой список + поиск. Кэш 24ч. Кнопка «Проверить обновления» — только тексты, не структура. |
| v5.3.0 | Категории вопросов внутри колод | Разметка `deep` (5) и `work` (5). Формат: `categories` + `categoryId` в вопросах. Цветовая полоска в GameView. |
| v5.3.0 | Шкала прогресса | Ячейки по `currentOrder.sequence`. Отвечен (зелёный) / Пропущенный (оранжевый штрих) / Текущий (жёлтая рамка) / Будущий (серый). |
| v5.4.0 | Единый каталог (VSCode-like) | Встроенные + загруженные в одном списке с бейджами, поиск + фильтры. `sourcePath` метаданные. |
| v5.5.0 | Edge cases | Откат `saveCustomDecks`, `deleteDeck` активной сессии, валидация (имя, уникальные q.id), `loadCatalog` дефолт `lang`, 404 в `checkDeckUpdates`. |
| v5.6.0 | Progressive disclosure колоды | После выбора — компактная плашка + `✎ Сменить`, автоскролл к шагу 2. |
| v5.7.0 | Progressive disclosure шагов 2/3 | После выбора порядка/роли — плашка + `✎ Сменить`, автоскролл. QR-блок с копированием ссылки. |
| v5.8.0 | Единообразие + счётчики + swipe back | Счётчик «Все» включает удалённые колоды; счётчик в «Доступны для загрузки»; кнопка «Обновить» стилизована; полная карточка колоды после выбора; карточка на «Продолжить сессию» стандартизирована; QR-блок стандартизирован; browser back закрывает форму через `history.pushState`. |
| v5.9.0 | Карточка-кнопка «Продолжить сессию» | Вся карточка колоды + кнопка «Продолжить» — один `<button>`. Тап в любом месте карточки вызывает continueSession. |
| v5.10.0 | Умные счётчики + переименования | Счётчики фильтров учитывают активный поиск; убран фильтр «Встроенные»; фильтр «Загруженные» → «Мои колоды»; секции «ЗАГРУЖЕННЫЕ» → «МОИ КОЛОДЫ», «ДОСТУПНЫ ДЛЯ ЗАГРУЗКИ» → «КАТАЛОГ». |
| v5.11.0 | Категории колод + 4 новые колоды | `deckCategory` (7 категорий: couples, first-date, friendship, family, work, self, party); 4 новые встроенные колоды (couples, first-date, friends, family) по 12 вопросов; бейджи в порядке `[Категория] [Тип] [RU]`; бейдж в шапке GameView; второй ряд чипов-фильтров по категориям; валидация slug'а. |

### Планируется в v6+

| Фича | Подход |
|------|--------|
| Мультиплеер | WebRTC data channels для синхронизации между устройствами |
| i18n | `vue-i18n` с ленивой загрузкой locale-файлов (английский, испанский) |
| История ответов | Сохранение текстовых ответов в каждой сессии |
| Web Haptics API | Когда спецификация стабилизируется — тактильная отдача на iOS |
| Axe-core в CI | Автоматизированная проверка accessibility |
| Таймер на вопрос | Опциональный таймер, чтобы партнёры не затягивали ответы |

### Совместимость браузеров

- Vue 3.4+, Vite 5+, Tailwind 3.x (фиксация обязательна)
- Chrome 90+, Safari 16+, Firefox 88+
- iOS 16+ (для `matchMedia.addEventListener`, `display: standalone`, viewport-fit)

---

## Приложение A. Команды

```bash
npm install         # установка зависимостей
npm run dev         # dev-сервер на http://localhost:5173
npm run build       # production-сборка в dist/
npm run preview     # предпросмотр продакшен-сборки
npm test            # 104 теста, однократно
npm run test:watch  # watch-режим
```

## Приложение B. Сценарий "первого использования"

1. Открыть `https://r3code.github.io/random-coffee/`
2. Выбрать колоду (например "Глубокие мысли")
3. Выбрать порядок (например "A")
4. Выбрать роль ("Я читаю первым")
5. Под QR-кодом видна share-ссылка: `?deck=deep&order=0&role=listener`
6. Партнёр сканирует QR → открывается предзаполненная форма с "Я слушаю первым"
7. Оба нажимают "Начать сессию"
8. Читающий видит первый вопрос, читает вслух, партнёр отвечает
9. Читающий жмёт "Партнёр ответил ➔" → отвечающий видит "Теперь ты отвечаешь" без карточки
10. Отвечающий жмёт "Я ответил ➔" → снова читающий видит следующий вопрос
11. И так до "🎉 Сессия завершена!"
12. Можно "Начать заново" (сброс + новая сессия) или "На главную" (сессия в истории с ✅)

## Приложение C. Чек-лист перед релизом

- [ ] `npm run build` без warnings
- [ ] `npm test` — 104/104 passed
- [ ] CI на GitHub Actions зелёный
- [ ] Деплой на GitHub Pages успешен
- [ ] Lighthouse PWA score ≥ 90
- [ ] Тест на iOS Safari + Android Chrome пройден
- [ ] Все 37 сценариев регресса пройдены
- [ ] `prefers-reduced-motion` отключает анимации
- [ ] Keyboard-навигация работает (←, →, Enter, S)
- [ ] Цвета кнопок "Партнёр ответил" (жёлтая) / "Я ответил" (зелёная) различимы
- [ ] Перепрыгнутый ход корректно показывается (после skip +2 → prev)
- [ ] Светлая и тёмная тема в GameView реально отличаются (indigo/emerald)
