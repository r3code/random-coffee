<template>
  <div
    class="min-h-dvh flex flex-col p-4 transition-colors duration-500"
    :class="amIReading
      ? 'bg-indigo-900 dark:bg-indigo-950 text-white'
      : 'bg-gray-800 dark:bg-gray-900 text-gray-300'"
    style="padding-bottom: env(safe-area-inset-bottom); padding-top: env(safe-area-inset-top);"
  >
    <!-- Шапка -->
    <header class="text-center mb-6" role="banner">
      <div class="flex justify-between items-center mb-2">
        <button @click="goBack" class="text-sm opacity-70 hover:opacity-100" aria-label="Вернуться к настройкам">
          ← Назад
        </button>
        <div class="text-sm opacity-80" aria-live="polite">
          {{ currentOrder?.name }} • Вопрос {{ currentTurn + 1 }} из {{ currentOrder?.sequence.length }}
        </div>
      </div>
      <p class="text-xs opacity-60">
        Отвечено: {{ passedIds.length }} | Пропущено: {{ activeSkippedCount }}
      </p>
    </header>

    <!-- Индикатор роли -->
    <div class="text-center mb-8" role="status" aria-live="polite">
      <div v-if="amIReading" class="text-2xl font-bold text-yellow-400 animate-pulse">
        🗣️ ВАША ОЧЕРЕДЬ ЧИТАТЬ
      </div>
      <div v-else class="text-2xl font-bold text-green-400">
        💬 ВАША ОЧЕРЕДЬ ОТВЕЧАТЬ
      </div>
      <p class="text-sm mt-2 opacity-70">
        {{ amIReading
          ? 'Прочитайте вопрос вслух, дождитесь ответа партнёра, затем нажмите «Партнёр ответил»'
          : 'Ответьте на услышанный вопрос, затем нажмите «Я ответил»' }}
      </p>
    </div>

    <!-- Карточка вопроса: видна ТОЛЬКО читающему.
         Отвечающий не видит текст — он слушает. -->
    <main class="flex-grow flex items-center justify-center" role="main">
      <div v-if="amIReading && currentQuestion && !isFinished" class="perspective-1000 w-full max-w-lg">
        <div
          :key="currentQuestion.id"
          class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl text-center animate-flip"
        >
          <p class="text-2xl md:text-3xl font-medium leading-relaxed">
            {{ currentQuestion.text }}
          </p>

          <!-- Пометка "Отвечен ранее" имеет приоритет над "Пропущен ранее" -->
          <div v-if="isAnswered" class="mt-4 text-sm text-green-400" role="note">
            ✅ Этот вопрос был отвечен ранее
          </div>
          <div v-else-if="isSkipped" class="mt-4 text-sm text-orange-400" role="note">
            ⚠️ Этот вопрос был пропущен ранее
          </div>
        </div>
      </div>
      <div v-else-if="!amIReading && currentQuestion && !isFinished" class="text-center opacity-80">
        <div class="text-6xl mb-4">🤔</div>
        <p class="text-lg">Внимательно слушайте партнёра, чтобы ответить на вопрос</p>
      </div>
      <div v-else class="text-center">
        <h2 class="text-3xl font-bold mb-4">🎉 Сессия завершена!</h2>
        <p class="mb-6">Вы обсудили все вопросы в этом порядке.</p>
        <div class="flex gap-4 justify-center">
          <button @click="resetProgressAndStay"
                  class="px-6 py-3 bg-white text-gray-900 rounded-lg font-bold">
            Начать заново
          </button>
          <button @click="goBack"
                  class="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold">
            На главную
          </button>
        </div>
      </div>
    </main>

    <!-- Кнопки -->
    <footer class="mt-8 space-y-3" role="contentinfo">
      <!-- Кнопки доступны обеим ролям: каждая сторона подтверждает свой шаг.
           Читающий: "Партнёр ответил" → nextQuestion
           Отвечающий: "Я ответил" → nextQuestion
           Пропустить может только читающий (он видит текст и решает, что вопрос не подходит). -->
      <div v-if="currentQuestion && !isFinished" class="flex gap-3">
        <button
          @click="handlePrev"
          :disabled="currentTurn === 0"
          class="px-4 py-5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base font-bold rounded-xl transition-all"
          aria-label="Вернуться к предыдущему вопросу"
        >
          ←
        </button>
        <button
          @click="handleNext"
          class="flex-1 py-5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95"
        >
          {{ amIReading ? 'Партнёр ответил ➔' : 'Я ответил ➔' }}
        </button>
        <button
          v-if="amIReading"
          @click="handleSkip"
          class="px-4 py-5 bg-orange-500 hover:bg-orange-400 text-white text-base font-bold rounded-xl shadow-lg transition-all active:scale-95"
          aria-label="Пропустить вопрос"
        >
          ⏭️ Пропустить
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useDeck } from '@/composables/useDeck'

const router = useRouter()
const {
  currentOrder, currentQuestion, currentTurn, amIReading,
  passedIds, activeSkippedCount, isAnswered, isSkipped,
  nextQuestion, prevQuestion, skipQuestion, resetProgress, isFinished
} = useDeck()

function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

function handleNext()  { nextQuestion();  vibrate(50) }
function handlePrev()  { prevQuestion();  vibrate(30) }
function handleSkip()  { skipQuestion();  vibrate([50, 100, 50]) }

function goBack() { router.push('/') }

function resetProgressAndStay() {
  resetProgress()
  router.push('/')
}

function onKeyDown(e) {
  if (isFinished.value) return
  // Только читающий может управлять ходом с клавиатуры (у отвечающего нет карточки)
  if (!amIReading.value) return
  if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); handleNext() }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); handlePrev() }
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') { e.preventDefault(); handleSkip() }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>
.perspective-1000 { perspective: 1000px; }
</style>
