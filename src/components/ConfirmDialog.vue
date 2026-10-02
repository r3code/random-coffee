<template>
  <!--
    ConfirmDialog — переиспользуемая модалка подтверждения.

    Props:
      visible: Boolean — показывать ли модал
      title: String — заголовок (жирный, крупный)
      message: String — основной текст (опционально, серый)
      buttons: Array<{ id: String, label: String, variant?: 'primary' | 'danger' | 'secondary', hint?: String }>
        variant:
          'primary'   — жёлтая кнопка (рекомендуемое действие)
          'danger'    — красная (деструктивное)
          'secondary'  — серая/прозрачная (отмена, альтернатива)

    Emits:
      close(buttonId) — пользователь нажал кнопку с этим id
        (если кликнул на backdrop или нажал Esc — buttonId === 'cancel')

    Пример:
      <ConfirmDialog
        :visible="showDeleteDialog"
        title="Удалить колоду «Для пар»?"
        :buttons="[
          { id: 'cascade', label: 'Удалить колоду и 3 сессии', variant: 'danger', hint: 'Полная очистка' },
          { id: 'only-deck', label: 'Удалить только колоду', variant: 'secondary', hint: 'Сессии останутся в истории' },
          { id: 'cancel', label: 'Отмена', variant: 'secondary' }
        ]"
        @close="onClose"
      />
  -->
  <transition name="dialog-fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      @click.self="onBackdropClick"
      @keydown.esc="onEsc"
    >
      <div
        ref="dialogEl"
        class="max-w-md w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl shadow-2xl border border-stone-200 dark:border-white/10 overflow-hidden"
        tabindex="-1"
      >
        <!-- Заголовок -->
        <div v-if="title" class="p-6 pb-2">
          <h2 class="text-xl font-bold leading-tight">{{ title }}</h2>
        </div>

        <!-- Сообщение -->
        <div v-if="message" class="px-6 pb-4 text-sm opacity-70 whitespace-pre-line">
          {{ message }}
        </div>

        <!-- Кнопки -->
        <div class="p-4 pt-2 space-y-2">
          <button
            v-for="btn in buttons"
            :key="btn.id"
            @click="onButtonClick(btn.id)"
            :class="buttonClass(btn.variant)"
            class="w-full py-3 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-between gap-3"
          >
            <span class="text-left flex-grow">{{ btn.label }}</span>
            <span v-if="btn.hint" class="text-xs opacity-60 font-normal">{{ btn.hint }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  buttons: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])

const dialogEl = ref(null)

// Фокус на диалоге при открытии (для a11y — скринридеры читают заголовок)
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await nextTick()
    dialogEl.value?.focus()
  }
})

function buttonClass(variant) {
  if (variant === 'primary') {
    return 'bg-amber-300 hover:bg-amber-400 text-amber-900 dark:bg-yellow-500 dark:hover:bg-yellow-400 dark:text-gray-900'
  }
  if (variant === 'danger') {
    return 'bg-red-500 hover:bg-red-400 text-white dark:bg-red-600 dark:hover:bg-red-500'
  }
  // secondary
  return 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white'
}

function onButtonClick(id) {
  emit('close', id)
}

function onBackdropClick() {
  emit('close', 'cancel')
}

function onEsc(e) {
  e.preventDefault()
  emit('close', 'cancel')
}
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
