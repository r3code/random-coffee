<template>
  <!--
    OnboardingScreen — полноэкранный онбординг (v5.15).
    Показывается при первом заходе, пока пользователь не нажмёт «Больше не показывать».
    Также может быть открыт повторно через ссылку «ℹ️ О приложении» в footer.
  -->
  <transition name="onboarding-fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-indigo-900 to-purple-900 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div class="max-w-md w-full max-h-dvh overflow-y-auto bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        <!-- Иконка приложения (большая) + название -->
        <div class="text-center mb-6">
          <img
            src="/icon-192.png?v=5.15.0"
            alt="Random Coffee"
            class="w-24 h-24 mx-auto mb-3 rounded-2xl shadow-lg"
          />
          <h1 id="onboarding-title" class="text-3xl font-bold mb-1">Random Coffee</h1>
          <p class="text-sm opacity-70">Карточки вопросов для парных разговоров</p>
        </div>

        <!-- Как это работает -->
        <div class="mb-6">
          <h2 class="text-sm font-bold opacity-60 mb-3 uppercase tracking-wide">Как это работает</h2>
          <ol class="space-y-2 text-sm">
            <li class="flex gap-3">
              <span class="shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-gray-900 flex items-center justify-center font-bold text-xs">1</span>
              <span class="opacity-90">Выберите колоду — для облегчения общения: для знакомства с коллегой, для пар и первого свидания, для друзей. Выбери подходящее тебе из каталога.</span>
            </li>
            <li class="flex gap-3">
              <span class="shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-gray-900 flex items-center justify-center font-bold text-xs">2</span>
              <span class="opacity-90">Договоритесь с партнёром о букве порядка (одинаковая буква = одинаковые вопросы).</span>
            </li>
            <li class="flex gap-3">
              <span class="shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-gray-900 flex items-center justify-center font-bold text-xs">3</span>
              <span class="opacity-90">Покажите партнёру QR-код или отправьте ссылку — он попадёт в ту же сессию.</span>
            </li>
            <li class="flex gap-3">
              <span class="shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-gray-900 flex items-center justify-center font-bold text-xs">4</span>
              <span class="opacity-90">Чередуйтесь: читаешь вопрос → отвечаешь → меняетесь ролями.</span>
            </li>
          </ol>
        </div>

        <!-- Privacy / офлайн -->
        <div class="mb-6 space-y-2">
          <div class="flex items-center gap-2 text-sm">
            <span class="text-emerald-400" aria-hidden="true">✓</span>
            <span class="opacity-90">Без регистрации. Сразу начать.</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-emerald-400" aria-hidden="true">✓</span>
            <span class="opacity-90">Данные только у вас — на устройстве. Ничего не уходит на сервер.</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-emerald-400" aria-hidden="true">✓</span>
            <span class="opacity-90">Работает офлайн — после первой загрузки.</span>
          </div>
        </div>

        <!-- Кнопки -->
        <div class="space-y-3">
          <button
            @click="close"
            class="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition-all active:scale-95"
          >
            Понятно, начать →
          </button>
          <button
            v-if="!fromFooter"
            @click="dismissForever"
            class="w-full py-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            Больше не показывать
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'

// props:
//   visible: Boolean — показывать ли модал
//   fromFooter: Boolean — открыт через «ℹ️ О приложении» в footer (не показываем «Больше не показывать»)
const props = defineProps({
  visible: { type: Boolean, default: false },
  fromFooter: { type: Boolean, default: false }
})

// emits:
//   close — пользователь нажал «Понятно, начать» (не ставит флаг)
//   dismiss — пользователь нажал «Больше не показывать» (ставит флаг)
const emit = defineEmits(['close', 'dismiss'])

function close() {
  emit('close')
}

function dismissForever() {
  emit('dismiss')
}
</script>

<style scoped>
.onboarding-fade-enter-active,
.onboarding-fade-leave-active {
  transition: opacity 0.2s ease;
}
.onboarding-fade-enter-from,
.onboarding-fade-leave-to {
  opacity: 0;
}
</style>
