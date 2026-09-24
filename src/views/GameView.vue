<template>
  <div
    class="min-h-dvh flex flex-col p-4 transition-colors duration-500"
    :class="amIReading
      ? 'bg-indigo-100 dark:bg-indigo-950 text-gray-900 dark:text-white'
      : 'bg-emerald-100 dark:bg-emerald-950 text-gray-900 dark:text-white'"
    style="padding-bottom: env(safe-area-inset-bottom); padding-top: env(safe-area-inset-top);"
  >
    <!-- Шапка: скрыта когда isFinished -->
    <header v-if="!isFinished" class="text-center mb-6" role="banner">
      <div class="flex justify-between items-center mb-2">
        <!-- Кнопка "Закрыть" — кружок с крестиком, крупная для пальца -->
        <button @click="goBack" class="w-11 h-11 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-white/15 transition-all text-2xl leading-none transition-all" aria-label="Закрыть и вернуться на главную" title="На главную">
          ⊗
        </button>
        <div class="text-sm opacity-80" aria-live="polite">
          {{ currentOrder?.name }} • Вопрос {{ currentTurn + 1 }} из {{ currentOrder?.sequence.length }}
        </div>
      </div>
      <p class="text-xs opacity-60">
        Отвечено: {{ passedIds.length }} | Пропущено: {{ activeSkippedCount }}
        <span class="ml-2 font-mono">⏱ {{ timerDisplay }}</span>
      </p>

      <!-- v5.3: Шкала прогресса — сплошная полоска по currentOrder.sequence -->
      <div class="mt-2 flex h-2 rounded-full overflow-hidden gap-0.5">
        <div
          v-for="(qid, i) in (currentOrder?.sequence || [])"
          :key="i"
          class="flex-1 rounded-sm transition-all"
          :class="getProgressCellClass(qid, i)"
        />
      </div>
    </header>

    <!-- Индикатор роли: скрыт когда isFinished или isJumpedTurn (на перепрыгнутом
         ходе не показываем "Теперь ты отвечаешь" — там нечего отвечать). -->
    <div v-if="!isFinished && !isJumpedTurn" class="text-center mb-8" role="status" aria-live="polite">
      <div v-if="amIReading" class="text-2xl font-bold text-indigo-600 dark:text-yellow-400 animate-pulse">
        🗣️ Зачитай вопрос партнеру
      </div>
      <div v-else class="text-2xl font-bold text-emerald-600 dark:text-emerald-300">
        💬 Теперь ты отвечаешь
      </div>
      <p class="text-sm mt-2 opacity-70">
        {{ amIReading
          ? 'Прочитай вопрос вслух, дождись ответа партнёра, затем нажми «Партнёр ответил»'
          : 'Ответь на услышанный вопрос, затем нажми «Я ответил»' }}
      </p>
    </div>

    <!-- На перепрыгнутом ходу показываем компактный заголовок без подсказки -->
    <div v-else-if="!isFinished && isJumpedTurn" class="text-center mb-8" role="status" aria-live="polite">
      <div class="text-2xl font-bold text-gray-500 dark:text-gray-400">
        ⏭️ Этот ход был пропущен
      </div>
    </div>

    <!-- Карточка/подсказка. min-h фиксирует высоту, чтобы кнопка не прыгала. -->
    <main class="flex-grow flex flex-col items-center justify-center" role="main">
      <div class="w-full max-w-lg flex flex-col" style="min-height: 35vh;">

        <!-- ─── Читающий: карточка + пометки ─────────────────── -->
        <template v-if="!isFinished">
          <div v-if="amIReading && currentQuestion" class="flex-grow flex flex-col justify-center">
            <div
              :key="currentQuestion.id"
              class="bg-white/30 dark:bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl text-center animate-flip relative overflow-hidden"
            >
              <!-- Цветовая полоска категории — в самом верху карточки, как border-top. -->
              <div v-if="currentCategory" class="absolute top-0 left-0 right-0 h-1" :style="{ backgroundColor: currentCategory.color }"></div>

              <div class="px-8 pt-6 pb-10">
                <p v-if="currentCategory" class="text-xs opacity-70 mb-2">{{ currentCategory.name }}</p>

                <p class="text-2xl md:text-3xl font-medium leading-relaxed">
                  {{ currentQuestion.text }}
                </p>

                <div v-if="isAnswered" class="mt-4 text-sm text-green-600 dark:text-green-400" role="note">
                  ✅ Этот вопрос был отвечен ранее
                </div>
                <div v-else-if="isSkipped" class="mt-4 text-sm text-orange-500 dark:text-orange-400" role="note">
                  ⚠️ Этот вопрос был пропущен ранее
                </div>
              </div>
            </div>
          </div>

          <!-- ─── Отвечающий: 🤔 + подсказка ───────────────────── -->
          <div v-else-if="!amIReading && currentQuestion && !isJumpedTurn" class="flex-grow flex flex-col items-center justify-center text-center opacity-80">
            <div class="text-6xl mb-4">🤔</div>
            <p class="text-lg">Внимательно слушай партнёра, чтобы ответить на вопрос</p>
          </div>

          <!-- ─── Перепрыгнутый ход (после skip +2 и prev) ──────── -->
          <div v-else-if="!amIReading && currentQuestion && isJumpedTurn" class="flex-grow flex flex-col items-center justify-center text-center opacity-80">
            <div class="text-6xl mb-4">⏭️</div>
            <p class="text-lg">Читающий пропустил этот вопрос — партнёр не услышал его, поэтому и отвечать не на что.</p>
            <p class="text-sm opacity-80 mt-2">
              Переходи к следующему ходу кнопкой «Следующий →» внизу.
            </p>
          </div>
        </template>

        <!-- ─── Завершение (isFinished) ─────────────────────── -->
        <div v-if="isFinished" class="flex-grow flex flex-col items-center justify-center text-center">
          <h2 class="text-3xl font-bold mb-4">🎉 Сессия завершена!</h2>
          <p class="mb-6">Вы обсудили все вопросы в этом наборе.</p>

          <!-- v5.0: статистика сессии -->
          <div class="mb-6 bg-white/10 dark:bg-white/10 backdrop-blur-sm rounded-xl p-4 max-w-md w-full">
            <div class="grid grid-cols-2 gap-3 text-left text-sm">
              <div>
                <div class="opacity-60 text-xs">Отвечено</div>
                <div class="font-bold text-emerald-400">{{ passedIds.length }}</div>
              </div>
              <div>
                <div class="opacity-60 text-xs">Пропущено</div>
                <div class="font-bold text-orange-400">{{ activeSkippedCount }}</div>
              </div>
              <div>
                <div class="opacity-60 text-xs">Время</div>
                <div class="font-bold font-mono">{{ finalDuration }}</div>
              </div>
              <div>
                <div class="opacity-60 text-xs">Начали</div>
                <div class="font-bold text-xs">{{ startDateDisplay }}</div>
              </div>
            </div>
          </div>

          <div class="flex gap-4 justify-center">
            <button @click="resetProgressAndStay"
                    class="px-6 py-3 bg-white text-gray-900 rounded-lg font-bold">
              Начать заново
            </button>
            <button @click="goBack"
                    class="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold">
              На главную
            </button>
          </div>
        </div>

      </div>
    </main>

    <!-- ─── Основная кнопка: "Партнёр ответил" (жёлтый) или "Я ответил" (зелёный).
         Не показывается на isFinished и на перепрыгнутом ходу.
         Отдельный блок ПОД main, фиксирует позицию. ─── -->
    <div v-if="currentQuestion && !isFinished && !isJumpedTurn" class="max-w-lg mx-auto w-full mt-2">
      <button
        @click="handleNext"
        class="w-full py-5 text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95"
        :class="amIReading
          ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900'
          : 'bg-emerald-500 hover:bg-emerald-400 text-white'"
      >
        {{ amIReading ? 'Партнёр ответил ➔' : 'Я ответил ➔' }}
      </button>
    </div>

    <!-- Footer: навигация. Не показывается на isFinished. -->
    <footer v-if="!isFinished" class="mt-4" role="contentinfo">
      <div class="max-w-lg mx-auto flex gap-3 flex-wrap justify-center">
        <button
          @click="handlePrev"
          :disabled="currentTurn === 0"
          class="px-4 py-3 bg-gray-500/30 hover:bg-gray-500/40 disabled:opacity-30 disabled:cursor-not-allowed text-current text-sm font-bold rounded-lg transition-all"
          aria-label="Вернуться к предыдущему вопросу"
        >
          ← Предыдущий
        </button>

        <button
          v-if="amIReading && currentQuestion && !isJumpedTurn"
          @click="handleSkip"
          class="px-4 py-3 bg-orange-500/30 hover:bg-orange-500/40 text-current text-sm font-bold rounded-lg transition-all"
          aria-label="Пропустить вопрос"
        >
          ⏭️ Пропустить
        </button>

        <button
          v-if="isNextOpened"
          @click="handleNextTurn"
          class="px-4 py-3 bg-blue-500/30 hover:bg-blue-500/40 text-current text-sm font-bold rounded-lg transition-all"
          aria-label="Перейти к следующему вопросу"
        >
          Следующий →
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useDeck } from '@/composables/useDeck'

const router = useRouter()
const {
  currentOrder, currentQuestion, currentTurn, amIReading,
  passedIds, skippedIds, activeSkippedCount, isAnswered, isSkipped,
  isJumpedTurn, isNextOpened,
  startTime, elapsedMs, deck,
  nextQuestion, nextTurn, prevQuestion, skipQuestion, resetProgress, isFinished,
  resumeTimer, pauseTimer, getCurrentElapsedMs, formatDuration
} = useDeck()

// v5.3: категория текущего вопроса
const currentCategory = computed(() => {
  if (!currentQuestion.value?.categoryId || !deck.value) return null
  const cats = deck.value.categories
  if (!cats) return null
  return cats[currentQuestion.value.categoryId] || null
})

// v5.3: класс для ячейки шкалы прогресса
function getProgressCellClass(qid, index) {
  if (passedIds.value.includes(qid)) {
    return 'bg-emerald-500'  // отвечен
  }
  if (skippedIds.value.includes(qid) && !passedIds.value.includes(qid)) {
    return 'bg-orange-500'   // пропущен
  }
  if (index === currentTurn.value) {
    return 'bg-yellow-500 ring-1 ring-yellow-300'  // текущий
  }
  return 'bg-white/10'  // будущий
}

// v5.0: таймер, обновляется раз в секунду через setInterval
const tick = ref(0)
const timerDisplay = computed(() => {
  void tick.value  // зависимость для re-render
  return formatDuration(getCurrentElapsedMs())
})
let timerInterval = null

// v5.0: финальная статистика — фиксируется один раз при входе в isFinished
const finalDuration = ref('—')
const startDateDisplay = computed(() => {
  if (!startTime.value) return '—'
  try {
    const d = new Date(startTime.value)
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
           ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
})

// При переходе в isFinished — сохраняем финальную длительность
watch(isFinished, (finished) => {
  if (finished) {
    pauseTimer()
    finalDuration.value = formatDuration(getCurrentElapsedMs())
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  }
})

function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

function handleNext()  { nextQuestion();  vibrate(50) }
function handlePrev()  { prevQuestion();  vibrate(30) }
function handleSkip()  { skipQuestion();  vibrate([50, 100, 50]) }
function handleNextTurn()  { nextTurn();  vibrate(50) }

function goBack() { router.push('/') }

function resetProgressAndStay() {
  resetProgress()
  router.push('/')
}

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

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  // v5.0: запускаем интервал обновления таймера (раз в секунду)
  timerInterval = setInterval(() => { tick.value++ }, 1000)
  // v5.0: продолжаем отсчёт таймера (если сессия не завершена)
  if (!isFinished.value) {
    resumeTimer()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  // v5.0: при покидании GameView (через goBack на главную) — приостановим таймер.
  // На главной экране таймер не идёт, накопленное время сохранится.
  pauseTimer()
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
})
</script>

<style scoped>
.perspective-1000 { perspective: 1000px; }
</style>
