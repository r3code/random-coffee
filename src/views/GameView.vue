<template>
  <div
    class="min-h-dvh flex flex-col p-4 transition-colors duration-500"
    :class="amIReading
      ? 'bg-indigo-900 dark:bg-indigo-950 text-white'
      : 'bg-gray-800 dark:bg-gray-900 text-gray-300'"
    style="padding-bottom: env(safe-area-inset-bottom); padding-top: env(safe-area-inset-top);"
  >
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
        Пройдено: {{ passedIds.length }} | Пропущено: {{ skippedIds.length }}
      </p>
    </header>

    <div class="text-center mb-8" role="status" aria-live="polite">
      <div v-if="amIReading" class="text-2xl font-bold text-yellow-400 animate-pulse">
        🗣️ ВАША ОЧЕРЕДЬ ЧИТАТЬ
      </div>
      <div v-else class="text-2xl font-bold text-green-400">
        👂 ВАША ОЧЕРЕДЬ СЛУШАТЬ
      </div>
      <p class="text-sm mt-2 opacity-70">
        {{ amIReading ? 'Прочитайте вопрос вслух и дождитесь ответа' : 'Внимательно слушайте партнера' }}
      </p>
    </div>

    <main class="flex-grow flex items-center justify-center" role="main">
      <div v-if="currentQuestion && !isFinished" class="perspective-1000 w-full max-w-lg">
        <div
          :key="currentQuestion.id"
          class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl text-center animate-flip"
        >
          <p class="text-2xl md:text-3xl font-medium leading-relaxed">
            {{ currentQuestion.text }}
          </p>
          <div v-if="isSkipped" class="mt-4 text-sm text-orange-400" role="note">
            ⚠️ Этот вопрос был пропущен ранее
          </div>
        </div>
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

    <footer class="mt-8 space-y-3" role="contentinfo">
      <div v-if="amIReading && currentQuestion && !isFinished" class="flex gap-3">
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
          Ответ услышан ➔
        </button>
        <button
          @click="handleSkip"
          class="px-4 py-5 bg-orange-500 hover:bg-orange-400 text-white text-base font-bold rounded-xl shadow-lg transition-all active:scale-95"
          aria-label="Пропустить вопрос"
        >
          ⏭️
        </button>
      </div>
      <div
        v-else-if="currentQuestion && !isFinished"
        class="w-full py-5 bg-gray-700 text-gray-500 text-xl font-bold rounded-xl text-center"
      >
        Ждите партнера...
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
  passedIds, skippedIds, isSkipped,
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
  if (!amIReading.value || isFinished.value) return
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
