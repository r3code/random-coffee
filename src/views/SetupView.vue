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

      <!-- Продолжить сессию -->
      <div v-if="hasSavedSession && !shareParams" class="mb-8">
        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-4">
          <h2 class="text-2xl font-bold mb-2">Продолжить сессию?</h2>
          <p class="mb-4">У вас есть незавершенная сессия</p>
          <div class="flex gap-4">
            <button @click="continueSession"
                    class="flex-1 py-3 bg-green-500 hover:bg-green-400 rounded-lg font-bold">
              Продолжить
            </button>
            <button @click="startNew"
                    class="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold">
              Новая
            </button>
          </div>
        </div>
      </div>

      <!-- Экспорт -->
      <div v-if="hasSavedSession" class="mb-6 flex gap-4">
        <button @click="handleExport"
                class="flex-1 py-3 bg-blue-500 hover:bg-blue-400 rounded-lg font-bold">
          📥 Экспорт состояния
        </button>
        <label class="flex-1 py-3 bg-purple-500 hover:bg-purple-400 rounded-lg font-bold text-center cursor-pointer">
          📤 Импорт состояния
          <input type="file" accept=".json" @change="handleImport" class="hidden" />
        </label>
      </div>

      <!-- Выбор колоды -->
      <div class="space-y-6">
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

        <!-- Порядок -->
        <div v-if="selectedDeckId" class="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 class="text-2xl font-bold mb-4">2. Выберите порядок вопросов</h2>
          <p class="text-sm opacity-80 mb-4">
            Договоритесь с партнером о букве порядка — одинаковая буква даст
            одинаковую последовательность вопросов.
          </p>
          <div class="grid grid-cols-5 gap-3">
            <button
              v-for="(order, index) in selectedDeck.orders"
              :key="order.id"
              @click="selectOrder(index)"
              :aria-pressed="selectedOrderIndex === index"
              :aria-label="`Порядок ${order.name}`"
              class="p-3 rounded-lg transition-all text-center font-bold"
              :class="selectedOrderIndex === index ? 'bg-yellow-500 text-gray-900' : 'bg-white/20 hover:bg-white/30'"
            >
              {{ order.name }}
            </button>
          </div>
        </div>

        <!-- Роль -->
        <div v-if="selectedOrderIndex !== null" class="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 class="text-2xl font-bold mb-4">3. Выберите роль</h2>
          <p class="text-sm opacity-80 mb-4">Роли будут чередоваться каждый вопрос</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              @click="selectRole('reader')"
              :aria-pressed="selectedRole === 'reader'"
              class="p-4 rounded-lg transition-all"
              :class="selectedRole === 'reader' ? 'bg-yellow-500 text-gray-900' : 'bg-white/20 hover:bg-white/30'"
            >
              <div class="text-2xl mb-2">🗣️</div>
              <div class="font-bold">Начну с чтения</div>
              <div class="text-sm opacity-80">Первый вопрос читаю я</div>
            </button>
            <button
              @click="selectRole('listener')"
              :aria-pressed="selectedRole === 'listener'"
              class="p-4 rounded-lg transition-all"
              :class="selectedRole === 'listener' ? 'bg-yellow-500 text-gray-900' : 'bg-white/20 hover:bg-white/30'"
            >
              <div class="text-2xl mb-2">👂</div>
              <div class="font-bold">Начну со слушания</div>
              <div class="text-sm opacity-80">Первый вопрос читает партнер</div>
            </button>
          </div>
        </div>

        <!-- QR-код для синхронизации — показываем плашку раньше,
             с плейсхолдером до выбора всех опций -->
        <div v-if="selectedDeckId" class="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
          <h3 class="text-xl font-bold mb-4">Синхронизация с партнёром</h3>

          <div v-if="!selectedRole || selectedOrderIndex === null">
            <div class="inline-flex items-center justify-center w-48 h-48 bg-white/10 rounded-lg mb-4 opacity-60">
              <span class="text-5xl opacity-50">📷</span>
            </div>
            <p class="text-sm opacity-70">
              Выберите порядок и роль — здесь появится QR-код, который
              партнёр сможет отсканировать, чтобы открыть ту же сессию.
            </p>
          </div>

          <div v-else>
            <div v-if="qrDataUrl" class="inline-block bg-white p-3 rounded-lg">
              <img :src="qrDataUrl" alt="QR-код со ссылкой на сессию" class="w-48 h-48" />
            </div>
            <div v-else class="inline-flex items-center justify-center w-48 h-48 bg-white/10 rounded-lg">
              <span class="text-sm opacity-70">Генерация...</span>
            </div>
            <p class="text-xs opacity-70 mt-3 break-all">{{ shareUrl }}</p>
          </div>
        </div>

        <!-- Старт -->
        <button
          v-if="selectedRole"
          @click="startGame"
          class="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95"
        >
          Начать сессию ➔
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import QRCode from 'qrcode'
import { useDeck, buildShareUrl, parseShareUrl } from '@/composables/useDeck'
import { decks } from '@/data/decks'

const router = useRouter()
const route = useRoute()
const {
  hasSavedSession, startSession, resetProgress,
  exportState, importState, theme, setTheme
} = useDeck()

const availableDecks = Object.values(decks)

const selectedDeckId = ref(null)
const selectedOrderIndex = ref(null)
const selectedRole = ref(null)
const shareParams = ref(null)
const qrDataUrl = ref('')

const selectedDeck = computed(() => selectedDeckId.value ? decks[selectedDeckId.value] : null)

const shareUrl = computed(() => {
  if (!selectedDeckId.value || selectedOrderIndex.value === null || !selectedRole.value) return ''
  return buildShareUrl(selectedDeckId.value, selectedOrderIndex.value, selectedRole.value)
})

watch(shareUrl, async (url) => {
  if (!url) { qrDataUrl.value = ''; return }
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, { width: 256, margin: 1 })
  } catch (e) {
    console.error('QR generation failed:', e)
    qrDataUrl.value = ''
  }
}, { immediate: false })

onMounted(() => {
  const parsed = parseShareUrl(route.query)
  if (parsed) {
    shareParams.value = parsed
    selectedDeckId.value = parsed.deck
    selectedOrderIndex.value = parsed.order
    selectedRole.value = parsed.role
  }
})

function selectDeck(dId) {
  selectedDeckId.value = dId
  selectedOrderIndex.value = null
  selectedRole.value = null
}

function selectOrder(index) { selectedOrderIndex.value = index }
function selectRole(r) { selectedRole.value = r }

function startGame() {
  startSession(selectedDeckId.value, selectedOrderIndex.value, selectedRole.value)
  router.push('/game')
}

function continueSession() { router.push('/game') }

function startNew() {
  resetProgress()
  selectedDeckId.value = null
  selectedOrderIndex.value = null
  selectedRole.value = null
}

function handleExport() {
  if (!hasSavedSession.value) {
    alert('Нет сохранённой сессии для экспорта')
    return
  }
  exportState()
}

async function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return
  try {
    await importState(file)
    alert('Состояние успешно импортировано!')
    router.push('/game')
  } catch (error) {
    alert('Ошибка импорта: ' + error.message)
  }
  event.target.value = ''
}
</script>
