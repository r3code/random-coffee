import { ref, computed, watch } from 'vue'
import { decks, deckIds } from '@/data/decks'

const SCHEMA_VERSION = 1
const stateKey = 'game_state'
const themeKey = 'theme_preference'

// ─── Migration & load ───────────────────────────────────────────
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  if (!raw.version) {
    raw.version = 1
    raw.passedIds = raw.passedIds || []
    raw.skippedIds = raw.skippedIds || []
  }
  return raw
}

function loadState() {
  try {
    const raw = localStorage.getItem(stateKey)
    if (!raw) return {}
    return migrate(JSON.parse(raw))
  } catch (e) {
    console.warn('[coffee-cards] Corrupted game_state, resetting:', e)
    localStorage.removeItem(stateKey)
    return {}
  }
}

// ─── Module-level refs (SINGLETON) ───────────────────────────────
const savedState = loadState()

const deckId       = ref(savedState.deckId || null)
const orderIndex   = ref(savedState.orderIndex ?? null)
const currentTurn  = ref(savedState.currentTurn || 0)
const role         = ref(savedState.role || null)
const passedIds    = ref(savedState.passedIds || [])
const skippedIds   = ref(savedState.skippedIds || [])
const theme        = ref(localStorage.getItem(themeKey) || 'auto')

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

const isSkipped = computed(() => {
  return !!currentQuestion.value && skippedIds.value.includes(currentQuestion.value.id)
})

const isFinished = computed(() => {
  return !!currentOrder.value && currentTurn.value >= currentOrder.value.sequence.length
})

// ─── Persistence ────────────────────────────────────────────────
// flush: 'sync' — чтобы state в localStorage всегда был консистентен
// с refs после любой операции (важно для тестов и для надёжной
// работы hasSavedSession() сразу после startSession).
watch(
  [deckId, orderIndex, currentTurn, role, passedIds, skippedIds],
  () => {
    const state = {
      version: SCHEMA_VERSION,
      deckId: deckId.value,
      orderIndex: orderIndex.value,
      currentTurn: currentTurn.value,
      role: role.value,
      passedIds: passedIds.value,
      skippedIds: skippedIds.value,
      updatedAt: new Date().toISOString()
    }
    try {
      localStorage.setItem(stateKey, JSON.stringify(state))
    } catch (e) {
      console.error('[coffee-cards] localStorage write failed:', e)
    }
  },
  { deep: true, flush: 'sync' }
)

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

// Применяем тему только в браузере (не в SSR/тестах)
if (typeof window !== 'undefined' && window.matchMedia) {
  applyTheme(theme.value)
}

// ─── Actions ────────────────────────────────────────────────────
function startSession(selectedDeckId, selectedOrderIndex, selectedRole) {
  deckId.value = selectedDeckId
  orderIndex.value = selectedOrderIndex
  role.value = selectedRole
  currentTurn.value = 0
  passedIds.value = []
  skippedIds.value = []
}

function nextQuestion() {
  if (!currentQuestion.value) return
  passedIds.value.push(currentQuestion.value.id)
  currentTurn.value++
}

function prevQuestion() {
  if (currentTurn.value <= 0) return
  currentTurn.value--
  // НЕ удаляем из passedIds/skippedIds — это историческая запись.
  // isSkipped показывает пометку, если текущий вопрос был пропущен ранее.
}

function skipQuestion() {
  if (!currentQuestion.value) return
  skippedIds.value.push(currentQuestion.value.id)
  currentTurn.value++
}

function resetProgress() {
  currentTurn.value = 0
  passedIds.value = []
  skippedIds.value = []
  deckId.value = null
  orderIndex.value = null
  role.value = null
  localStorage.removeItem(stateKey)
}

// Computed на основе реактивных refs, а не прямой читки localStorage.
// Иначе Vue не отследит изменение и не ре-рендерит шаблон после resetProgress()
// (баг: кнопка "Новая" внешне не срабатывала).
const hasSavedSession = computed(() => {
  return !!(deckId.value && orderIndex.value !== null && orderIndex.value !== undefined && role.value)
})

// ─── Export / Import ────────────────────────────────────────────
function exportState() {
  const state = {
    version: SCHEMA_VERSION,
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
    deck, deckId, orderIndex, currentOrder, currentQuestion, currentTurn,
    role, amIReading, passedIds, skippedIds, isSkipped, theme,
    isFinished,
    startSession, nextQuestion, prevQuestion, skipQuestion, resetProgress,
    hasSavedSession, exportState, importState, setTheme
  }
}

// ─── URL helpers ────────────────────────────────────────────────
export function buildShareUrl(dId, oIdx, r) {
  const params = new URLSearchParams({ deck: dId, order: String(oIdx), role: r })
  return `${window.location.origin}${window.location.pathname}?${params}`
}

export function parseShareUrl(query) {
  if (!query || typeof query !== 'object') return null
  const d = query.deck
  const o = parseInt(query.order, 10)
  const r = query.role
  if (d && deckIds.includes(d) && !isNaN(o) && o >= 0 && o < 10 && ['reader', 'listener'].includes(r)) {
    return { deck: d, order: o, role: r }
  }
  return null
}

export { SCHEMA_VERSION, stateKey, themeKey }
