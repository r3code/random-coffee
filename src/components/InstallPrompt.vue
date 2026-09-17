<!--
  InstallPrompt.vue — кнопка «Установить приложение» и iOS-инструкция.

  Логика:
  1. Слушаем window 'beforeinstallprompt' (Chrome/Edge/Samsung — Android/Desktop).
     Сохраняем событие, показываем кнопку «Установить приложение».
  2. По клику — вызываем сохранённое событие, открывается системный диалог установки.
  3. После установки (событие 'appinstalled') — кнопка исчезает, показываем «✓ Установлено» на 4 сек.
  4. На iOS Safari 'beforeinstallprompt' НЕ поддерживается. Определяем iOS Safari
     через UA, показываем подсказку с инструкцией «Поделиться → На главный экран».
  5. Не показываем кнопку, если уже в standalone-режиме (PWA установлено и открыто
     с домашнего экрана) — через matchMedia('(display-mode: standalone)') или
     navigator.standalone (iOS).

  Поведение в localStorage:
  - 'install_dismissed' — пользователь отклонил подсказку. Не показываем снова
    до тех пор, пока не запустит событие beforeinstallprompt заново (т.е. Chrome
    решит, что пора предложить установку — обычно через 30 дней или по алгоритмам).
-->
<template>
  <!-- Не показываем в standalone-режиме (PWA уже установлено и открыто с иконки). -->
  <div v-if="shouldShow">
    <!-- Android/Desktop Chrome — настоящая кнопка -->
    <div
      v-if="deferredPrompt"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-40"
    >
      <div class="bg-indigo-600 dark:bg-indigo-800 text-white rounded-xl shadow-2xl p-4 border border-white/10">
        <div class="flex items-start gap-3">
          <div class="text-2xl shrink-0">📱</div>
          <div class="flex-grow min-w-0">
            <p class="font-bold text-sm">Установить приложение</p>
            <p class="text-xs opacity-80 mt-1">
              Добавьте иконку на главный экран, чтобы запускать без браузера и без интернета.
            </p>
          </div>
          <button
            @click="dismiss"
            class="text-white/60 hover:text-white text-lg leading-none -mt-1 shrink-0"
            aria-label="Закрыть подсказку"
            title="Не сейчас"
          >
            ✕
          </button>
        </div>
        <div class="flex gap-2 mt-3">
          <button
            @click="install"
            class="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-bold text-sm transition-colors"
          >
            Установить
          </button>
        </div>
      </div>
    </div>

    <!-- iOS Safari — текстовая инструкция, кнопки нет -->
    <div
      v-else-if="isIOSSafari"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-40"
    >
      <div class="bg-indigo-600 dark:bg-indigo-800 text-white rounded-xl shadow-2xl p-4 border border-white/10">
        <div class="flex items-start gap-3">
          <div class="text-2xl shrink-0">📱</div>
          <div class="flex-grow min-w-0">
            <p class="font-bold text-sm">Установить на iPhone</p>
            <p class="text-xs opacity-80 mt-1">
              Нажмите «Поделиться» в Safari, затем «На главный экран»
            </p>
          </div>
          <button
            @click="dismiss"
            class="text-white/60 hover:text-white text-lg leading-none -mt-1 shrink-0"
            aria-label="Закрыть подсказку"
            title="Не сейчас"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Успешная установка — пропадает через 4 секунды -->
    <div
      v-if="justInstalled"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-40"
    >
      <div class="bg-emerald-600 text-white rounded-xl shadow-2xl p-4 border border-white/10">
        <div class="flex items-center gap-3">
          <div class="text-2xl">✓</div>
          <p class="text-sm font-bold">Приложение установлено</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const deferredPrompt = ref(null)
const justInstalled = ref(false)
const isStandalone = ref(false)
const isIOSSafari = ref(false)
const dismissed = ref(false)

// Показываем подсказку если:
// - не standalone (PWA не установлено или открыто в браузере)
// - есть deferredPrompt (Android/Desktop Chrome) ИЛИ это iOS Safari
// - пользователь не отклонял подсказку ранее (localStorage)
const shouldShow = computed(() => {
  if (isStandalone.value) return false
  if (dismissed.value) return false
  // Показываем либо при наличии deferredPrompt (Chrome), либо на iOS Safari
  return !!deferredPrompt.value || isIOSSafari.value
})

function detectStandalone() {
  // iOS Safari: navigator.standalone
  if (typeof navigator !== 'undefined' && navigator.standalone) return true
  // Другие браузеры: display-mode: standalone
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(display-mode: standalone)').matches
  }
  return false
}

function detectIOSSafari() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const ua = navigator.userAgent
  // iOS (iPhone/iPad) — iPadOS 13+ в Safari выглядит как macOS, проверяем touch + Mac
  const isIOS = /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // Safari (не Chrome на iOS — Chrome на iOS тоже Safari под капотом, но
  // beforeinstallprompt не работает ни там, ни там — показываем инструкцию в обоих случаях)
  const isSafari = /^((?!CriOS|FxiOS|EdgiOS).)*Safari/.test(ua)
  return isIOS && isSafari
}

function onBeforeInstallPrompt(e) {
  // Предотвращаем стандартный показ мини-инфобара (Chrome 76+)
  e.preventDefault()
  // Сохраняем событие — оно нужно для вызова prompt() позже
  deferredPrompt.value = e
  // Если пользователь ранее отклонял — не показываем снова автоматически.
  if (localStorage.getItem('install_dismissed') === '1') {
    dismissed.value = true
  } else {
    dismissed.value = false
  }
}

function onAppInstalled() {
  // Очищаем сохранённое событие, показываем «Установлено» на 4 сек
  deferredPrompt.value = null
  justInstalled.value = true
  setTimeout(() => { justInstalled.value = false }, 4000)
}

async function install() {
  if (!deferredPrompt.value) return
  // Вызываем системный диалог установки
  deferredPrompt.value.prompt()
  // Ждём ответа пользователя
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    // onAppInstalled сработает — покажет «Установлено»
    // Сбрасываем флаг «отклонено», т.к. пользователь установил
    localStorage.removeItem('install_dismissed')
  } else if (outcome === 'dismissed') {
    // Пользователь отклонил в системном диалоге — не навязываем
    localStorage.setItem('install_dismissed', '1')
    dismissed.value = true
  }
  // Очищаем сохранённое событие — оно одноразовое
  deferredPrompt.value = null
}

function dismiss() {
  dismissed.value = true
  localStorage.setItem('install_dismissed', '1')
}

onMounted(() => {
  isStandalone.value = detectStandalone()
  isIOSSafari.value = detectIOSSafari()
  // Если пользователь ранее отклонил — не показываем снова при этом визите
  if (localStorage.getItem('install_dismissed') === '1') {
    dismissed.value = true
  }
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>
