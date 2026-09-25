import { ref, computed, watch } from 'vue'
import { decks as builtinDecks, deckIds as builtinDeckIds, makeRandom, generateOrder } from '@/data/decks'

const SCHEMA_VERSION = 3  // v3: кастомные колоды
const sessionsKey = 'coffee_sessions'
const activeSessionIdKey = 'coffee_active_session_id'
const themeKey = 'theme_preference'
const customDecksKey = 'coffee_custom_decks'

// v5.4: sourcePath — метаданные происхождения колоды. Не показывается в UI,
// хранится для диагностики и будущих фич.
//   'embedded'              — встроенная колода (из data/decks.js)
//   '<file.name>'           — импортирована из файла (только имя, без пути)
//   '/path/in/repo.json'    — загружена из каталога (path из URL без домена)
export const SOURCE_EMBEDDED = 'embedded'

// Лимит на количество хранимых сессий и кастомных колод.
const MAX_SESSIONS = 20
const MAX_CUSTOM_DECKS = 20

// ─── Генерация ID ───────────────────────────────────────────────
function genId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

// ─── Custom decks storage ───────────────────────────────────────
function loadCustomDecks() {
  try {
    const raw = localStorage.getItem(customDecksKey)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    console.warn('[coffee-cards] Corrupted custom decks, resetting:', e)
    localStorage.removeItem(customDecksKey)
    return []
  }
}

function saveCustomDecks(arr) {
  try {
    localStorage.setItem(customDecksKey, JSON.stringify(arr))
  } catch (e) {
    console.error('[coffee-cards] localStorage write failed:', e)
  }
}

// v5.1: deckId validation — ^[a-z0-9-]+$, 3-64 символа
function isValidDeckId(id) {
  // v5.3: разрешаем _ и заглавные буквы для кодов языка (ru_RU, en_US)
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 3 && id.length <= 64
}

// v5.1: валидация формата колоды при импорте
function validateDeckFormat(deck) {
  if (!deck || typeof deck !== 'object') return 'Некорректный формат колоды'
  if (!isValidDeckId(deck.deckId)) return `Некорректный deckId: "${deck.deckId}" (нужны a-z, 0-9, дефис, 3-64 символа)`
  if (!deck.name || typeof deck.name !== 'string' || deck.name.length > 128) return 'Имя колоды обязательно, до 128 символов'
  if (!Array.isArray(deck.questions) || deck.questions.length === 0) return 'Колода должна содержать хотя бы один вопрос'
  for (const q of deck.questions) {
    if (!q.id || typeof q.id !== 'string') return 'Каждый вопрос должен иметь id'
    if (!q.text || typeof q.text !== 'string') return 'Каждый вопрос должен иметь text'
  }
  // v5.3: lang — опц., default ru_RU, формат ^[a-z]{2}_[A-Z]{2}$
  if (deck.lang !== undefined) {
    if (typeof deck.lang !== 'string' || !/^[a-z]{2}_[A-Z]{2}$/.test(deck.lang)) {
      return `lang "${deck.lang}" должен быть в формате ru_RU (2 буквы _ 2 буквы)`
    }
  }
  // v5.3: baseDeckId — опц., валидация как deckId без суффикса языка
  if (deck.baseDeckId !== undefined && deck.baseDeckId !== null) {
    if (typeof deck.baseDeckId !== 'string' || !/^[a-z0-9-]+$/.test(deck.baseDeckId) || deck.baseDeckId.length < 3) {
      return `baseDeckId "${deck.baseDeckId}" должен быть a-z, 0-9, дефис, 3+ символа`
    }
  }
  // v5.3: categories — проверяем, что каждый categoryId вопроса ссылается на существующую категорию
  if (deck.categories) {
    if (typeof deck.categories !== 'object') return 'categories должны быть объектом { id: { name, color } }'
    for (const [catId, cat] of Object.entries(deck.categories)) {
      if (!cat.name || !cat.color) return `Категория "${catId}" должна иметь name и color`
    }
    // Проверяем ссылки из вопросов
    for (const q of deck.questions) {
      if (q.categoryId && !deck.categories[q.categoryId]) {
        return `Вопрос "${q.id}" ссылается на неизвестную категорию "${q.categoryId}"`
      }
    }
  }
  if (deck.orders) {
    if (!Array.isArray(deck.orders) || deck.orders.length === 0) return 'orders должны быть массивом (или отсутствовать для авто-генерации)'
    for (const o of deck.orders) {
      if (!o.id || !o.name || !Array.isArray(o.sequence)) return 'Каждый order должен иметь id, name, sequence'
      if (o.sequence.length !== deck.questions.length) return 'sequence.length должен совпадать с количеством вопросов'
    }
  }
  return null  // нет ошибок
}

// v5.1: нормализация колоды — добавляет orders если их нет, генерирует 10
function normalizeDeck(deck) {
  const questions = deck.questions.map(q => ({
    id: q.id,
    text: q.text,
    ...(q.categoryId ? { categoryId: q.categoryId } : {})
  }))
  let orders = deck.orders
  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    // Авто-генерация 10 порядков A..J
    orders = Array.from({ length: 10 }, (_, i) => ({
      id: `order_${i + 1}`,
      name: String.fromCharCode(65 + i),
      sequence: generateOrder(questions, (i + 1) * 12345)
    }))
  }
  return {
    deckId: deck.deckId,
    name: deck.name.slice(0, 128),
    description: deck.description || '',
    source: deck.source || null,
    sourcePath: deck.sourcePath || null,           // v5.4: embedded | <file.name> | <URL path>
    version: deck.version || 1,
    lang: deck.lang || 'ru_RU',                    // v5.3
    baseDeckId: deck.baseDeckId || null,            // v5.3
    questions,
    orders,
    categories: deck.categories || null,
    isCustom: true,
    createdAt: deck.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

// ─── Sessions storage ────────────────────────────────────────────
function loadSessions() {
  try {
    const raw = localStorage.getItem(sessionsKey)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
  } catch (e) {
    console.warn('[coffee-cards] Corrupted sessions, resetting:', e)
    localStorage.removeItem(sessionsKey)
    return []
  }
}

function saveSessions(arr) {
  try {
    localStorage.setItem(sessionsKey, JSON.stringify(arr))
  } catch (e) {
    console.error('[coffee-cards] localStorage write failed:', e)
  }
}

// ─── pruneSessions: ограничивает количество сессий до MAX_SESSIONS ──
// Удаляет самые старые (по updatedAt), но защищает:
//   - активную сессию (пользователь с ней работает)
//   - protectedId — только что добавленную/импортированную (защита от авто-удаления сразу после добавления)
// Возвращает обрезанный массив.
function pruneSessions(arr, { protectedId = null } = {}) {
  if (arr.length <= MAX_SESSIONS) return arr
  const activeId = loadActiveSessionId()
  const protect = new Set([protectedId, activeId].filter(Boolean))
  // Сортируем по updatedAt DESC (свежие первыми), без изменения исходного массива
  const sorted = [...arr].sort((a, b) =>
    new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  )
  // Берём top MAX_SESSIONS, но гарантируем что защищённые там есть
  const keep = new Set()
  for (const s of sorted) {
    if (s.id && protect.has(s.id)) keep.add(s.id)
  }
  for (const s of sorted) {
    if (keep.size >= MAX_SESSIONS) break
    keep.add(s.id)
  }
  return arr.filter(s => keep.has(s.id))
}

function loadActiveSessionId() {
  return localStorage.getItem(activeSessionIdKey) || null
}

function saveActiveSessionId(id) {
  if (id) localStorage.setItem(activeSessionIdKey, id)
  else localStorage.removeItem(activeSessionIdKey)
}

// ─── Migration from v1 (single game_state) ──────────────────────
function migrateV1ToV2() {
  try {
    const oldRaw = localStorage.getItem('game_state')
    if (!oldRaw) return
    const old = JSON.parse(oldRaw)
    if (!old.deckId || old.orderIndex === null || !old.role) return

    // Вычисляем completed на основе currentTurn vs длины последовательности,
    // иначе завершённая v1 сессия мигрирует как "В процессе" — баг.
    const total = decks.value[old.deckId]?.orders?.[old.orderIndex]?.sequence.length ?? 0
    const completed = total > 0 && (old.currentTurn || 0) >= total

    const id = genId()
    const session = {
      id,
      deckId: old.deckId,
      orderIndex: old.orderIndex,
      currentTurn: old.currentTurn || 0,
      role: old.role,
      passedIds: old.passedIds || [],
      skippedIds: old.skippedIds || [],
      name: old.name || null,                       // v5.0: пользовательское имя сессии
      startTime: old.startTime || old.createdAt || old.updatedAt || new Date().toISOString(),  // v5.0: когда начали
      elapsedMs: old.elapsedMs || 0,                // v5.0: накопленное время игры (мс)
      maxReachedTurn: old.maxReachedTurn ?? old.currentTurn ?? 0,
      createdAt: old.updatedAt || new Date().toISOString(),
      updatedAt: old.updatedAt || new Date().toISOString(),
      completed
    }
    saveSessions([session])
    saveActiveSessionId(id)
    localStorage.removeItem('game_state')
    console.log('[coffee-cards] Migrated v1 state to v2 session')
  } catch (e) {
    console.warn('[coffee-cards] v1→v2 migration failed:', e)
  }
}

// ─── Инициализация ──────────────────────────────────────────────
// migrateV1ToV2 вызывается ПОСЛЕ создания decks computed (ниже), т.к. использует decks.value[].

const sessions = ref(loadSessions())
const activeSessionId = ref(loadActiveSessionId())
const customDecks = ref(loadCustomDecks())

// v5.1: decks — computed: встроенные + кастомные. Единый объект как data/decks.js.
const decks = computed(() => {
  const result = { ...builtinDecks }
  for (const d of customDecks.value) {
    result[d.deckId] = d
  }
  return result
})

// v5.1: deckIds — все ID (встроенные + кастомные)
const deckIds = computed(() => Object.keys(decks.value))

// v5.4: isCustomDeck — true если deckId принадлежит кастомной (загруженной) колоде.
const isCustomDeck = (deckIdArg) => customDecks.value.some(d => d.deckId === deckIdArg)

// v5.4: catalogDecks — единый список колод для UI-каталога.
// Каждый элемент: { ...deck, kind: 'builtin' | 'custom', sourcePath }
// Сортировка: встроенные сверху (по алфавиту имени), затем кастомные (по алфавиту имени).
//   - У встроенных sourcePath = 'embedded' (константа SOURCE_EMBEDDED)
//   - У кастомных sourcePath берётся из deck.sourcePath (может быть null для старых)
const catalogDecks = computed(() => {
  const builtin = Object.values(builtinDecks).map(d => ({
    ...d,
    kind: 'builtin',
    sourcePath: SOURCE_EMBEDDED
  }))
  const custom = customDecks.value.map(d => ({
    ...d,
    kind: 'custom',
    sourcePath: d.sourcePath ?? null
  }))
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'ru')
  builtin.sort(byName)
  custom.sort(byName)
  return [...builtin, ...custom]
})

// v5.1: миграция вызывается после создания decks (т.к. использует decks.value)
migrateV1ToV2()
// После миграции — перезагружаем sessions и activeSessionId (миграция писала в localStorage,
// а refs уже были загружены до миграции)
sessions.value = loadSessions()
activeSessionId.value = loadActiveSessionId()

// ─── Module-level refs (SINGLETON) ───────────────────────────────
// Активная сессия — это запись из sessions с id === activeSessionId
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
const theme       = ref(localStorage.getItem(themeKey) || 'auto')

// v5.0: имя сессии (пользовательское, для истории — «помнить с кем говорил»)
const sessionName = ref(activeSession.value?.name ?? null)
// v5.0: startTime — когда сессия началась (для статистики и таймера)
const startTime = ref(activeSession.value?.startTime ?? null)
// v5.0: elapsedMs — накопленное время игры в миллисекундах.
// При goBack (пауза) — прибавляем к elapsedMs время с момента resumeLast.
// При openSession/continueSession — resumeLast = Date.now() (откуда продолжаем считать).
const elapsedMs = ref(activeSession.value?.elapsedMs ?? 0)
// v5.3: lastActiveAt — когда последний раз отвечали/пропускали (для истории)
const lastActiveAt = ref(activeSession.value?.lastActiveAt ?? activeSession.value?.updatedAt ?? null)
// resumeLast — когда продолжили после паузы. module-level, не сохраняется
// (при перезагрузке страницы elapsedMs уже актуален из last save).
let resumeLast = 0

// maxReachedTurn: максимальный ход, до которого мы доходили в текущей сессии.
const maxReachedTurn = ref(activeSession.value?.currentTurn ?? 0)

// ─── Derived ────────────────────────────────────────────────────
const deck = computed(() => deckId.value ? decks.value[deckId.value] : null)

const currentOrder = computed(() => {
  if (!deck.value || orderIndex.value === null) return null
  return deck.value.orders[orderIndex.value] || null
})

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

const isAnswered = computed(() => {
  return !!currentQuestion.value && passedIds.value.includes(currentQuestion.value.id)
})

const isSkipped = computed(() => {
  if (!currentQuestion.value) return false
  const id = currentQuestion.value.id
  return skippedIds.value.includes(id) && !passedIds.value.includes(id)
})

// isJumpedTurn: текущий ход был перепрыгнут skip'ом (читатель сделал skip +2
// от своего хода, ответчик на +1 ходу не услышал вопрос — отвечать не на что).
// Определяется так: currentTurn < maxReachedTurn (мы ВЕРНУЛИСЬ назад) И
// текущий вопрос НЕ в passedIds и НЕ в skippedIds (никто его не открывал).
// На новом ходу (currentTurn === maxReachedTurn) — не jumped, даже если
// текущий вопрос ещё не в passed/skipped (это нормально, его только что открыли).
const isJumpedTurn = computed(() => {
  if (!currentQuestion.value) return false
  if (currentTurn.value >= maxReachedTurn.value) return false  // новый ход, не вернулись назад
  const id = currentQuestion.value.id
  return !passedIds.value.includes(id) && !skippedIds.value.includes(id)
})

// nextQuestionId: id следующего вопроса (для проверки, был ли он уже открыт).
const nextQuestionId = computed(() => {
  if (!currentOrder.value) return null
  const nextIdx = currentTurn.value + 1
  if (nextIdx >= currentOrder.value.sequence.length) return null
  return currentOrder.value.sequence[nextIdx]
})

// isNextOpened: true если следующий ход находится в пределах maxReachedTurn
// (мы туда уже доходили). Используется для показа кнопки "Следующий →".
// На перепрыгнутом ходе следующий ход — это обычно ход, на котором мы уже
// были после skip'а, поэтому кнопка "Следующий →" всегда видна.
const isNextOpened = computed(() => {
  if (!currentOrder.value) return false
  const nextTurn = currentTurn.value + 1
  if (nextTurn >= currentOrder.value.sequence.length) return false
  return nextTurn <= maxReachedTurn.value
})

const activeSkippedCount = computed(() => {
  return skippedIds.value.filter(id => !passedIds.value.includes(id)).length
})

const isFinished = computed(() => {
  return !!currentOrder.value && currentTurn.value >= currentOrder.value.sequence.length
})

// hasSavedSession: true только если есть АКТИВНАЯ (не завершённая) сессия.
// Завершённые сессии остаются в истории, но не показываются в блоке "Продолжить".
// Защитная проверка: если currentTurn >= sequence.length, тоже считаем завершённой.
const hasSavedSession = computed(() => {
  if (!activeSession.value) return false
  if (activeSession.value.completed) return false
  if (!deckId.value || orderIndex.value === null || !role.value) return false
  // Defensive: если currentTurn >= длины — сессия фактически завершена
  if (currentOrder.value && currentTurn.value >= currentOrder.value.sequence.length) return false
  return true
})

// ─── isLoading: флаг для блокировки watch во время loadSession ──
// Без этого watch с flush:'sync' срабатывает на КАЖДОЕ изменение ref
// в loadSession (deckId → orderIndex → ...) и на промежуточных шагах
// пишет в sessions[idx] мусор (например, completed=false для завершённой
// сессии, потому что currentOrder ещё не вычислен правильно).
let isLoading = false

// ─── persistActiveSession: вынесенная логика записи в sessions ──
// Используется и из watch, и из loadSession (после загрузки refs).
function persistActiveSession() {
  if (!activeSessionId.value) return
  const idx = sessions.value.findIndex(s => s.id === activeSessionId.value)
  if (idx === -1) return
  // Вычисляем completed напрямую из refs (не через isFinished computed,
  // чтобы избежать гонок при частичных обновлениях).
  const total = decks.value[deckId.value]?.orders?.[orderIndex.value]?.sequence.length ?? 0
  const completed = total > 0 && currentTurn.value >= total
  // v5.0: сохраняем актуальный elapsedMs — добавляем время с момента resumeLast
  // (если игра идёт, не на паузе).
  const now = Date.now()
  const liveElapsed = resumeLast > 0 ? elapsedMs.value + (now - resumeLast) : elapsedMs.value
  sessions.value[idx] = {
    ...sessions.value[idx],
    deckId: deckId.value,
    orderIndex: orderIndex.value,
    currentTurn: currentTurn.value,
    role: role.value,
    passedIds: [...passedIds.value],
    skippedIds: [...skippedIds.value],
    name: sessionName.value,
    startTime: startTime.value,
    elapsedMs: liveElapsed,
    lastActiveAt: lastActiveAt.value,    // v5.3
    maxReachedTurn: maxReachedTurn.value,
    completed,
    updatedAt: new Date().toISOString()
  }
  saveSessions(sessions.value)
}

// ─── v5.0: Таймер сессии ──────────────────────────────────────
// resumeTimer() — продолжить отсчёт после паузы (вызывается при openSession,
//   continueSession, при первом старте).
// pauseTimer() — остановить отсчёт, накопить elapsedMs (вызывается при goBack
//   на главный экран, при isFinished).
// getCurrentElapsedMs() — сколько времени в миллисекундах прошло с учетом пауз.
function resumeTimer() {
  if (resumeLast > 0) return  // уже запущен
  resumeLast = Date.now()
}

function pauseTimer() {
  if (resumeLast === 0) return  // уже на паузе
  const now = Date.now()
  elapsedMs.value = elapsedMs.value + (now - resumeLast)
  resumeLast = 0
  persistActiveSession()
}

function getCurrentElapsedMs() {
  if (resumeLast > 0) {
    return elapsedMs.value + (Date.now() - resumeLast)
  }
  return elapsedMs.value
}

// formatDuration(ms) — возвращает "MM:SS" или "H:MM:SS" если больше часа.
function formatDuration(ms) {
  if (!ms || ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// ─── Persistence: сохраняем активную сессию при изменении refs ───
// flush: 'sync' — для надёжной синхронизации с localStorage.
// Пропускаем во время loadSession (там persistActiveSession вызывается
// вручную в конце).
watch(
  [deckId, orderIndex, currentTurn, role, passedIds, skippedIds, maxReachedTurn],
  () => {
    if (isLoading) return
    persistActiveSession()
  },
  { deep: true, flush: 'sync' }
)

watch(activeSessionId, (id) => {
  saveActiveSessionId(id)
})

watch(theme, (t) => {
  localStorage.setItem(themeKey, t)
  applyTheme(t)
})

// ─── Theme ──────────────────────────────────────────────────────
let mediaQuery = null

function applyTheme(t) {
  if (t === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
    if (!mediaQuery) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', (e) => {
        if (theme.value === 'auto') {
          document.documentElement.classList.toggle('dark', e.matches)
        }
      })
    }
  } else {
    document.documentElement.classList.toggle('dark', t === 'dark')
  }
}

if (typeof window !== 'undefined' && window.matchMedia) {
  applyTheme(theme.value)
}

// ─── Actions ────────────────────────────────────────────────────
// startSession: создаёт НОВУЮ сессию в истории, делает её активной.
// Старая активная остаётся в истории как неактивная (при этом её таймер
// останавливается через pauseTimer ниже).
function startSession(selectedDeckId, selectedOrderIndex, selectedRole, startTurn = 0) {
  // Сначала приостанавливаем таймер текущей активной сессии (если была)
  pauseTimer()

  const total = decks.value[selectedDeckId]?.orders[selectedOrderIndex]?.sequence.length ?? 0
  const turn = (typeof startTurn === 'number' && startTurn >= 0 && startTurn < total)
    ? startTurn : 0

  // При startTurn > 0 — отмечаем все предыдущие вопросы как отвеченные.
  // Партнёр открывает share-ссылку с turn=N и видит "Отвечено: N" — консистентно.
  const sequence = decks.value[selectedDeckId]?.orders[selectedOrderIndex]?.sequence || []
  const autoPassedIds = turn > 0 ? sequence.slice(0, turn).filter(Boolean) : []

  const id = genId()
  const now = new Date().toISOString()
  const newSession = {
    id,
    deckId: selectedDeckId,
    orderIndex: selectedOrderIndex,
    currentTurn: turn,
    role: selectedRole,
    passedIds: autoPassedIds,
    skippedIds: [],
    name: null,
    startTime: now,
    elapsedMs: 0,
    maxReachedTurn: turn,
    lastActiveAt: turn > 0 ? now : null,
    createdAt: now,
    updatedAt: now,
    completed: false
  }
  sessions.value = [newSession, ...sessions.value]
  sessions.value = pruneSessions(sessions.value, { protectedId: id })
  saveSessions(sessions.value)
  activeSessionId.value = id
  saveActiveSessionId(id)

  // Обновляем локальные refs. Блокируем watch через isLoading.
  isLoading = true
  deckId.value = selectedDeckId
  orderIndex.value = selectedOrderIndex
  role.value = selectedRole
  currentTurn.value = turn
  passedIds.value = [...autoPassedIds]
  skippedIds.value = []
  sessionName.value = null              // v5.0
  startTime.value = now                 // v5.0
  elapsedMs.value = 0                   // v5.0
  resumeLast = 0
  maxReachedTurn.value = turn
  isLoading = false
  persistActiveSession()
  resumeTimer()  // v5.0: запускаем таймер новой сессии
}

// loadSession: переключается на существующую сессию из истории.
// Если сессия завершённая — таймер НЕ запускаем (просто просмотр).
// Если незавершённая — запускаем таймер (продолжаем играть).
function loadSession(id) {
  const s = sessions.value.find(x => x.id === id)
  if (!s) return false
  // Сначала приостанавливаем текущий таймер (если был)
  pauseTimer()

  isLoading = true
  activeSessionId.value = id
  deckId.value = s.deckId
  orderIndex.value = s.orderIndex
  role.value = s.role
  currentTurn.value = s.currentTurn
  passedIds.value = [...(s.passedIds || [])]
  skippedIds.value = [...(s.skippedIds || [])]
  sessionName.value = s.name ?? null       // v5.0
  startTime.value = s.startTime ?? s.createdAt ?? null  // v5.0
  elapsedMs.value = s.elapsedMs ?? 0         // v5.0
  resumeLast = 0
  maxReachedTurn.value = s.maxReachedTurn ?? s.currentTurn ?? 0
  isLoading = false
  persistActiveSession()

  // Если сессия не завершена — запускаем таймер (продолжаем играть)
  if (!isFinished.value) {
    resumeTimer()
  }
  return true
}

// v5.0: renameSession(id, newName) — переименовать сессию в истории.
// newName обрезается до 128 символов. null/empty — сбрасывает имя (станет «<колода> • порядок X»).
function renameSession(id, newName) {
  const idx = sessions.value.findIndex(s => s.id === id)
  if (idx === -1) return false
  const trimmed = (typeof newName === 'string') ? newName.trim().slice(0, 128) : null
  sessions.value[idx] = {
    ...sessions.value[idx],
    name: trimmed || null,
    updatedAt: new Date().toISOString()
  }
  saveSessions(sessions.value)
  // Если переименовали активную сессию — обновляем ref
  if (activeSessionId.value === id) {
    sessionName.value = trimmed || null
  }
  return true
}

// deleteSession: удаляет сессию из истории
function deleteSession(id) {
  sessions.value = sessions.value.filter(s => s.id !== id)
  saveSessions(sessions.value)
  if (activeSessionId.value === id) {
    activeSessionId.value = null
    saveActiveSessionId(null)
    deckId.value = null
    orderIndex.value = null
    role.value = null
    currentTurn.value = 0
    passedIds.value = []
    skippedIds.value = []
  }
  return true
}

// ─── v5.1: Custom deck management ────────────────────────────

// importDeck: импорт колоды из JSON-объекта (уже распарсенного).
// Возвращает { ok: true, deck } или { ok: false, error }.
// При конфликте deckId — спрашивает пользователя (через confirm) —
// «Заменить» ЗАПРЕЩЕНО, только «Новое имя» или «Отмена».
//
// v5.4: опц. второй аргумент { sourcePath } — сохраняется в метаданных колоды.
//   - файл:           sourcePath = file.name (только имя, без пути)
//   - каталог (URL):  sourcePath = url.pathname + (url.hash || '') (без домена)
//   - бэкап:          sourcePath переносится из бэкапа как есть (если есть)
function importDeck(deckData, opts = {}) {
  const error = validateDeckFormat(deckData)
  if (error) return { ok: false, error }

  let finalDeckId = deckData.deckId
  // Конфликт: колода с этим deckId уже есть (встроенная или кастомная)
  const conflictBuiltin = builtinDeckIds.includes(finalDeckId)
  const conflictCustom = customDecks.value.some(d => d.deckId === finalDeckId)

  if (conflictBuiltin || conflictCustom) {
    // Замена запрещена. Спрашиваем — новое имя или отмена.
    const existingName = conflictBuiltin
      ? builtinDecks[finalDeckId]?.name
      : customDecks.value.find(d => d.deckId === finalDeckId)?.name
    const choice = confirm(
      `Колода "${finalDeckId}" (${existingName}) уже существует.\n` +
      `Замена запрещена — это сломает старые сессии.\n\n` +
      `Введите новое ID для импортируемой колоды (a-z, 0-9, дефис),\n` +
      `или нажмите «Отмена» чтобы отказаться:`
    )
    if (!choice) return { ok: false, error: 'Импорт отменён' }

    // Простой prompt для нового ID (используем window.prompt)
    const newId = window.prompt(
      `Новое deckId (a-z, 0-9, дефис, 3-64 символа):`,
      finalDeckId + '-copy'
    )
    if (!newId || !isValidDeckId(newId)) {
      return { ok: false, error: 'Некорректный новый deckId' }
    }
    if (builtinDeckIds.includes(newId) || customDecks.value.some(d => d.deckId === newId)) {
      return { ok: false, error: `deckId "${newId}" тоже занят` }
    }
    finalDeckId = newId
  }

  // v5.4: sourcePath из opts имеет приоритет над тем, что в самом deckData
  // (caller знает контекст — файл или URL). Если opts.sourcePath нет — берём из
  // deckData.sourcePath (для бэкапа), иначе null.
  const sourcePath = opts.sourcePath !== undefined
    ? opts.sourcePath
    : (deckData.sourcePath || null)

  const normalized = normalizeDeck({ ...deckData, deckId: finalDeckId, sourcePath })

  // Лимит 20 кастомных колод
  if (customDecks.value.length >= MAX_CUSTOM_DECKS) {
    return { ok: false, error: `Достигнут лимит кастомных колод (${MAX_CUSTOM_DECKS})` }
  }

  customDecks.value = [normalized, ...customDecks.value]
  saveCustomDecks(customDecks.value)
  return { ok: true, deck: normalized }
}

// exportDeck: экспортирует колоду в JSON-файл.
function exportDeck(deckIdArg) {
  const d = decks.value[deckIdArg]
  if (!d) {
    console.warn('[coffee-cards] exportDeck: deck not found', deckIdArg)
    return
  }
  const data = {
    version: 1,
    deckId: d.deckId,
    name: d.name,
    description: d.description || '',
    source: d.source || null,
    sourcePath: d.sourcePath ?? null,                // v5.4
    questions: d.questions,
    orders: d.orders,
    categories: d.categories || null,
    exportedAt: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coffee-cards-deck-${d.deckId}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// deleteDeck: удаляет кастомную колоду.
// Предупреждаем: сессии с этой колодой могут остаться в истории, но станут непоказываемыми.
function deleteDeck(deckIdArg) {
  const d = customDecks.value.find(x => x.deckId === deckIdArg)
  if (!d) return false
  // Считаем сколько сессий используют эту колоду
  const sessionCount = sessions.value.filter(s => s.deckId === deckIdArg).length
  const msg = sessionCount > 0
    ? `Удалить колоду "${d.name}"? У вас есть ${sessionCount} сессий с этой колодой — они останутся в истории, но не смогут открыться.`
    : `Удалить колоду "${d.name}"?`
  if (!confirm(msg)) return false

  customDecks.value = customDecks.value.filter(x => x.deckId !== deckIdArg)
  saveCustomDecks(customDecks.value)
  return true
}

// renameDeck: переименование кастомной колоды (≤128 символов).
function renameDeck(deckIdArg, newName) {
  const trimmed = (typeof newName === 'string') ? newName.trim().slice(0, 128) : ''
  if (!trimmed) return false
  const idx = customDecks.value.findIndex(d => d.deckId === deckIdArg)
  if (idx === -1) return false
  customDecks.value[idx] = { ...customDecks.value[idx], name: trimmed, updatedAt: new Date().toISOString() }
  saveCustomDecks(customDecks.value)
  return true
}

// ─── v5.1: Полный бэкап ────────────────────────────────────────
// exportBackup: все сессии + все кастомные колоды в одном JSON.
function exportBackup() {
  const data = {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sessions: sessions.value,
    customDecks: customDecks.value
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const dateStr = d.toISOString().slice(0, 10)
  a.href = url
  a.download = `coffee-cards-backup-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// importBackup: импорт бэкапа. Сессии → неактивные записи.
// Колоды → спрашиваем по каждой с конфликтом.
// Возвращает { sessionsAdded, decksAdded, decksSkipped }.
function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data || typeof data !== 'object') throw new Error('Некорректный формат бэкапа')

        let sessionsAdded = 0
        let decksAdded = 0
        let decksSkipped = 0

        // Импорт сессий (как неактивные)
        if (Array.isArray(data.sessions)) {
          for (const oldSession of data.sessions) {
            if (!oldSession.deckId || !oldSession.role) continue
            const id = genId()
            const now = new Date().toISOString()
            const newSession = {
              ...oldSession,
              id,
              name: oldSession.name ?? null,
              startTime: oldSession.startTime ?? oldSession.createdAt ?? now,
              elapsedMs: oldSession.elapsedMs ?? 0,
              updatedAt: now,
              completed: oldSession.completed ?? false
            }
            sessions.value = [newSession, ...sessions.value]
            sessionsAdded++
          }
          sessions.value = pruneSessions(sessions.value, { protectedId: null })
          saveSessions(sessions.value)
        }

        // Импорт колод (спрашиваем по каждой с конфликтом)
        if (Array.isArray(data.customDecks)) {
          for (const deckData of data.customDecks) {
            const error = validateDeckFormat(deckData)
            if (error) {
              console.warn('[coffee-cards] Skipping invalid deck in backup:', error)
              decksSkipped++
              continue
            }
            const conflict = builtinDeckIds.includes(deckData.deckId) ||
              customDecks.value.some(d => d.deckId === deckData.deckId)
            if (conflict) {
              const choice = confirm(
                `Колода "${deckData.deckId}" (${deckData.name}) уже существует.\n` +
                `Заменить — запрещено. Ввести новый ID?`
              )
              if (!choice) {
                decksSkipped++
                continue
              }
              const newId = window.prompt(
                `Новое deckId:`, deckData.deckId + '-imported'
              )
              if (!newId || !isValidDeckId(newId)) {
                decksSkipped++
                continue
              }
              deckData.deckId = newId
            }
            if (customDecks.value.length >= MAX_CUSTOM_DECKS) {
              alert('Достигнут лимит кастомных колод, остальные пропущены')
              decksSkipped += (data.customDecks.length - decksAdded - decksSkipped)
              break
            }
            const normalized = normalizeDeck(deckData)
            customDecks.value = [normalized, ...customDecks.value]
            decksAdded++
          }
          saveCustomDecks(customDecks.value)
        }

        resolve({ sessionsAdded, decksAdded, decksSkipped })
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsText(file)
  })
}

// ─── v5.2: Каталог колод ──────────────────────────────────────
// Репо с колодами: r3code/random-coffee-decks на GitHub
// fetch() на GitHub Pages (CORS разрешён, надёжнее кэширование).
// Pages URL: https://r3code.github.io/random-coffee-decks/
const CATALOG_PAGES_URL = 'https://r3code.github.io/random-coffee-decks'
const CATALOG_INDEX_URL = `${CATALOG_PAGES_URL}/index.json`
const catalogCacheKey = 'catalog_cache'
const CATALOG_CACHE_MS = 24 * 60 * 60 * 1000  // 24 часа

// catalog — реактивный ref с массивом описаний колод из репо.
const catalog = ref([])
const catalogLoading = ref(false)
const catalogError = ref(null)
const catalogLastFetch = ref(0)

// loadCatalog: загружает список колод из GitHub raw.
// Если кэш свежий (< 24ч) и force=false — используем кэш.
// Возвращает массив описаний: { deckId, name, description, questionsCount, file, source }
async function loadCatalog(force = false) {
  // Проверяем кэш
  if (!force && catalogLastFetch.value > 0) {
    const age = Date.now() - catalogLastFetch.value
    if (age < CATALOG_CACHE_MS && catalog.value.length > 0) {
      return catalog.value
    }
  }
  // Проверяем localStorage кэш
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(catalogCacheKey) || 'null')
      if (cached && cached.timestamp && (Date.now() - cached.timestamp < CATALOG_CACHE_MS)) {
        catalog.value = cached.items
        catalogLastFetch.value = cached.timestamp
        return catalog.value
      }
    } catch {}
  }

  catalogLoading.value = true
  catalogError.value = null
  try {
    const resp = await fetch(CATALOG_INDEX_URL, { cache: 'no-cache' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    if (!Array.isArray(data)) throw new Error('Некорректный формат каталога')

    catalog.value = data
    catalogLastFetch.value = Date.now()
    // Сохраняем в localStorage
    try {
      localStorage.setItem(catalogCacheKey, JSON.stringify({
        timestamp: catalogLastFetch.value,
        items: data
      }))
    } catch (e) {
      console.warn('[coffee-cards] Catalog cache write failed:', e)
    }
    return catalog.value
  } catch (e) {
    catalogError.value = e.message
    // При ошибке — пытаемся использовать кэш (даже старый)
    try {
      const cached = JSON.parse(localStorage.getItem(catalogCacheKey) || 'null')
      if (cached && cached.items) {
        catalog.value = cached.items
        catalogLastFetch.value = cached.timestamp
        return catalog.value
      }
    } catch {}
    throw e
  } finally {
    catalogLoading.value = false
  }
}

// loadDeckFromUrl: загружает колоду по URL (GitHub raw) и импортирует.
// Использует importDeck для валидации и конфликта.
// v5.4: sourcePath = url.pathname (+hash) — путь в репо без домена.
//   Например: https://r3code.github.io/random-coffee-decks/deeps/foo.json
//   → sourcePath = '/random-coffee-decks/deeps/foo.json'
async function loadDeckFromUrl(url, opts = {}) {
  const resp = await fetch(url, { cache: 'no-cache' })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const deckData = await resp.json()
  // Если caller явно не передал sourcePath — выводим из URL.
  let sourcePath = opts.sourcePath
  if (sourcePath === undefined) {
    try {
      const u = new URL(url)
      sourcePath = u.pathname + (u.hash || '')
    } catch {
      sourcePath = null
    }
  }
  return importDeck(deckData, { ...opts, sourcePath })
}

// checkDeckUpdates: для кастомной колоды с source — проверяет обновления.
// Сравнивает version. Если новая версия доступна:
//   - Если изменились только тексты вопросов (та же структура id) — patch.
//   - Если структура изменилась (другие id вопросов, другие orders) — отказываем.
//     Это новая колода, загрузите отдельно.
async function checkDeckUpdates(deckIdArg) {
  const d = customDecks.value.find(x => x.deckId === deckIdArg)
  if (!d) return { ok: false, error: 'Колода не найдена' }
  if (!d.source) return { ok: false, error: 'У колоды нет источника (source)' }

  try {
    const resp = await fetch(d.source, { cache: 'no-cache' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const remote = await resp.json()

    // Проверяем, что это та же колода по deckId
    if (remote.deckId !== d.deckId) {
      return { ok: false, error: `deckId не совпадает: локально "${d.deckId}", удалённо "${remote.deckId}"` }
    }

    // Сравниваем version
    const remoteVersion = remote.version || 0
    const localVersion = d.version || 0
    if (remoteVersion <= localVersion) {
      return { ok: false, error: 'Обновлений нет', upToDate: true }
    }

    // Проверяем структуру: те же id вопросов?
    const localIds = new Set(d.questions.map(q => q.id))
    const remoteIds = new Set((remote.questions || []).map(q => q.id))
    const sameStructure = localIds.size === remoteIds.size &&
      [...localIds].every(id => remoteIds.has(id))

    if (!sameStructure) {
      return {
        ok: false,
        error: 'Структура изменилась (другие id вопросов). Это новая колода — загрузите отдельно.',
        structural: true,
        remoteVersion
      }
    }

    // Проверяем orders — если изменились, тоже отказываем (структура)
    if (remote.orders) {
      const localOrderIds = JSON.stringify(d.orders.map(o => o.id + ':' + o.sequence.join(',')))
      const remoteOrderIds = JSON.stringify(remote.orders.map(o => o.id + ':' + o.sequence.join(',')))
      if (localOrderIds !== remoteOrderIds) {
        return {
          ok: false,
          error: 'Структура порядков изменилась. Это новая колода — загрузите отдельно.',
          structural: true,
          remoteVersion
        }
      }
    }

    // Структура та же — patch: обновляем только тексты вопросов
    const updatedQuestions = d.questions.map(q => {
      const remoteQ = (remote.questions || []).find(rq => rq.id === q.id)
      return remoteQ ? { ...q, text: remoteQ.text } : q
    })

    const idx = customDecks.value.findIndex(x => x.deckId === deckIdArg)
    customDecks.value[idx] = {
      ...customDecks.value[idx],
      questions: updatedQuestions,
      version: remoteVersion,
      updatedAt: new Date().toISOString()
    }
    saveCustomDecks(customDecks.value)
    return { ok: true, remoteVersion, patched: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

function nextQuestion() {
  if (!currentQuestion.value) return
  const id = currentQuestion.value.id
  if (!passedIds.value.includes(id)) {
    passedIds.value.push(id)
  }
  currentTurn.value++
  if (currentTurn.value > maxReachedTurn.value) maxReachedTurn.value = currentTurn.value
  lastActiveAt.value = new Date().toISOString()  // v5.3
}

// nextTurn: переход к следующему вопросу БЕЗ модификации passedIds/skippedIds.
// Используется для кнопки "Следующий →" когда следующий вопрос уже открыт
// (например, после prev на уже отвеченный вопрос, чтобы просто идти дальше).
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

function skipQuestion() {
  if (!currentQuestion.value) return
  const id = currentQuestion.value.id
  // Не добавляем дубль в skippedIds (защита от повторного skip на уже пропущенном ходе).
  if (!skippedIds.value.includes(id)) {
    skippedIds.value.push(id)
  }
  currentTurn.value += 2
  // skip перепрыгивает ход — обновляем maxReachedTurn
  if (currentTurn.value > maxReachedTurn.value) maxReachedTurn.value = currentTurn.value
  lastActiveAt.value = new Date().toISOString()  // v5.3
}

// resetProgress: сбрасывает АКТИВНУЮ сессию (но сохраняет в истории)
function resetProgress() {
  // v5.0: приостанавливаем таймер и сохраняем актуальный elapsedMs
  pauseTimer()
  // Если была активная сессия — помечаем её как завершённую в истории
  if (activeSessionId.value) {
    const idx = sessions.value.findIndex(s => s.id === activeSessionId.value)
    if (idx !== -1) {
      sessions.value[idx] = {
        ...sessions.value[idx],
        completed: true,
        updatedAt: new Date().toISOString()
      }
      saveSessions(sessions.value)
    }
  }
  activeSessionId.value = null
  saveActiveSessionId(null)
  // Блокируем watch на время сброса refs.
  isLoading = true
  currentTurn.value = 0
  passedIds.value = []
  skippedIds.value = []
  sessionName.value = null      // v5.0
  startTime.value = null        // v5.0
  elapsedMs.value = 0           // v5.0
  resumeLast = 0
  maxReachedTurn.value = 0
  deckId.value = null
  orderIndex.value = null
  role.value = null
  isLoading = false
}

// ─── Export / Import ────────────────────────────────────────────

// exportSession: экспортирует конкретную сессию по её id.
// Имя файла: coffee-cards-<deckId>-<orderLetter>-<YYYY-MM-DD>.json
// Если id не указан — экспортирует активную.
function exportSession(id) {
  const s = id
    ? sessions.value.find(x => x.id === id)
    : activeSession.value
  if (!s) {
    console.warn('[coffee-cards] exportSession: session not found', id)
    return
  }
  const state = {
    version: SCHEMA_VERSION,
    sessionId: s.id,
    deckId: s.deckId,
    orderIndex: s.orderIndex,
    currentTurn: s.currentTurn,
    role: s.role,
    passedIds: s.passedIds || [],
    skippedIds: s.skippedIds || [],
    name: s.name ?? null,                       // v5.0
    startTime: s.startTime ?? null,             // v5.0
    elapsedMs: s.elapsedMs ?? 0,                 // v5.0
    maxReachedTurn: s.maxReachedTurn ?? s.currentTurn ?? 0,
    completed: !!s.completed,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    exportedAt: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const orderLetter = decks.value[s.deckId]?.orders?.[s.orderIndex]?.name || '?'
  const d = new Date()
  const dateStr = d.toISOString().slice(0, 10)  // YYYY-MM-DD
  const a = document.createElement('a')
  a.href = url
  a.download = `coffee-cards-${s.deckId}-${orderLetter}-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// exportState: обратная совместимость — экспорт активной сессии.
// В UI больше не используется, но оставлено для тестов.
function exportState() {
  exportSession(activeSessionId.value)
}

// importState: создаёт НОВУЮ запись в истории (НЕ активную).
// Активная сессия (если была) не меняется — пользователь может открыть
// импортированную через "Открыть" в истории.
// Возвращает id созданной сессии (resolve(id)) или reject(error).
function importState(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target.result)
        if (!state.deckId || !deckIds.value.includes(state.deckId)) {
          throw new Error(`Неизвестная колода: "${state.deckId}"`)
        }
        if (typeof state.orderIndex !== 'number' || state.orderIndex < 0 || state.orderIndex > 9) {
          throw new Error('Некорректный orderIndex')
        }
        if (!['reader', 'listener'].includes(state.role)) {
          throw new Error('Некорректная роль')
        }
        const total = decks.value[state.deckId]?.orders?.[state.orderIndex]?.sequence.length ?? 0
        const turn = Math.max(0, state.currentTurn || 0)
        const completed = total > 0 && turn >= total

        // Создаём новую сессию — НЕ активную.
        const id = genId()
        const now = new Date().toISOString()
        const newSession = {
          id,
          deckId: state.deckId,
          orderIndex: state.orderIndex,
          currentTurn: turn,
          role: state.role,
          passedIds: Array.isArray(state.passedIds) ? state.passedIds : [],
          skippedIds: Array.isArray(state.skippedIds) ? state.skippedIds : [],
          name: typeof state.name === 'string' ? state.name.slice(0, 128) : null,  // v5.0
          startTime: state.startTime ?? state.createdAt ?? now,                   // v5.0
          elapsedMs: state.elapsedMs ?? 0,                                          // v5.0
          maxReachedTurn: state.maxReachedTurn ?? turn,
          createdAt: state.createdAt || now,
          updatedAt: now,
          completed
        }
        sessions.value = [newSession, ...sessions.value]
        // Применяем лимит, защищаем новую сессию от авто-удаления.
        // Активную не трогаем — она остаётся активной (activeSessionId не меняется).
        sessions.value = pruneSessions(sessions.value, { protectedId: id })
        saveSessions(sessions.value)
        // Активную НЕ меняем — пользователь откроет импортированную через UI.
        resolve(id)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsText(file)
  })
}

function setTheme(t) {
  theme.value = t
}

// ─── Exported API ──────────────────────────────────────────────
export function useDeck() {
  return {
    // sessions history
    sessions, activeSessionId, activeSession,
    loadSession, deleteSession, exportSession, renameSession,
    // v5.1: custom decks
    decks, deckIds, customDecks,
    importDeck, exportDeck, deleteDeck, renameDeck,
    exportBackup, importBackup,
    // v5.4: unified catalog
    catalogDecks, isCustomDeck,
    // v5.2: catalog
    catalog, catalogLoading, catalogError, catalogLastFetch,
    loadCatalog, loadDeckFromUrl, checkDeckUpdates,
    // state
    deck, deckId, orderIndex, currentOrder, currentQuestion, currentTurn,
    role, amIReading, passedIds, skippedIds,
    sessionName, startTime, elapsedMs, lastActiveAt,
    isAnswered, isSkipped, isJumpedTurn, isNextOpened,
    activeSkippedCount, theme,
    // computed
    hasSavedSession, isFinished,
    // timer helpers (v5.0)
    resumeTimer, pauseTimer, getCurrentElapsedMs, formatDuration,
    // actions
    startSession, nextQuestion, nextTurn, prevQuestion, skipQuestion, resetProgress,
    exportState, importState, setTheme
  }
}

// ─── URL helpers ────────────────────────────────────────────────
// buildShareUrl: роль инвертируется — это ссылка для ПАРТНЁРА.
//   "Я reader" → партнёр listener; "Я listener" → партнёр reader.
// Опционально можно передать currentTurn, чтобы партнёр открыл сессию
// с того же вопроса (для продолжения прерванной игры).
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
  // v5.1: deckIds теперь computed (встроенные + кастомные).
  // Кастомные колоды могут иметь разное количество порядков, но
  // пока ограничиваем 0..9 для совместимости.
  if (d && deckIds.value.includes(d) && !isNaN(o) && o >= 0 && o < 10 && ['reader', 'listener'].includes(r)) {
    const turn = parseInt(query.turn, 10)
    return {
      deck: d,
      order: o,
      role: r,
      turn: (!isNaN(turn) && turn >= 0) ? turn : 0
    }
  }
  return null
}

export { SCHEMA_VERSION, sessionsKey, activeSessionIdKey, themeKey }
