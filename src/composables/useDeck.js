import { ref, computed, watch } from 'vue'
import { decks, deckIds } from '@/data/decks'

const SCHEMA_VERSION = 2  // v2: добавилась история сессий
const sessionsKey = 'coffee_sessions'
const activeSessionIdKey = 'coffee_active_session_id'
const themeKey = 'theme_preference'

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
  [deckId, orderIndex, currentTurn, role, passedIds, skippedIds],
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
    createdAt: now,
    updatedAt: now,
    completed: false
  }
  sessions.value = [newSession, ...sessions.value]
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
  passedIds.value.push(currentQuestion.value.id)
  currentTurn.value++
}

function prevQuestion() {
  if (currentTurn.value <= 0) return
  currentTurn.value--
}

function skipQuestion() {
  if (!currentQuestion.value) return
  skippedIds.value.push(currentQuestion.value.id)
  currentTurn.value += 2
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
  deckId.value = null
  orderIndex.value = null
  role.value = null
  isLoading = false
}

// ─── Export / Import ────────────────────────────────────────────
function exportState() {
  const state = {
    version: SCHEMA_VERSION,
    activeSessionId: activeSessionId.value,
    deckId: deckId.value,
    orderIndex: orderIndex.value,
    currentTurn: currentTurn.value,
    role: role.value,
    passedIds: passedIds.value,
    skippedIds: skippedIds.value,
    exportedAt: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coffee-cards-state-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

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
        // Создаём новую сессию из импортированного state
        const id = genId()
        const now = new Date().toISOString()
        const newSession = {
          id,
          deckId: state.deckId,
          orderIndex: state.orderIndex,
          currentTurn: Math.max(0, state.currentTurn || 0),
          role: state.role,
          passedIds: Array.isArray(state.passedIds) ? state.passedIds : [],
          skippedIds: Array.isArray(state.skippedIds) ? state.skippedIds : [],
          createdAt: now,
          updatedAt: now,
          completed: false
        }
        sessions.value = [newSession, ...sessions.value]
        saveSessions(sessions.value)
        activeSessionId.value = id
        saveActiveSessionId(id)

        deckId.value = state.deckId
        orderIndex.value = state.orderIndex
        currentTurn.value = Math.max(0, state.currentTurn || 0)
        role.value = state.role
        passedIds.value = Array.isArray(state.passedIds) ? state.passedIds : []
        skippedIds.value = Array.isArray(state.skippedIds) ? state.skippedIds : []
        resolve(true)
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
    loadSession, deleteSession,
    // state
    deck, deckId, orderIndex, currentOrder, currentQuestion, currentTurn,
    role, amIReading, passedIds, skippedIds,
    isAnswered, isSkipped, activeSkippedCount, theme,
    // computed
    hasSavedSession, isFinished,
    // actions
    startSession, nextQuestion, prevQuestion, skipQuestion, resetProgress,
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
