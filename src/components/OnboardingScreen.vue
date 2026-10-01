<template>
  <!--
    OnboardingScreen — полноэкранный онбординг (v5.15).
    Показывается при первом заходе, пока пользователь не нажмёт «Больше не показывать».
    Также может быть открыт повторно через «ℹ️ О приложении» в footer или «📱 Установить».

    v5.19: блоки «Как это работает» и «Установить как приложение» — accordion (<details>).
    При первом показе (fromFooter=false) оба раскрыты.
    При открытии через «📱 Установить» (focusInstall=true) — install раскрыт, howItWorks свёрнут,
    авто-скролл к install-блоку.
  -->
  <transition name="onboarding-fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-50 dark:bg-gradient-to-br dark:from-indigo-900 dark:to-purple-900 text-stone-900 dark:text-white transition-colors"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div ref="scrollRoot" class="max-w-md w-full max-h-dvh overflow-y-auto bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-stone-200 dark:border-white/10 shadow-2xl transition-colors">
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

        <!-- Privacy / офлайн — всегда виден (не accordion) -->
        <div class="mb-6 space-y-2">
          <div class="flex items-center gap-2 text-sm">
            <span class="text-emerald-500 dark:text-emerald-400" aria-hidden="true">✓</span>
            <span class="opacity-90">Без регистрации.</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-emerald-500 dark:text-emerald-400" aria-hidden="true">✓</span>
            <span class="opacity-90">Данные только у вас — на устройстве. Ничего не уходит на сервер.</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-emerald-500 dark:text-emerald-400" aria-hidden="true">✓</span>
            <span class="opacity-90">Работает офлайн — после первой загрузки.</span>
          </div>
        </div>

        <!-- ── Accordion: Как это работает ── -->
        <details
          class="mb-3 rounded-xl border border-stone-200 dark:border-white/10 overflow-hidden bg-stone-50 dark:bg-white/5"
          :open="blocksOpen.howItWorks"
          @toggle="onToggleHowItWorks"
        >
          <summary class="cursor-pointer p-4 font-bold text-sm flex items-center justify-between hover:bg-stone-100 dark:hover:bg-white/5 transition-colors list-none">
            <span>Как это работает</span>
            <span class="text-xs opacity-50" aria-hidden="true">{{ blocksOpen.howItWorks ? '▲' : '▼' }}</span>
          </summary>
          <div class="px-4 pb-4">
            <ol class="space-y-3 text-sm">
              <li class="flex gap-3">
                <span class="shrink-0 w-6 h-6 rounded-full bg-amber-300 text-amber-900 dark:bg-yellow-500 dark:text-gray-900 flex items-center justify-center font-bold text-xs">1</span>
                <span class="opacity-90">Выберите колоду вопросов из каталога — что вам ближе: для знакомства с коллегой, для пар и первого свидания, для друзей.</span>
              </li>
              <li class="flex gap-3">
                <span class="shrink-0 w-6 h-6 rounded-full bg-amber-300 text-amber-900 dark:bg-yellow-500 dark:text-gray-900 flex items-center justify-center font-bold text-xs">2</span>
                <div class="opacity-90 space-y-2">
                  <p>Синхронизация с партнёром — один из двух способов:</p>
                  <ul class="space-y-1.5 pl-1">
                    <li class="flex gap-2">
                      <span class="shrink-0 text-amber-600 dark:text-yellow-400">•</span>
                      <span>Договоритесь об одинаковой букве порядка — оба выбирают её самостоятельно. <strong class="text-amber-700 dark:text-yellow-400">Важно: роли должны быть разными</strong> — один «читаю первым», другой «слушаю первым».</span>
                    </li>
                    <li class="flex gap-2">
                      <span class="shrink-0 text-amber-600 dark:text-yellow-400">•</span>
                      <span>Или один выбирает всё и отправляет QR-код / ссылку — второй попадает в ту же сессию, роль назначается автоматически (противоположная).</span>
                    </li>
                  </ul>
                </div>
              </li>
              <li class="flex gap-3">
                <span class="shrink-0 w-6 h-6 rounded-full bg-amber-300 text-amber-900 dark:bg-yellow-500 dark:text-gray-900 flex items-center justify-center font-bold text-xs">3</span>
                <span class="opacity-90">Чередуйтесь: читаешь вопрос → отвечаешь → меняетесь ролями.</span>
              </li>
            </ol>
          </div>
        </details>

        <!-- ── Accordion: Установить как приложение ── -->
        <details
          v-if="!isStandalone"
          ref="installBlock"
          class="mb-6 rounded-xl border border-amber-300 dark:border-yellow-500/40 overflow-hidden bg-amber-50 dark:bg-yellow-500/10 scroll-mt-4"
          :open="blocksOpen.install"
          @toggle="onToggleInstall"
        >
          <summary class="cursor-pointer p-4 font-bold text-sm flex items-center justify-between hover:bg-amber-100 dark:hover:bg-yellow-500/15 transition-colors list-none">
            <span>📱 Установить как приложение</span>
            <span class="text-xs opacity-50" aria-hidden="true">{{ blocksOpen.install ? '▲' : '▼' }}</span>
          </summary>
          <div class="px-4 pb-4 text-sm space-y-2 opacity-90">
            <!-- iOS Safari -->
            <div v-if="isIOSSafari">
              <p>Нажми <strong class="text-amber-700 dark:text-yellow-400">Поделиться</strong> внизу Safari, затем «На экран Домой».</p>
            </div>
            <!-- iOS Chrome/Edge/Firefox — не поддерживают, предложим открыть в Safari -->
            <div v-else-if="isIOSOther">
              <p>На iPhone установку поддерживает только Safari. Открой этот сайт в Safari → «Поделиться» → «На экран Домой».</p>
            </div>
            <!-- Android Chrome -->
            <div v-else-if="isAndroidChrome">
              <p>Меню Chrome (⋮ справа вверху) → «Установить приложение».</p>
            </div>
            <!-- Android Firefox (вкл. Nightly/Fennec) -->
            <div v-else-if="isAndroidFirefox">
              <p>Меню Firefox (⋮) → «Больше» → «Добавить на главный экран».</p>
            </div>
            <!-- Android Edge -->
            <div v-else-if="isAndroidEdge">
              <p>Меню Edge (⋯ снизу) → «Добавить на телефон».</p>
            </div>
            <!-- Android Other (Samsung Internet, Brave, и т.д.) -->
            <div v-else-if="isAndroidOther">
              <p>Открой меню браузера (⋮) → найди пункт «Добавить на главный экран» или «Установить приложение».</p>
            </div>
            <!-- Desktop Chrome/Edge -->
            <div v-else-if="browser === 'chrome' || browser === 'edge'">
              <p>Нажми иконку <strong class="text-amber-700 dark:text-yellow-400">⊕ установки</strong> в адресной строке справа или меню браузера → «Установить Random Coffee».</p>
            </div>
            <!-- Desktop Firefox -->
            <div v-else-if="browser === 'firefox'">
              <p>Меню Firefox (☰ справа) → «Установить» или перетащи URL на рабочий стол.</p>
            </div>
            <!-- Desktop Safari (macOS) -->
            <div v-else-if="browser === 'safari'">
              <p>Поделись <strong class="text-amber-700 dark:text-yellow-400">⌘ + Share</strong> → «Добавить на экран Домой» или Dock.</p>
            </div>
            <!-- Fallback -->
            <div v-else>
              <p>Открой сайт в Chrome, Edge или Safari — там доступна установка как PWA.</p>
            </div>
          </div>
        </details>

        <!-- Кнопки -->
        <div class="space-y-3">
          <button
            @click="close"
            class="w-full py-3 bg-amber-300 hover:bg-amber-400 text-amber-900 dark:bg-yellow-500 dark:hover:bg-yellow-400 dark:text-gray-900 font-bold rounded-xl transition-all active:scale-95"
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
import { ref, watch, nextTick } from 'vue'
import { usePlatform } from '@/composables/usePlatform'

// props:
//   visible: Boolean — показывать ли модал
//   fromFooter: Boolean — открыт через «ℹ️ О приложении» ИЛИ «📱 Установить» в footer
//   focusInstall: Boolean — если true (открытие через «📱 Установить»), то:
//     install-блок раскрыт, howItWorks свёрнут, авто-скролл к install-блоку
const props = defineProps({
  visible: { type: Boolean, default: false },
  fromFooter: { type: Boolean, default: false },
  focusInstall: { type: Boolean, default: false }
})

// emits:
//   close — пользователь нажал «Понятно, начать» (не ставит флаг)
//   dismiss — пользователь нажал «Больше не показывать» (ставит флаг)
const emit = defineEmits(['close', 'dismiss'])

// Платформа для блока «Установить как приложение»
const {
  isStandalone,
  isIOSSafari,
  isIOSOther,
  isAndroidChrome,
  isAndroidFirefox,
  isAndroidEdge,
  isAndroidOther,
  browser,
} = usePlatform()

// Refs для accordion-блоков
const scrollRoot = ref(null)
const installBlock = ref(null)

// State для accordion: defaults зависят от focusInstall
// - focusInstall=true (открытие через «📱 Установить»): install=true, howItWorks=false
// - focusInstall=false (первый показ или «ℹ️ О приложении»): оба true
const blocksOpen = ref({
  howItWorks: !props.focusInstall,
  install: true,
})

// Если props.focusInstall меняется (например, пользователь открыл сначала через
// «ℹ️ О приложении», закрыл, потом через «📱 Установить») — обновим defaults
// и сделаем авто-скролл к install-блоку.
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    blocksOpen.value = {
      howItWorks: !props.focusInstall,
      install: true,
    }
    if (props.focusInstall) {
      await nextTick()
      // Ждём чуть-чуть, чтобы details успел раскрыться перед скроллом
      setTimeout(() => {
        if (installBlock.value && installBlock.value.$el) {
          installBlock.value.$el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else if (installBlock.value && installBlock.value.scrollIntoView) {
          // ref на нативный <details> — у него нет $el, это сам DOM-элемент
          installBlock.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 150)
    }
  }
}, { immediate: true })

function onToggleHowItWorks(e) {
  blocksOpen.value.howItWorks = e.target.open
}

function onToggleInstall(e) {
  blocksOpen.value.install = e.target.open
}

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
/* Убираем дефолтный triangle marker у <summary> (используем свой ▲▼) */
details > summary {
  list-style: none;
}
details > summary::-webkit-details-marker {
  display: none;
}
</style>
