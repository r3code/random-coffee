/**
 * usePlatform — определение платформы и браузера для платформо-специфичных UI-инструкций.
 *
 * Используется в OnboardingScreen (блок «Установить как приложение») и может
 * использоваться в InstallPrompt как замена встроенной логики detectIOSSafari.
 *
 * Возвращает ref-ы (computed), безопасны для SSR (на сервере все false).
 */
import { computed } from 'vue'

function detect() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { os: 'unknown', browser: 'unknown', isStandalone: false }
  }

  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''

  // iPadOS 13+ в Safari выглядит как macOS, но поддерживает touch
  const isIOS = /iPhone|iPod/.test(ua) ||
    (/iPad/.test(ua) || (platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1))

  const isAndroid = /Android/.test(ua)

  // Mac (не iPad)
  const isMac = /Macintosh|MacIntel/.test(platform) && !isIOS

  // Windows
  const isWindows = /Win|Windows/.test(platform)

  // Linux (включая ChromeOS, который часто репортит как Linux)
  const isLinux = /Linux/.test(platform) && !isAndroid

  // Определение браузера
  // Chrome на iOS использует CriOS, Edge — EdgiOS, Firefox — FxiOS
  const isIOSChrome = /CriOS/.test(ua)
  const isIOSEdge = /EdgiOS/.test(ua)
  const isIOSFirefox = /FxiOS/.test(ua)
  const isIOSSafari = isIOS && !isIOSChrome && !isIOSEdge && !isIOSFirefox && /Safari/.test(ua)

  // Android — различаем Chrome, Firefox (вкл. Nightly/Fennec), Edge, и Other.
  // ВАЖНО: порядок проверок — Firefox/Edge ПЕРЕД Chrome, т.к. Edge/Brave/Samsung
  // на Chromium тоже содержат "Chrome/" в UA, но мы хотим определить их как
  // отдельные браузеры (для платформо-специфичных инструкций).
  const isAndroidFirefox = isAndroid && /Firefox|FxiOS/.test(ua)
  const isAndroidEdge = isAndroid && !isAndroidFirefox && /Edg/.test(ua)
  const isAndroidChrome = isAndroid && !isAndroidFirefox && !isAndroidEdge && /Chrome|CriOS/.test(ua)

  // Desktop Chrome (НЕ Edge на Chromium — у Edge есть "Edg/" в UA)
  const isDesktopChrome = !isIOS && !isAndroid && /Chrome|Chromium/.test(ua) && !/Edg/.test(ua)
  const isDesktopEdge = !isIOS && !isAndroid && /Edg/.test(ua)
  const isDesktopFirefox = !isIOS && !isAndroid && /Firefox/.test(ua)
  const isDesktopSafari = !isIOS && !isAndroid && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)

  // OS
  let os = 'unknown'
  if (isIOS) os = 'ios'
  else if (isAndroid) os = 'android'
  else if (isMac) os = 'mac'
  else if (isWindows) os = 'windows'
  else if (isLinux) os = 'linux'

  // Browser
  let browser = 'unknown'
  if (isIOSSafari) browser = 'ios-safari'
  else if (isIOSChrome || isIOSEdge || isIOSFirefox) browser = 'ios-other'
  else if (isAndroidFirefox) browser = 'android-firefox'
  else if (isAndroidChrome) browser = 'android-chrome'
  else if (isAndroidEdge) browser = 'android-edge'
  else if (isAndroid) browser = 'android-other'
  else if (isDesktopChrome) browser = 'chrome'
  else if (isDesktopEdge) browser = 'edge'
  else if (isDesktopFirefox) browser = 'firefox'
  else if (isDesktopSafari) browser = 'safari'

  // Standalone (PWA уже установлено)
  const isStandalone =
    (typeof navigator.standalone === 'boolean' && navigator.standalone) ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)

  return { os, browser, isStandalone }
}

export function usePlatform() {
  const detected = detect()

  const os = computed(() => detected.os)
  const browser = computed(() => detected.browser)
  const isStandalone = computed(() => detected.isStandalone)

  const isIOS = computed(() => detected.os === 'ios')
  const isAndroid = computed(() => detected.os === 'android')
  const isDesktop = computed(() => ['mac', 'windows', 'linux'].includes(detected.os))

  const isIOSSafari = computed(() => detected.browser === 'ios-safari')
  const isIOSOther = computed(() => detected.browser === 'ios-other')

  // Android — детальные флаги браузеров для platform-specific инструкций
  const isAndroidFirefox = computed(() => detected.browser === 'android-firefox')
  const isAndroidChrome = computed(() => detected.browser === 'android-chrome')
  const isAndroidEdge = computed(() => detected.browser === 'android-edge')
  const isAndroidOther = computed(() => detected.browser === 'android-other')

  // Поддерживает beforeinstallprompt (нативный диалог установки)?
  // Только desktop Chrome/Edge и Android Chrome/Edge. iOS и Firefox — нет.
  const canPromptInstall = computed(() => {
    if (detected.isStandalone) return false
    return ['chrome', 'edge', 'android-chrome', 'android-edge'].includes(detected.browser)
  })

  return {
    os,
    browser,
    isStandalone,
    isIOS,
    isAndroid,
    isDesktop,
    isIOSSafari,
    isIOSOther,
    isAndroidFirefox,
    isAndroidChrome,
    isAndroidEdge,
    isAndroidOther,
    canPromptInstall,
  }
}
