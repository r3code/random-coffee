<template>
  <router-view />
  <InstallPrompt />

  <!-- Уведомление об обновлении PWA (registerType: 'prompt') —
       пользователь сам решает, когда перезагрузить. Без авто-обновления. -->
  <div
    v-if="needRefresh"
    class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50"
  >
    <div class="bg-emerald-600 text-white rounded-xl shadow-2xl p-4 border border-white/10">
      <div class="flex items-start gap-3">
        <div class="text-2xl shrink-0">🔄</div>
        <div class="flex-grow min-w-0">
          <p class="font-bold text-sm">Доступна новая версия</p>
          <p class="text-xs opacity-80 mt-1">
            Обновите, чтобы получить последние изменения и не рассинхронизироваться с партнёром.
          </p>
        </div>
        <button
          @click="dismissUpdate"
          class="text-white/60 hover:text-white text-lg leading-none -mt-1 shrink-0"
          aria-label="Позже"
          title="Позже"
        >
          ✕
        </button>
      </div>
      <div class="flex gap-2 mt-3">
        <button
          @click="update"
          class="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-bold text-sm transition-colors"
        >
          Обновить
        </button>
      </div>
    </div>
  </div>

  <!-- Уведомление «готово к оффлайн» — показываем один раз, тихо убираем. -->
  <div
    v-if="offlineReady"
    class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50"
  >
    <div class="bg-indigo-600 dark:bg-indigo-800 text-white rounded-xl shadow-2xl p-4 border border-white/10">
      <div class="flex items-center gap-3">
        <div class="text-2xl shrink-0">✓</div>
        <div class="flex-grow min-w-0">
          <p class="font-bold text-sm">Готово к оффлайн</p>
          <p class="text-xs opacity-80 mt-1">
            Приложение закэшировано. Можно запускать без интернета.
          </p>
        </div>
        <button
          @click="offlineReady = false"
          class="text-white/60 hover:text-white text-lg leading-none -mt-1 shrink-0"
          aria-label="Закрыть"
          title="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import InstallPrompt from '@/components/InstallPrompt.vue'

// ─── PWA: UI уведомления об обновлении ────────────────────────
// registerType: 'prompt' — пользователь сам решает, когда обновиться.
// SW не активируется автоматически (avoid auto-reload в середине сессии).
const needRefresh = ref(false)
const offlineReady = ref(false)

const { updateServiceWorker } = useRegisterSW({
  onOfflineReady() {
    offlineReady.value = true
  },
  onNeedRefresh() {
    needRefresh.value = true
  }
})

function update() {
  updateServiceWorker(true)  // true = перезагрузить страницу после обновления
}

function dismissUpdate() {
  // Не обновляем сейчас — пользователь сам перезагрузит позже.
  // SW остаётся waiting, при следующем визите попросит снова.
  needRefresh.value = false
}
</script>
