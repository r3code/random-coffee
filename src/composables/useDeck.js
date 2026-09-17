import { ref, computed, watch } from 'vue'
import { decks, deckIds } from '@/data/decks'

const SCHEMA_VERSION = 2  // v2: добавилась история сессий
const sessionsKey = 'coffee_sessions'
const activeSessionIdKey = 'coffee_active_session_id'
const themeKey = 'theme_preference'

// Лимит на количество хранимых сессий. При превышении самые старые
// (по updatedAt) удаляются, но активная и только что добавленная защищены.
const MAX_SESSIONS = 20

// ─── Генерация ID ───────────────────────────────────────────────
function genId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
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
    const total = decks[old.deckId]?.orders?.[old.orderIndex]?.sequence.length ?? 0
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
migrateV1ToV2()

const sessions = ref(loadSessions())
const activeSessionId = ref(loadActiveSessionId())

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

// maxReachedTurn: максимальный ход, до которого мы доходили в текущей сессии.
// Используется для различения "новый ход" (currentTurn === maxReachedTurn) от
// "вернулись назад" (currentTurn < maxReachedTurn). Нужно для isJumpedTurn.
// При startSession = 0. При nextQuestion/skipQuestion — обновляется до max.
const maxReachedTurn = ref(activeSession.value?.currentTurn ?? 0)

// ─── Derived ────────────────────────────────────────────────────
const deck = computed(() => deckId.value ? decks[deckId.value] : null)

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
  const total = decks[deckId.value]?.orders?.[orderIndex.value]?.sequence.length ?? 0
  const completed = total > 0 && currentTurn.value >= total
  sessions.value[idx] = {
    ...sessions.value[idx],
    deckId: deckId.value,
    orderIndex: orderIndex.value,
    currentTurn: currentTurn.value,
    role: role.value,
    passedIds: [...passedIds.value],
    skippedIds: [...skippedIds.value],
    maxReachedTurn: maxReachedTurn.value,
    completed,
    updatedAt: new Date().toISOString()
  }
  saveSessions(sessions.value)
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
// Старая активная остаётся в истории как неактивная.
function startSession(selectedDeckId, selectedOrderIndex, selectedRole, startTurn = 0) {
  const total = decks[selectedDeckId]?.orders[selectedOrderIndex]?.sequence.length ?? 0
  const turn = (typeof startTurn === 'number' && startTurn >= 0 && startTurn < total)
    ? startTurn : 0

  const id = genId()
  const now = new Date().toISOString()
  const newSession = {
    id,
    deckId: selectedDeckId,
    orderIndex: selectedOrderIndex,
    currentTurn: turn,
    role: selectedRole,
    passedIds: [],
    skippedIds: [],
    maxReachedTurn: turn,
    createdAt: now,
    updatedAt: now,
    completed: false
  }
  sessions.value = [newSession, ...sessions.value]
  // Применяем лимит: не более MAX_SESSIONS, защищаем новую (она становится активной).
  sessions.value = pruneSessions(sessions.value, { protectedId: id })
  saveSessions(sessions.value)
  activeSessionId.value = id
  saveActiveSessionId(id)

  // Обновляем локальные refs. Блокируем watch через isLoading, чтобы
  // на промежуточных шагах не писать в sessions[idx] мусор (completed=true
  // при текущем=0, но old=не-0 — может быть).
  isLoading = true
  deckId.value = selectedDeckId
  orderIndex.value = selectedOrderIndex
  role.value = selectedRole
  currentTurn.value = turn
  passedIds.value = []
  skippedIds.value = []
  maxReachedTurn.value = turn  // новая сессия — достигнут только стартовый ход
  isLoading = false
  // Записываем финальное состояние в sessions[idx]
  persistActiveSession()
}

// loadSession: переключается на существующую сессию из истории.
// Блокируем watch через isLoading, чтобы на промежуточных шагах
// (deckId установлен, orderIndex ещё старый) не записывался мусор
// в sessions[idx]. В конце вручную вызываем persistActiveSession,
// чтобы запись была консистентна с текущими refs.
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
  // maxReachedTurn: из сохранённого state или текущий turn (старые сессии без этого поля)
  maxReachedTurn.value = s.maxReachedTurn ?? s.currentTurn ?? 0
  isLoading = false
  // Синхронизируем запись с текущими refs (важно для завершённых сессий,
  // у которых completed мог быть false из-за старого бага — сейчас исправится).
  persistActiveSession()
  return true
}

// deleteSession: удаляет сессию из истории
function deleteSession(id) {
  sessions.value = sessions.value.filter(s => s.id !== id)
  saveSessions(sessions.value)
  // Если удалили активную — сбрасываем активную
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

function nextQuestion() {
  if (!currentQuestion.value) return
  const id = currentQuestion.value.id
  // Не добавляем дубль, если уже отвечен (защита от повторного нажатия
  // на уже отвеченном ходе после prev).
  if (!passedIds.value.includes(id)) {
    passedIds.value.push(id)
  }
  currentTurn.value++
  // maxReachedTurn обновляем только при движении ВПЕРЁД (за пределы достигнутого)
  if (currentTurn.value > maxReachedTurn.value) maxReachedTurn.value = currentTurn.value
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
}

// resetProgress: сбрасывает АКТИВНУЮ сессию (но сохраняет в истории)
function resetProgress() {
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
  // Блокируем watch на время сброса refs (хоть activeId уже null,
  // это двойная защита от возможных гонок).
  isLoading = true
  currentTurn.value = 0
  passedIds.value = []
  skippedIds.value = []
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
    maxReachedTurn: s.maxReachedTurn ?? s.currentTurn ?? 0,
    completed: !!s.completed,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    exportedAt: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const orderLetter = decks[s.deckId]?.orders?.[s.orderIndex]?.name || '?'
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
        if (!state.deckId || !deckIds.includes(state.deckId)) {
          throw new Error(`Неизвестная колода: "${state.deckId}"`)
        }
        if (typeof state.orderIndex !== 'number' || state.orderIndex < 0 || state.orderIndex > 9) {
          throw new Error('Некорректный orderIndex')
        }
        if (!['reader', 'listener'].includes(state.role)) {
          throw new Error('Некорректная роль')
        }
        const total = decks[state.deckId]?.orders?.[state.orderIndex]?.sequence.length ?? 0
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
    loadSession, deleteSession, exportSession,
    // state
    deck, deckId, orderIndex, currentOrder, currentQuestion, currentTurn,
    role, amIReading, passedIds, skippedIds,
    isAnswered, isSkipped, isJumpedTurn, isNextOpened,
    activeSkippedCount, theme,
    // computed
    hasSavedSession, isFinished,
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
  if (d && deckIds.includes(d) && !isNaN(o) && o >= 0 && o < 10 && ['reader', 'listener'].includes(r)) {
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
