<template>
  <div class="min-h-dvh bg-gradient-to-br from-indigo-900 to-purple-900 dark:from-gray-900 dark:to-gray-800 text-white p-6"
       style="padding-bottom: env(safe-area-inset-bottom);">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-4xl font-bold text-center mb-8">Random Coffee</h1>

      <!-- Тема -->
      <div class="mb-6 flex justify-center gap-2" role="group" aria-label="Выбор темы оформления">
        <button
          v-for="t in ['light', 'dark', 'auto']"
          :key="t"
          @click="setTheme(t)"
          :aria-pressed="theme === t"
          class="px-4 py-2 rounded-lg transition-all"
          :class="theme === t ? 'bg-yellow-500 text-gray-900' : 'bg-white/20 hover:bg-white/30'"
        >
          {{ t === 'light' ? '☀️ Светлая' : t === 'dark' ? '🌙 Темная' : '🔄 Авто' }}
        </button>
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- ГЛАВНЫЙ ЭКРАН: Продолжить + История (без формы новой сессии) -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <template v-if="!showNewForm">
        <!-- Продолжить сессию? -->
        <div v-if="hasSavedSession && !shareParams" class="mb-8">
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-4">
            <h2 class="text-2xl font-bold mb-2">Продолжить сессию?</h2>
            <p class="mb-4 text-sm opacity-80">
              Незавершённая сессия: {{ savedDeckName }}, порядок {{ savedOrderName }},
              вопрос {{ (savedTurn ?? 0) + 1 }} из {{ savedTotalQuestions }}
            </p>
            <div class="flex gap-4 mb-4">
              <button @click="continueSession"
                      class="flex-1 py-3 bg-green-500 hover:bg-green-400 rounded-lg font-bold">
                Продолжить
              </button>
              <button @click="enterNewForm"
                      class="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold">
                Новая
              </button>
            </div>

            <!-- QR-код для продолжения -->
            <div class="text-center">
              <p class="text-sm opacity-80 mb-2">
                Покажите партнёру QR-код, чтобы продолжить с того же вопроса:
              </p>
              <div v-if="continueQrDataUrl" class="inline-block bg-white p-3 rounded-lg">
                <img :src="continueQrDataUrl" alt="QR-код для продолжения сессии" class="w-40 h-40" />
              </div>
              <p class="text-xs opacity-70 mt-2 break-all">{{ continueShareUrl }}</p>
            </div>
          </div>
        </div>

        <!-- Нет активной сессии: большая кнопка "Начать новую" -->
        <div v-else class="mb-8 text-center">
          <button @click="enterNewForm"
                  class="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95">
            ➕ Начать новую сессию
          </button>
        </div>

        <!-- История сессий -->
        <div v-if="sessions.length > 0" class="mb-8">
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 class="text-2xl font-bold mb-4">История сессий</h2>
            <p class="text-sm opacity-80 mb-2">
              Можно параллельно вести несколько сессий с разными колодами и возвращаться к ним позже.
            </p>
            <p class="text-xs opacity-60 mb-4">
              Хранится не более 20 последних сессий.
            </p>

            <div class="space-y-3 max-h-96 overflow-y-auto">
              <div
                v-for="s in sortedSessions"
                :key="s.id"
                class="bg-white/10 rounded-lg p-4 transition-all"
                :class="[
                  s.id === activeSessionId ? 'ring-2 ring-yellow-500' : '',
                  highlightedSessionId === s.id ? 'ring-2 ring-emerald-400 bg-emerald-500/20' : ''
                ]"
              >
                <!-- Первый ряд: иконка статуса + название + дата (текст
                     не обрезается, занимает полную ширину). -->
                <div class="flex items-start gap-3">
                  <div class="text-xl shrink-0 leading-6">
                    <span v-if="isSessionFinished(s)">✅</span>
                    <span v-else>▶️</span>
                  </div>
                  <div class="flex-grow min-w-0">
                    <div class="font-bold leading-snug break-words">
                      {{ sessionDeckName(s) }} • порядок {{ sessionOrderName(s) }}
                    </div>
                    <div class="text-xs opacity-70 mt-1">
                      {{ isSessionFinished(s)
                        ? `Завершена • ${formatDate(s.updatedAt)}`
                        : `В процессе • вопрос ${(s.currentTurn || 0) + 1} из ${sessionTotal(s)} • ${formatDate(s.updatedAt)}`
                      }}
                    </div>
                  </div>
                </div>

                <!-- Второй ряд: бейдж/кнопка действия + утилитарные кнопки.
                     На мобильных кнопки выносятся отдельной строкой, чтобы
                     название сессии читалось целиком. На десктопе остаётся
                     inline, но с flex-wrap на случай узкого контейнера. -->
                <div class="flex items-center gap-2 mt-3 flex-wrap">
                  <!-- Активная сессия: бейдж (не кнопка), без рамки/фона,
                       визуально отличается от интерактивных кнопок. -->
                  <span
                    v-if="s.id === activeSessionId && !isSessionFinished(s)"
                    class="text-emerald-400 text-xs font-bold whitespace-nowrap px-1 select-none"
                    title="Эта сессия открыта в игре"
                  >
                    ● Активна
                  </span>
                  <button
                    v-else-if="!isSessionFinished(s)"
                    @click="openSession(s.id)"
                    class="px-3 py-2 bg-green-500 hover:bg-green-400 rounded-lg text-sm font-bold"
                  >
                    Открыть
                  </button>
                  <button
                    v-else
                    @click="restartCompletedSession(s)"
                    class="px-3 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-bold"
                    title="Начать новую сессию с этими же параметрами"
                    aria-label="Начать новую сессию с теми же параметрами"
                  >
                    ↻ Снова
                  </button>

                  <!-- Утилитарные кнопки справа, прижимаются вправо через ml-auto -->
                  <div class="flex items-center gap-2 ml-auto">
                    <button
                      @click="handleExportSession(s.id)"
                      class="w-9 h-9 flex items-center justify-center bg-gray-700/60 hover:bg-gray-600 rounded-lg text-base font-bold leading-none transition-colors"
                      title="Экспортировать в файл"
                      aria-label="Экспортировать сессию в файл"
                    >
                      ↓
                    </button>
                    <button
                      @click="confirmDeleteSession(s.id)"
                      class="w-9 h-9 flex items-center justify-center bg-gray-700/60 hover:bg-red-500 hover:text-white text-gray-300 rounded-lg text-base font-bold leading-none transition-colors"
                      title="Удалить сессию"
                      aria-label="Удалить сессию"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Импорт сессии из файла — внизу блока истории -->
            <div class="mt-4 pt-4 border-t border-white/10">
              <label class="block w-full py-3 bg-purple-500 hover:bg-purple-400 rounded-lg font-bold text-center cursor-pointer">
                📥 Импорт сессии из файла
                <input type="file" accept=".json" @change="handleImport" class="hidden" />
              </label>
            </div>
          </div>
        </div>
      </template>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- ЭКРАН НОВОЙ СЕССИИ: форма со всеми блоками (disabled до выбора) -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <template v-else>
        <!-- Назад -->
        <div class="mb-6">
          <button @click="exitNewForm" class="text-sm opacity-70 hover:opacity-100">
            ← Назад
          </button>
        </div>

        <div class="space-y-6">
          <!-- Блок 1: Колода (всегда активен) -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 class="text-2xl font-bold mb-4">1. Выберите колоду</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                v-for="deckOption in availableDecks"
                :key="deckOption.id"
                @click="selectDeck(deckOption.id)"
                :aria-pressed="selectedDeckId === deckOption.id"
                class="p-4 rounded-lg transition-all text-left"
                :class="selectedDeckId === deckOption.id ? 'bg-yellow-500 text-gray-900' : 'bg-white/20 hover:bg-white/30'"
              >
                <div class="font-bold text-lg">{{ deckOption.name }}</div>
                <div class="text-sm opacity-80">{{ deckOption.description }}</div>
                <div class="text-xs mt-2 opacity-70">{{ deckOption.questions.length }} вопросов</div>
              </button>
            </div>
          </div>

          <!-- Блок 2: Порядок (виден, disabled пока нет колоды) -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-opacity"
               :class="!selectedDeckId ? 'opacity-60' : ''">
            <h2 class="text-2xl font-bold mb-4">2. Выберите порядок вопросов</h2>
            <p v-if="!selectedDeckId" class="text-sm opacity-70 mb-4">
              ↑ Сначала выберите колоду
            </p>
            <p v-else class="text-sm opacity-80 mb-4">
              Договоритесь с партнером о букве порядка — одинаковая буква даст
              одинаковую последовательность вопросов.
            </p>
            <div class="grid grid-cols-5 gap-3">
              <button
                v-for="(order, index) in (selectedDeck?.orders || emptyOrders)"
                :key="order?.id || index"
                @click="selectOrder(index)"
                :disabled="!selectedDeckId"
                :aria-pressed="selectedOrderIndex === index"
                :aria-label="`Порядок ${order?.name || '?'}`"
                class="p-3 rounded-lg transition-all text-center font-bold disabled:cursor-not-allowed"
                :class="selectedOrderIndex === index
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:hover:bg-white/20'"
              >
                {{ order?.name || '—' }}
              </button>
            </div>
          </div>

          <!-- Блок 3: Роль (виден, disabled пока нет порядка) -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-opacity"
               :class="selectedOrderIndex === null ? 'opacity-60' : ''">
            <h2 class="text-2xl font-bold mb-4">3. Выберите роль</h2>
            <p v-if="selectedOrderIndex === null" class="text-sm opacity-70 mb-4">
              ↑ Сначала выберите порядок
            </p>
            <p v-else class="text-sm opacity-80 mb-4">Роли будут чередоваться каждый вопрос</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                @click="selectRole('reader')"
                :disabled="selectedOrderIndex === null"
                :aria-pressed="selectedRole === 'reader'"
                class="p-4 rounded-lg transition-all disabled:cursor-not-allowed"
                :class="selectedRole === 'reader'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:hover:bg-white/20'"
              >
                <div class="text-2xl mb-2">🗣️</div>
                <div class="font-bold">Я читаю первым</div>
                <div class="text-sm opacity-80">Первый вопрос читаю я</div>
              </button>
              <button
                @click="selectRole('listener')"
                :disabled="selectedOrderIndex === null"
                :aria-pressed="selectedRole === 'listener'"
                class="p-4 rounded-lg transition-all disabled:cursor-not-allowed"
                :class="selectedRole === 'listener'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:hover:bg-white/20'"
              >
                <div class="text-2xl mb-2">👂</div>
                <div class="font-bold">Я слушаю первым</div>
                <div class="text-sm opacity-80">Первый вопрос читает партнер</div>
              </button>
            </div>
          </div>

          <!-- Блок 4: QR-код (виден, плейсхолдер пока нет роли) -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h3 class="text-xl font-bold mb-4">Синхронизация с партнёром</h3>

            <div v-if="!selectedRole">
              <div class="inline-flex items-center justify-center w-48 h-48 bg-white/10 rounded-lg mb-4 opacity-60">
                <span class="text-5xl opacity-50">📷</span>
              </div>
              <p class="text-sm opacity-70">
                ↑ Выберите колоду, порядок и роль — здесь появится QR-код
              </p>
            </div>

            <div v-else>
              <!-- Пометка-инструкция над QR-кодом: что делать и зачем -->
              <div class="flex items-start gap-2 text-left mb-4 px-2">
                <span class="text-base shrink-0 mt-0.5 opacity-70" aria-hidden="true">ℹ️</span>
                <p class="text-xs opacity-70 leading-snug">
                  Партнёр сканирует QR-код и сразу попадает в ту же сессию. Потом нажмите «Начать сессию».
                </p>
              </div>

              <div v-if="qrDataUrl" class="inline-block bg-white p-3 rounded-lg">
                <img :src="qrDataUrl" alt="QR-код со ссылкой на сессию" class="w-48 h-48" />
              </div>
              <div v-else class="inline-flex items-center justify-center w-48 h-48 bg-white/10 rounded-lg">
                <span class="text-sm opacity-70">Генерация...</span>
              </div>
              <p class="text-xs opacity-70 mt-3 break-all">{{ shareUrl }}</p>
            </div>
          </div>

          <!-- Кнопка "Начать сессию" (видна, disabled пока нет роли) -->
          <button
            @click="startGame"
            :disabled="!selectedRole"
            class="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-yellow-500"
          >
            Начать сессию ➔
          </button>
        </div>
      </template>

      <!-- Footer: версия, коммит, ссылка на GitHub -->
      <footer class="mt-8 pt-6 border-t border-white/10 text-center text-xs opacity-60">
        <div class="flex items-center justify-center gap-3 flex-wrap">
          <span>v{{ appVersion }}</span>
          <span v-if="commitHash" class="font-mono">
            · <a :href="commitUrl" target="_blank" rel="noopener"
                 class="hover:opacity-100 hover:text-yellow-400 transition-colors"
                 :title="commitDate ? `Коммит от ${formatCommitDate(commitDate)}` : 'Открыть коммит на GitHub'">
              {{ commitHash }}
            </a>
          </span>
          <span>·</span>
          <a href="https://github.com/r3code/random-coffee" target="_blank" rel="noopener"
             class="hover:opacity-100 hover:text-yellow-400 transition-colors"
             title="Открыть репозиторий на GitHub">
            GitHub ↗
          </a>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import QRCode from 'qrcode'
import { useDeck, buildShareUrl, parseShareUrl } from '@/composables/useDeck'
import { decks } from '@/data/decks'

// ─── Версия приложения и git-коммит (инжектируются через vite.config.js define) ──
// Если запускается не через Vite (например, в тестах) — fallback на пустые строки.
// @ts-ignore — глобальные define-константы, объявлены в vite.config.js
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
// @ts-ignore
const commitHash = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : ''
// @ts-ignore
const commitDate = typeof __COMMIT_DATE__ !== 'undefined' ? __COMMIT_DATE__ : ''

const GITHUB_REPO_URL = 'https://github.com/r3code/random-coffee'
const commitUrl = computed(() =>
  commitHash ? `${GITHUB_REPO_URL}/commit/${commitHash}` : GITHUB_REPO_URL
)

function formatCommitDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) +
           ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

const router = useRouter()
const route = useRoute()
const {
  hasSavedSession, startSession,
  importState, theme, setTheme,
  // Реактивные данные сохранённой сессии
  deckId, orderIndex, currentTurn, role, deck, currentOrder,
  // История сессий
  sessions, activeSessionId, loadSession, deleteSession, exportSession
} = useDeck()

const availableDecks = Object.values(decks)
// Пустой массив порядков для отображения 10 disabled-кнопок до выбора колоды
const emptyOrders = Array.from({ length: 10 }, (_, i) => ({
  id: `empty_${i}`,
  name: String.fromCharCode(65 + i)
}))

// ─── Состояние формы ─────────────────────────────────────────
const showNewForm = ref(false)
const selectedDeckId = ref(null)
const selectedOrderIndex = ref(null)
const selectedRole = ref(null)
const shareParams = ref(null)
const qrDataUrl = ref('')
const continueQrDataUrl = ref('')
// ID сессии, подсвеченной после импорта (для визуального feedback). 2 сек.
const highlightedSessionId = ref(null)
let highlightTimer = null

const selectedDeck = computed(() => selectedDeckId.value ? decks[selectedDeckId.value] : null)

// ─── QR для НОВОЙ сессии ─────────────────────────────────────
const shareUrl = computed(() => {
  if (!selectedDeckId.value || selectedOrderIndex.value === null || !selectedRole.value) return ''
  return buildShareUrl(selectedDeckId.value, selectedOrderIndex.value, selectedRole.value)
})

// ─── Инфо о сохранённой сессии (для блока "Продолжить") ─────
const savedDeckName = computed(() => deck.value?.name || '—')
const savedOrderName = computed(() => currentOrder.value?.name || '—')
const savedTurn = computed(() => currentTurn.value)
const savedTotalQuestions = computed(() => currentOrder.value?.sequence.length ?? 0)

// ─── QR для ПРОДОЛЖЕНИЯ ──────────────────────────────────────
const continueShareUrl = computed(() => {
  if (!hasSavedSession.value) return ''
  return buildShareUrl(deckId.value, orderIndex.value, role.value, currentTurn.value)
})

// ─── История сессий: сортировка ─────────────────────────────
const sortedSessions = computed(() => {
  return [...sessions.value].sort((a, b) => {
    if (a.id === activeSessionId.value) return -1
    if (b.id === activeSessionId.value) return 1
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  })
})

function sessionDeckName(s) {
  return decks[s.deckId]?.name || '—'
}
function sessionOrderName(s) {
  return decks[s.deckId]?.orders?.[s.orderIndex]?.name || '—'
}
function sessionTotal(s) {
  return decks[s.deckId]?.orders?.[s.orderIndex]?.sequence.length ?? 0
}
// Защитная проверка: сессия завершена, даже если completed=false,
// но currentTurn >= длины последовательности (старый баг или миграция).
function isSessionFinished(s) {
  if (s.completed) return true
  const total = sessionTotal(s)
  return total > 0 && (s.currentTurn || 0) >= total
}
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
         ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

async function generateContinueQr(url) {
  if (!url) { continueQrDataUrl.value = ''; return }
  try {
    continueQrDataUrl.value = await QRCode.toDataURL(url, { width: 256, margin: 1 })
  } catch (e) {
    console.error('Continue QR generation failed:', e)
    continueQrDataUrl.value = ''
  }
}

watch(shareUrl, async (url) => {
  if (!url) { qrDataUrl.value = ''; return }
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, { width: 256, margin: 1 })
  } catch (e) {
    console.error('QR generation failed:', e)
    qrDataUrl.value = ''
  }
}, { immediate: false })

watch([hasSavedSession, continueShareUrl], ([has, url]) => {
  if (has) generateContinueQr(url)
  else continueQrDataUrl.value = ''
}, { immediate: true })

onMounted(() => {
  // First-time user (no sessions): по умолчанию открываем форму
  if (sessions.value.length === 0) {
    showNewForm.value = true
  }
  // Share URL: предзаполняем форму и открываем её
  const parsed = parseShareUrl(route.query)
  if (parsed) {
    shareParams.value = parsed
    selectedDeckId.value = parsed.deck
    selectedOrderIndex.value = parsed.order
    selectedRole.value = parsed.role
    showNewForm.value = true
  }
})

function selectDeck(dId) {
  selectedDeckId.value = dId
  selectedOrderIndex.value = null
  selectedRole.value = null
}

function selectOrder(index) { selectedOrderIndex.value = index }
function selectRole(r) { selectedRole.value = r }

function enterNewForm() {
  // Просто переключаем режим, не трогая активную сессию.
  // Старая активная сессия остаётся в истории как in-progress.
  showNewForm.value = true
  // Сбрасываем форму, чтобы пользователь видел чистый выбор.
  selectedDeckId.value = null
  selectedOrderIndex.value = null
  selectedRole.value = null
  shareParams.value = null
}

function exitNewForm() {
  showNewForm.value = false
}

function startGame() {
  const turn = shareParams.value?.turn
  startSession(
    selectedDeckId.value,
    selectedOrderIndex.value,
    selectedRole.value,
    typeof turn === 'number' ? turn : 0
  )
  // Очищаем shareParams после использования, чтобы при следующем
  // ручном старте без share-ссылки не применялся старый turn.
  shareParams.value = null
  router.push('/game')
}

function continueSession() { router.push('/game') }

function openSession(id) {
  if (loadSession(id)) {
    router.push('/game')
  }
}

function restartCompletedSession(s) {
  startSession(s.deckId, s.orderIndex, s.role)
  router.push('/game')
}

function confirmDeleteSession(id) {
  const s = sessions.value.find(x => x.id === id)
  if (!s) return
  const name = `${sessionDeckName(s)} • порядок ${sessionOrderName(s)}`
  if (confirm(`Удалить сессию "${name}" из истории?`)) {
    deleteSession(id)
  }
}

// Экспорт конкретной сессии по id. Имя файла формируется в useDeck:
// coffee-cards-<deckId>-<orderLetter>-<YYYY-MM-DD>.json
function handleExportSession(id) {
  exportSession(id)
}

async function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return
  try {
    const newId = await importState(file)
    // Подсветка новой записи на 2 секунды
    highlightedSessionId.value = newId
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => {
      highlightedSessionId.value = null
      highlightTimer = null
    }, 2000)
    alert('Сессия добавлена в историю')
    // НЕ переходим в /game — пользователь откроет импортированную через «Открыть»
  } catch (error) {
    alert('Ошибка импорта: ' + error.message)
  }
  event.target.value = ''
}
</script>
