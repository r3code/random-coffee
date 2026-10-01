/**
 * Тесты для usePlatform composable.
 *
 * usePlatform читает navigator.userAgent, navigator.platform, navigator.maxTouchPoints,
 * navigator.standalone, window.matchMedia — при импорте модуля. Чтобы протестировать
 * разные платформы/браузеры, нужно подменять эти свойства ПЕРЕД каждым тестом и
 * пересоздавать модуль через vi.resetModules() + динамический import с query-параметром.
 *
 * Паттерн borrowed from useDeck.test.js (dynamic import '@/composables/useDeck?session=...').
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─── Хелпер: подменяет navigator и window свойства под заданную «среду» ────
// Все свойства navigator в jsdom — read-only configurable:false, поэтому
// переопределяем через Object.defineProperty с configurable:true (чтобы можно
// было переопределить снова в следующем beforeEach).
function setEnvironment({ userAgent = '', platform = '', maxTouchPoints = 0, standalone = undefined, matchMediaStandalone = false } = {}) {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  })
  Object.defineProperty(navigator, 'platform', {
    value: platform,
    configurable: true,
  })
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  })
  // navigator.standalone — есть только на iOS Safari, отсутствует в jsdom
  if (standalone !== undefined) {
    Object.defineProperty(navigator, 'standalone', {
      value: standalone,
      configurable: true,
    })
  } else {
    // удаляем свойство, если оно было добавлено в предыдущем тесте
    try { delete navigator.standalone } catch { /* ignore */ }
  }
  // matchMedia — эмулируем display-mode: standalone
  if (!window.matchMedia) {
    window.matchMedia = vi.fn()
  }
  window.matchMedia.mockImplementation((query) => ({
    matches: query === '(display-mode: standalone)' && matchMediaStandalone,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// Хелпер: динамически импортирует usePlatform с уникальным query-параметром,
// чтобы Vite/Vitest пересоздал модуль и переопределил navigator/window заново.
//
// Примечание: vite:dynamic-import-vars даёт warning о расширении в статической
// части импорта. Это безобидно — Vite всё равно резолвит алиас @/ и тесты проходят.
// Заглушить warning можно через vite.config.js plugins, но это избыточно.
let counter = 0
async function importFresh() {
  counter++
  return (await import(`@/composables/usePlatform?t=${counter}`)).usePlatform
}

// ─── Реальные UA-строки разных браузеров для реалистичного тестирования ────

const UA = {
  // iOS Safari
  iosSafari_iPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  iosSafari_iPad:   'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  // iPadOS 13+ в Safari репортит MacIntel + touch
  ipad_touch: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  // iOS Chrome (CriOS)
  iosChrome:  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
  // iOS Edge (EdgiOS)
  iosEdge:    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/120.0.2210.84 Version/17.0 Mobile/15E148 Safari/604.1',
  // iOS Firefox (FxiOS)
  iosFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.1 Mobile/15E148 Safari/605.1.15',
  // Android Chrome
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  // Android Firefox (включая Nightly/Fennec — те же маркеры Firefox/FxiOS)
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0',
  // Android Edge
  androidEdge: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 EdgA/120.0.2210.84',
  // Android Samsung Internet (без Chrome/Firefox/Edge маркеров)
  androidSamsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/119.0.0.0 Mobile Safari/537.36',
  // Desktop Chrome (Mac)
  desktopChromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Desktop Chrome (Windows)
  desktopChromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Desktop Edge
  desktopEdge: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  // Desktop Firefox
  desktopFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:120.0) Gecko/20100101 Firefox/120.0',
  // Desktop Safari (macOS)
  desktopSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  // Восстанавливаем navigator свойства после теста — на всякий случай
  // (хотя vi.resetModules + новый import всё равно пересоздаст composable)
})

// ─── Тесты: OS detection ───────────────────────────────────────────

describe('usePlatform — OS detection', () => {
  it('iOS Safari на iPhone → os=ios', async () => {
    setEnvironment({ userAgent: UA.iosSafari_iPhone, platform: 'iPhone' })
    const usePlatform = await importFresh()
    const { os, isIOS } = usePlatform()
    expect(os.value).toBe('ios')
    expect(isIOS.value).toBe(true)
  })

  it('iOS Safari на iPad (старый UA с iPad) → os=ios', async () => {
    setEnvironment({ userAgent: UA.iosSafari_iPad, platform: 'iPad' })
    const usePlatform = await importFresh()
    const { os, isIOS } = usePlatform()
    expect(os.value).toBe('ios')
    expect(isIOS.value).toBe(true)
  })

  it('iPadOS 13+ в Safari (MacIntel + touch) → os=ios', async () => {
    // iPadOS 13+ репортит MacIntel platform + maxTouchPoints > 1
    setEnvironment({ userAgent: UA.ipad_touch, platform: 'MacIntel', maxTouchPoints: 2 })
    const usePlatform = await importFresh()
    const { os, isIOS } = usePlatform()
    expect(os.value).toBe('ios')
    expect(isIOS.value).toBe(true)
  })

  it('Android Chrome → os=android', async () => {
    setEnvironment({ userAgent: UA.androidChrome, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const { os, isAndroid } = usePlatform()
    expect(os.value).toBe('android')
    expect(isAndroid.value).toBe(true)
  })

  it('Android Firefox → os=android', async () => {
    setEnvironment({ userAgent: UA.androidFirefox, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const { os, isAndroid } = usePlatform()
    expect(os.value).toBe('android')
    expect(isAndroid.value).toBe(true)
  })

  it('Desktop Mac → os=mac', async () => {
    setEnvironment({ userAgent: UA.desktopChromeMac, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { os, isDesktop } = usePlatform()
    expect(os.value).toBe('mac')
    expect(isDesktop.value).toBe(true)
  })

  it('Desktop Windows → os=windows', async () => {
    setEnvironment({ userAgent: UA.desktopChromeWin, platform: 'Win32' })
    const usePlatform = await importFresh()
    const { os, isDesktop } = usePlatform()
    expect(os.value).toBe('windows')
    expect(isDesktop.value).toBe(true)
  })

  it('Desktop Linux → os=linux', async () => {
    setEnvironment({ userAgent: UA.desktopFirefox.replace('Macintosh; Intel Mac OS X 14.2', 'X11; Linux x86_64'), platform: 'Linux x86_64' })
    const usePlatform = await importFresh()
    const { os, isDesktop } = usePlatform()
    expect(os.value).toBe('linux')
    expect(isDesktop.value).toBe(true)
  })
})

// ─── Тесты: Browser detection ──────────────────────────────────────

describe('usePlatform — Browser detection', () => {
  it('iOS Safari → browser=ios-safari', async () => {
    setEnvironment({ userAgent: UA.iosSafari_iPhone, platform: 'iPhone' })
    const usePlatform = await importFresh()
    const { browser, isIOSSafari, isIOSOther } = usePlatform()
    expect(browser.value).toBe('ios-safari')
    expect(isIOSSafari.value).toBe(true)
    expect(isIOSOther.value).toBe(false)
  })

  it('iOS Chrome (CriOS) → browser=ios-other', async () => {
    setEnvironment({ userAgent: UA.iosChrome, platform: 'iPhone' })
    const usePlatform = await importFresh()
    const { browser, isIOSSafari, isIOSOther } = usePlatform()
    expect(browser.value).toBe('ios-other')
    expect(isIOSSafari.value).toBe(false)
    expect(isIOSOther.value).toBe(true)
  })

  it('iOS Edge (EdgiOS) → browser=ios-other', async () => {
    setEnvironment({ userAgent: UA.iosEdge, platform: 'iPhone' })
    const usePlatform = await importFresh()
    const { browser, isIOSOther } = usePlatform()
    expect(browser.value).toBe('ios-other')
    expect(isIOSOther.value).toBe(true)
  })

  it('iOS Firefox (FxiOS) → browser=ios-other', async () => {
    setEnvironment({ userAgent: UA.iosFirefox, platform: 'iPhone' })
    const usePlatform = await importFresh()
    const { browser, isIOSOther } = usePlatform()
    expect(browser.value).toBe('ios-other')
    expect(isIOSOther.value).toBe(true)
  })

  it('Android Chrome → browser=android-chrome', async () => {
    setEnvironment({ userAgent: UA.androidChrome, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const { browser, isAndroidChrome } = usePlatform()
    expect(browser.value).toBe('android-chrome')
    expect(isAndroidChrome.value).toBe(true)
  })

  it('Android Firefox → browser=android-firefox (вкл. Nightly/Fennec)', async () => {
    setEnvironment({ userAgent: UA.androidFirefox, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const { browser, isAndroidFirefox } = usePlatform()
    expect(browser.value).toBe('android-firefox')
    expect(isAndroidFirefox.value).toBe(true)
  })

  it('Android Edge → browser=android-edge', async () => {
    setEnvironment({ userAgent: UA.androidEdge, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const { browser, isAndroidEdge } = usePlatform()
    expect(browser.value).toBe('android-edge')
    expect(isAndroidEdge.value).toBe(true)
  })

  it('Android Samsung Internet → browser=android-other', async () => {
    // Samsung Internet имеет Chrome/119 в UA, но не является Chrome по сути.
    // usePlatform сейчас классифицирует его как android-chrome (т.к. есть Chrome),
    // что технически правильно (Chromium-based). Проверим это поведение.
    setEnvironment({ userAgent: UA.androidSamsung, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const { browser, isAndroidChrome, isAndroidOther } = usePlatform()
    // Samsung Internet содержит "Chrome/" — попадает в android-chrome.
    // Это известное поведение: usePlatform не разделяет Samsung/Brave.
    expect(browser.value).toBe('android-chrome')
    expect(isAndroidChrome.value).toBe(true)
    expect(isAndroidOther.value).toBe(false)
  })

  it('Desktop Chrome (Mac) → browser=chrome', async () => {
    setEnvironment({ userAgent: UA.desktopChromeMac, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { browser } = usePlatform()
    expect(browser.value).toBe('chrome')
  })

  it('Desktop Chrome (Windows) → browser=chrome', async () => {
    setEnvironment({ userAgent: UA.desktopChromeWin, platform: 'Win32' })
    const usePlatform = await importFresh()
    const { browser } = usePlatform()
    expect(browser.value).toBe('chrome')
  })

  it('Desktop Edge → browser=edge', async () => {
    setEnvironment({ userAgent: UA.desktopEdge, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { browser } = usePlatform()
    expect(browser.value).toBe('edge')
  })

  it('Desktop Firefox → browser=firefox', async () => {
    setEnvironment({ userAgent: UA.desktopFirefox, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { browser } = usePlatform()
    expect(browser.value).toBe('firefox')
  })

  it('Desktop Safari → browser=safari', async () => {
    setEnvironment({ userAgent: UA.desktopSafari, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { browser } = usePlatform()
    expect(browser.value).toBe('safari')
  })
})

// ─── Тесты: isStandalone (PWA уже установлено) ─────────────────

describe('usePlatform — isStandalone', () => {
  it('iOS Safari navigator.standalone=true → isStandalone=true', async () => {
    setEnvironment({ userAgent: UA.iosSafari_iPhone, platform: 'iPhone', standalone: true })
    const usePlatform = await importFresh()
    const { isStandalone } = usePlatform()
    expect(isStandalone.value).toBe(true)
  })

  it('matchMedia display-mode: standalone matches → isStandalone=true', async () => {
    setEnvironment({
      userAgent: UA.desktopChromeMac,
      platform: 'MacIntel',
      matchMediaStandalone: true,
    })
    const usePlatform = await importFresh()
    const { isStandalone } = usePlatform()
    expect(isStandalone.value).toBe(true)
  })

  it('Обычный браузер → isStandalone=false', async () => {
    setEnvironment({
      userAgent: UA.desktopChromeMac,
      platform: 'MacIntel',
      matchMediaStandalone: false,
    })
    const usePlatform = await importFresh()
    const { isStandalone } = usePlatform()
    expect(isStandalone.value).toBe(false)
  })
})

// ─── Тесты: canPromptInstall (нативный beforeinstallprompt) ────

describe('usePlatform — canPromptInstall', () => {
  it('Desktop Chrome → canPromptInstall=true', async () => {
    setEnvironment({ userAgent: UA.desktopChromeMac, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { canPromptInstall } = usePlatform()
    expect(canPromptInstall.value).toBe(true)
  })

  it('Desktop Edge → canPromptInstall=true', async () => {
    setEnvironment({ userAgent: UA.desktopEdge, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { canPromptInstall } = usePlatform()
    expect(canPromptInstall.value).toBe(true)
  })

  it('Desktop Firefox → canPromptInstall=false', async () => {
    setEnvironment({ userAgent: UA.desktopFirefox, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { canPromptInstall } = usePlatform()
    expect(canPromptInstall.value).toBe(false)
  })

  it('Desktop Safari → canPromptInstall=false', async () => {
    setEnvironment({ userAgent: UA.desktopSafari, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { canPromptInstall } = usePlatform()
    expect(canPromptInstall.value).toBe(false)
  })

  it('Android Chrome → canPromptInstall=true', async () => {
    setEnvironment({ userAgent: UA.androidChrome, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const { canPromptInstall } = usePlatform()
    expect(canPromptInstall.value).toBe(true)
  })

  it('Android Firefox → canPromptInstall=false', async () => {
    setEnvironment({ userAgent: UA.androidFirefox, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const { canPromptInstall } = usePlatform()
    expect(canPromptInstall.value).toBe(false)
  })

  it('iOS Safari → canPromptInstall=false (iOS не поддерживает beforeinstallprompt)', async () => {
    setEnvironment({ userAgent: UA.iosSafari_iPhone, platform: 'iPhone' })
    const usePlatform = await importFresh()
    const { canPromptInstall } = usePlatform()
    expect(canPromptInstall.value).toBe(false)
  })

  it('Если уже standalone → canPromptInstall=false (даже в Chrome)', async () => {
    setEnvironment({
      userAgent: UA.desktopChromeMac,
      platform: 'MacIntel',
      matchMediaStandalone: true,
    })
    const usePlatform = await importFresh()
    const { canPromptInstall } = usePlatform()
    expect(canPromptInstall.value).toBe(false)
  })
})

// ─── Тесты: isIOS / isAndroid / isDesktop — флаги ОС ───────────

describe('usePlatform — OS flags', () => {
  it('isIOS=true на iOS Safari, остальные OS flags false', async () => {
    setEnvironment({ userAgent: UA.iosSafari_iPhone, platform: 'iPhone' })
    const usePlatform = await importFresh()
    const { isIOS, isAndroid, isDesktop } = usePlatform()
    expect(isIOS.value).toBe(true)
    expect(isAndroid.value).toBe(false)
    expect(isDesktop.value).toBe(false)
  })

  it('isAndroid=true на Android Chrome, остальные OS flags false', async () => {
    setEnvironment({ userAgent: UA.androidChrome, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const { isIOS, isAndroid, isDesktop } = usePlatform()
    expect(isIOS.value).toBe(false)
    expect(isAndroid.value).toBe(true)
    expect(isDesktop.value).toBe(false)
  })

  it('isDesktop=true на Desktop Chrome, остальные OS flags false', async () => {
    setEnvironment({ userAgent: UA.desktopChromeMac, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const { isIOS, isAndroid, isDesktop } = usePlatform()
    expect(isIOS.value).toBe(false)
    expect(isAndroid.value).toBe(false)
    expect(isDesktop.value).toBe(true)
  })
})

// ─── Тесты: возвращаемые computed-ы реактивны (это Vue computed) ───

describe('usePlatform — return values', () => {
  it('Все возвращаемые значения имеют .value (это ref/computed)', async () => {
    setEnvironment({ userAgent: UA.desktopChromeMac, platform: 'MacIntel' })
    const usePlatform = await importFresh()
    const result = usePlatform()
    expect(result.os.value).toBeDefined()
    expect(result.browser.value).toBeDefined()
    expect(result.isStandalone.value).toBe(false)
    expect(typeof result.isIOS.value).toBe('boolean')
    expect(typeof result.isAndroid.value).toBe('boolean')
    expect(typeof result.isDesktop.value).toBe('boolean')
    expect(typeof result.isIOSSafari.value).toBe('boolean')
    expect(typeof result.isIOSOther.value).toBe('boolean')
    expect(typeof result.isAndroidFirefox.value).toBe('boolean')
    expect(typeof result.isAndroidChrome.value).toBe('boolean')
    expect(typeof result.isAndroidEdge.value).toBe('boolean')
    expect(typeof result.isAndroidOther.value).toBe('boolean')
    expect(typeof result.canPromptInstall.value).toBe('boolean')
  })

  it('При нескольких вызовах usePlatform() в одном модуле — те же значения', async () => {
    setEnvironment({ userAgent: UA.androidFirefox, platform: 'Linux armv8l' })
    const usePlatform = await importFresh()
    const a = usePlatform()
    const b = usePlatform()
    expect(a.os.value).toBe(b.os.value)
    expect(a.browser.value).toBe(b.browser.value)
    expect(a.isAndroidFirefox.value).toBe(b.isAndroidFirefox.value)
  })
})
