import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// ─── Pure-function tests (no Vue, no localStorage) ────────────────
// Импортируем только чистые функции, чтобы не зависеть от singleton state

import { makeRandom, generateOrder, decks, deckIds } from '@/data/decks'
import { parseShareUrl, buildShareUrl, SCHEMA_VERSION } from '@/composables/useDeck'

describe('data/decks.js', () => {
  describe('makeRandom', () => {
    it('детерминирован для одного seed', () => {
      const r1 = makeRandom(12345)
      const r2 = makeRandom(12345)
      const seq1 = Array.from({ length: 10 }, () => r1())
      const seq2 = Array.from({ length: 10 }, () => r2())
      expect(seq1).toEqual(seq2)
    })

    it('разные seed дают разные последовательности (вероятностно)', () => {
      const r1 = makeRandom(1)
      const r2 = makeRandom(2)
      const seq1 = Array.from({ length: 5 }, () => r1())
      const seq2 = Array.from({ length: 5 }, () => r2())
      expect(seq1).not.toEqual(seq2)
    })

    it('возвращает значения в [0, 1)', () => {
      const r = makeRandom(42)
      for (let i = 0; i < 100; i++) {
        const v = r()
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    })
  })

  describe('generateOrder', () => {
    it('возвращает массив той же длины', () => {
      const qs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
      const order = generateOrder(qs, 12345)
      expect(order).toHaveLength(4)
    })

    it('содержит все исходные id без дубликатов', () => {
      const qs = Array.from({ length: 15 }, (_, i) => ({ id: `q${i}` }))
      const order = generateOrder(qs, 999)
      const unique = new Set(order)
      expect(unique.size).toBe(15)
      qs.forEach(q => expect(unique.has(q.id)).toBe(true))
    })

    it('детерминирован для одного seed', () => {
      const qs = Array.from({ length: 15 }, (_, i) => ({ id: `q${i}` }))
      const o1 = generateOrder(qs, 12345)
      const o2 = generateOrder(qs, 12345)
      expect(o1).toEqual(o2)
    })

    it('разные seed обычно дают разные порядки', () => {
      const qs = Array.from({ length: 15 }, (_, i) => ({ id: `q${i}` }))
      const o1 = generateOrder(qs, 1)
      const o2 = generateOrder(qs, 2)
      expect(o1).not.toEqual(o2)
    })

    it('пустой массив вопросов → пустой порядок', () => {
      expect(generateOrder([], 12345)).toEqual([])
    })

    it('один элемент → порядок из одного элемента', () => {
      expect(generateOrder([{ id: 'x' }], 12345)).toEqual(['x'])
    })
  })

  describe('decks', () => {
    it('содержит колоды deep и work', () => {
      expect(deckIds).toContain('deep')
      expect(deckIds).toContain('work')
    })

    it('каждая колода имеет 10 порядков A..J', () => {
      for (const id of deckIds) {
        const deck = decks[id]
        expect(deck.orders).toHaveLength(10)
        const names = deck.orders.map(o => o.name)
        expect(names).toEqual(['A','B','C','D','E','F','G','H','I','J'])
      }
    })

    it('каждый порядок имеет уникальную последовательность', () => {
      for (const id of deckIds) {
        const deck = decks[id]
        const sequences = deck.orders.map(o => o.sequence.join(','))
        const unique = new Set(sequences)
        expect(unique.size).toBe(10)
      }
    })

    it('каждая последовательность содержит все id вопросов колоды', () => {
      for (const id of deckIds) {
        const deck = decks[id]
        const allIds = new Set(deck.questions.map(q => q.id))
        for (const order of deck.orders) {
          const orderIds = new Set(order.sequence)
          expect(orderIds.size).toBe(allIds.size)
          allIds.forEach(id => expect(orderIds.has(id)).toBe(true))
        }
      }
    })

    it('deep имеет 15 вопросов, work — 10', () => {
      expect(decks.deep.questions).toHaveLength(15)
      expect(decks.work.questions).toHaveLength(10)
    })
  })
})

describe('useDeck — SCHEMA_VERSION', () => {
  it('SCHEMA_VERSION = 2 (v2: добавлена история сессий)', () => {
    expect(SCHEMA_VERSION).toBe(2)
  })
})

describe('useDeck — parseShareUrl()', () => {
  it('парсит валидную ссылку', () => {
    const result = parseShareUrl({ deck: 'deep', order: '3', role: 'listener' })
    expect(result).toEqual({ deck: 'deep', order: 3, role: 'listener', turn: 0 })
  })

  it('возвращает null для пустого query', () => {
    expect(parseShareUrl({})).toBeNull()
    expect(parseShareUrl(null)).toBeNull()
    expect(parseShareUrl(undefined)).toBeNull()
  })

  it('возвращает null для неизвестной колоды', () => {
    expect(parseShareUrl({ deck: 'unknown', order: '0', role: 'reader' })).toBeNull()
  })

  it('возвращает null для невалидного orderIndex', () => {
    expect(parseShareUrl({ deck: 'deep', order: 'abc', role: 'reader' })).toBeNull()
    expect(parseShareUrl({ deck: 'deep', order: '-1', role: 'reader' })).toBeNull()
    expect(parseShareUrl({ deck: 'deep', order: '10', role: 'reader' })).toBeNull()
  })

  it('возвращает null для невалидной роли', () => {
    expect(parseShareUrl({ deck: 'deep', order: '0', role: 'admin' })).toBeNull()
    expect(parseShareUrl({ deck: 'deep', order: '0', role: '' })).toBeNull()
  })
})

describe('useDeck — buildShareUrl()', () => {
  it('генерирует корректный URL', () => {
    const url = buildShareUrl('deep', 3, 'listener')
    expect(url).toContain('deck=deep')
    expect(url).toContain('order=3')
    // Роль инвертируется — это ссылка для ПАРТНЁРА
    expect(url).toContain('role=reader')
    expect(url.startsWith('http')).toBe(true)
  })

  it('инвертирует роль: reader → listener', () => {
    const url = buildShareUrl('deep', 0, 'reader')
    expect(url).toContain('role=listener')
  })

  it('инвертирует роль: listener → reader', () => {
    const url = buildShareUrl('deep', 0, 'listener')
    expect(url).toContain('role=reader')
  })

  it('без currentTurn — параметр turn отсутствует', () => {
    const url = buildShareUrl('deep', 0, 'reader')
    expect(url).not.toContain('turn=')
  })

  it('с currentTurn — добавляется параметр turn=N', () => {
    const url = buildShareUrl('deep', 0, 'reader', 5)
    expect(url).toContain('turn=5')
  })

  it('round-trip: buildShareUrl → parseShareUrl (без turn)', () => {
    const url = buildShareUrl('work', 7, 'reader')
    const query = Object.fromEntries(new URL(url).searchParams)
    const parsed = parseShareUrl(query)
    // Роль после парсинга = та, что в URL = инвертированная
    expect(parsed).toEqual({ deck: 'work', order: 7, role: 'listener', turn: 0 })
  })

  it('round-trip: buildShareUrl → parseShareUrl (с turn)', () => {
    const url = buildShareUrl('work', 7, 'reader', 5)
    const query = Object.fromEntries(new URL(url).searchParams)
    const parsed = parseShareUrl(query)
    expect(parsed).toEqual({ deck: 'work', order: 7, role: 'listener', turn: 5 })
  })
})

// ─── Singleton state tests (через useDeck) ──────────────────────
// Внимание: useDeck — singleton, refs создаются один раз на модуль.
// Поэтому тестируем как единое состояние.

describe('useDeck — singleton state', () => {
  let useDeck

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()
    // Переимпортируем модуль чтобы получить свежий singleton
    const mod = await import('@/composables/useDeck?session=' + Date.now())
    useDeck = mod.useDeck
  })

  it('возвращает одинаковые refs при повторном вызове', () => {
    const a = useDeck()
    const b = useDeck()
    // Сравниваем развёрнутые значения refs — должны быть идентичны
    expect(a.deckId).toBe(b.deckId)
    expect(a.role).toBe(b.role)
    expect(a.currentTurn).toBe(b.currentTurn)
  })

  it('startSession устанавливает состояние', () => {
    const d = useDeck()
    d.startSession('deep', 3, 'reader')
    expect(d.deckId.value).toBe('deep')
    expect(d.orderIndex.value).toBe(3)
    expect(d.role.value).toBe('reader')
    expect(d.currentTurn.value).toBe(0)
    expect(d.passedIds.value).toEqual([])
    expect(d.skippedIds.value).toEqual([])
  })

  it('nextQuestion увеличивает turn и добавляет в passedIds', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    const firstQ = d.currentQuestion.value
    d.nextQuestion()
    expect(d.currentTurn.value).toBe(1)
    expect(d.passedIds.value).toContain(firstQ.id)
  })

  it('prevQuestion уменьшает turn (passedIds сохраняется как история)', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    const firstQ = d.currentQuestion.value
    d.nextQuestion()
    d.prevQuestion()
    expect(d.currentTurn.value).toBe(0)
    // passedIds НЕ очищается — это историческая запись
    expect(d.passedIds.value).toContain(firstQ.id)
    // Возврат к первому вопросу
    expect(d.currentQuestion.value.id).toBe(firstQ.id)
  })

  it('prevQuestion на turn=0 ничего не делает', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.prevQuestion()
    expect(d.currentTurn.value).toBe(0)
  })

  it('skipQuestion у читающего увеличивает turn на 2 (пропуск всего раунда) и добавляет в skippedIds', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    const firstQ = d.currentQuestion.value
    d.skipQuestion()
    // +2: пропускается и ход читающего, и ход отвечающего (партнёр не услышал вопрос)
    expect(d.currentTurn.value).toBe(2)
    expect(d.skippedIds.value).toContain(firstQ.id)
  })

  it('amIReading: reader на чётных ходах', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    expect(d.amIReading.value).toBe(true)  // turn 0
    d.nextQuestion()
    expect(d.amIReading.value).toBe(false) // turn 1
    d.nextQuestion()
    expect(d.amIReading.value).toBe(true)   // turn 2
  })

  it('amIReading: listener на нечётных ходах', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'listener')
    expect(d.amIReading.value).toBe(false) // turn 0
    d.nextQuestion()
    expect(d.amIReading.value).toBe(true)  // turn 1
  })

  it('isSkipped: true после skip + prev (×2, т.к. skip = +2)', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.skipQuestion()    // turn 0 → 2
    d.prevQuestion()    // turn 2 → 1
    d.prevQuestion()    // turn 1 → 0
    expect(d.isSkipped.value).toBe(true)
  })

  it('isAnswered: true после next + prev', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.nextQuestion()
    d.prevQuestion()
    expect(d.isAnswered.value).toBe(true)
  })

  it('isAnswered имеет приоритет над isSkipped', () => {
    // Пропустили, потом вернулись и ответили — isAnswered=true, isSkipped=false
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.skipQuestion()    // skip turn 0 → turn 2
    d.prevQuestion()    // turn 1
    d.prevQuestion()    // turn 0
    expect(d.isSkipped.value).toBe(true)
    expect(d.isAnswered.value).toBe(false)
    d.nextQuestion()    // ответить на turn 0 → turn 1
    d.prevQuestion()    // назад → turn 0
    expect(d.isAnswered.value).toBe(true)
    expect(d.isSkipped.value).toBe(false) // пропущенный теперь "перекрыт" ответом
  })

  it('activeSkippedCount: 0 в начале', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    expect(d.activeSkippedCount.value).toBe(0)
  })

  it('activeSkippedCount: 1 после skip', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.skipQuestion()
    expect(d.activeSkippedCount.value).toBe(1)
  })

  it('activeSkippedCount: 0 после skip + answer (через prev ×2)', () => {
    // Пропустили (turn 0 → 2), вернулись (×2: 2 → 1 → 0), ответили — пропуск "перекрыт", счётчик 0
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.skipQuestion()
    d.prevQuestion()
    d.prevQuestion()
    d.nextQuestion()
    expect(d.activeSkippedCount.value).toBe(0)
  })

  it('activeSkippedCount: счётчик не зависит от отвеченных', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.nextQuestion()    // answered 1
    d.nextQuestion()    // answered 2
    expect(d.activeSkippedCount.value).toBe(0)
  })

  it('startSession с startTurn: продолжает с указанного вопроса', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader', 5)
    expect(d.currentTurn.value).toBe(5)
  })

  it('startSession с startTurn > длины последовательности: падает на 0', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader', 999)
    expect(d.currentTurn.value).toBe(0)
  })

  it('startSession с отрицательным startTurn: падает на 0', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader', -5)
    expect(d.currentTurn.value).toBe(0)
  })

  it('isFinished: true после прохождения всех вопросов', () => {
    const d = useDeck()
    d.startSession('work', 0, 'reader')
    // work имеет 10 вопросов
    for (let i = 0; i < 10; i++) {
      d.nextQuestion()
    }
    expect(d.isFinished.value).toBe(true)
    expect(d.currentQuestion.value).toBeNull()
  })

  it('isFinished: true при skip на последнем ходу (skip +2 может перевести за пределы)', () => {
    // work имеет 10 вопросов, индексы 0..9. Если на turn=8 (reader) сделать skip +2 → turn=10 → isFinished
    const d = useDeck()
    d.startSession('work', 0, 'reader')
    for (let i = 0; i < 8; i++) d.nextQuestion()  // turn = 8 (reader, чётный)
    d.skipQuestion()                              // turn = 10 → isFinished
    expect(d.isFinished.value).toBe(true)
  })

  it('hasSavedSession: false если isFinished (сессия фактически завершена)', () => {
    const d = useDeck()
    d.startSession('work', 0, 'reader')
    for (let i = 0; i < 10; i++) d.nextQuestion()
    expect(d.isFinished.value).toBe(true)
    expect(d.hasSavedSession.value).toBe(false)  // завершённая — не "незавершённая"
  })

  it('resetProgress очищает активное состояние и помечает сессию завершённой', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.nextQuestion()
    // После startSession и nextQuestion в localStorage должна быть сессия
    expect(localStorage.getItem('coffee_sessions')).not.toBeNull()
    expect(localStorage.getItem('coffee_active_session_id')).not.toBeNull()
    d.resetProgress()
    expect(d.deckId.value).toBeNull()
    expect(d.orderIndex.value).toBeNull()
    expect(d.role.value).toBeNull()
    expect(d.currentTurn.value).toBe(0)
    // Активная сессия сброшена, но запись осталась в истории (помечена completed)
    expect(localStorage.getItem('coffee_active_session_id')).toBeNull()
    const sessions = JSON.parse(localStorage.getItem('coffee_sessions') || '[]')
    expect(sessions.length).toBe(1)
    expect(sessions[0].completed).toBe(true)
  })

  it('hasSavedSession: false на пустом localStorage', () => {
    const d = useDeck()
    expect(d.hasSavedSession.value).toBe(false)
  })

  it('hasSavedSession: true после startSession', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    expect(d.hasSavedSession.value).toBe(true)
  })

  it('hasSavedSession: false после resetProgress', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.resetProgress()
    expect(d.hasSavedSession.value).toBe(false)
  })

  it('hasSavedSession: false на повреждённом localStorage (coffee_sessions)', () => {
    localStorage.setItem('coffee_sessions', '{not valid json')
    const d = useDeck()
    expect(d.hasSavedSession.value).toBe(false)
  })

  it('восстанавливает состояние из localStorage после перезагрузки модуля', async () => {
    const d1 = useDeck()
    d1.startSession('deep', 5, 'listener')
    d1.nextQuestion()
    d1.nextQuestion()
    const savedTurn = d1.currentTurn.value

    // Эмулируем перезагрузку: переимпорт модуля
    vi.resetModules()
    const mod2 = await import('@/composables/useDeck?session=' + (Date.now() + 1))
    const d2 = mod2.useDeck()
    expect(d2.deckId.value).toBe('deep')
    expect(d2.orderIndex.value).toBe(5)
    expect(d2.role.value).toBe('listener')
    expect(d2.currentTurn.value).toBe(savedTurn)
  })
})

describe('useDeck — sessions history', () => {
  let useDeck

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()
    const mod = await import('@/composables/useDeck?session=' + Date.now() + Math.random())
    useDeck = mod.useDeck
  })

  it('startSession создаёт запись в истории сессий', () => {
    const d = useDeck()
    expect(d.sessions.value).toHaveLength(0)
    d.startSession('deep', 0, 'reader')
    expect(d.sessions.value).toHaveLength(1)
    expect(d.sessions.value[0].deckId).toBe('deep')
    expect(d.sessions.value[0].orderIndex).toBe(0)
    expect(d.sessions.value[0].role).toBe('reader')
    expect(d.sessions.value[0].completed).toBe(false)
  })

  it('startSession устанавливает activeSessionId', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    expect(d.activeSessionId.value).toBeTruthy()
    expect(d.activeSessionId.value).toBe(d.sessions.value[0].id)
  })

  it('несколько startSession создают несколько записей', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.startSession('work', 1, 'listener')
    expect(d.sessions.value).toHaveLength(2)
    // Активная — последняя созданная
    expect(d.activeSessionId.value).toBe(d.sessions.value[0].id)
    expect(d.deckId.value).toBe('work')
  })

  it('nextQuestion обновляет запись в истории', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.nextQuestion()
    const s = d.sessions.value.find(x => x.id === d.activeSessionId.value)
    expect(s.currentTurn).toBe(1)
    expect(s.passedIds).toHaveLength(1)
  })

  it('loadSession переключается на существующую сессию', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.nextQuestion()
    const firstSessionId = d.activeSessionId.value

    d.startSession('work', 1, 'listener')  // теперь активна новая
    expect(d.activeSessionId.value).not.toBe(firstSessionId)
    expect(d.deckId.value).toBe('work')

    // Переключаемся обратно
    d.loadSession(firstSessionId)
    expect(d.activeSessionId.value).toBe(firstSessionId)
    expect(d.deckId.value).toBe('deep')
    expect(d.currentTurn.value).toBe(1)  // сохранили прогресс
  })

  it('loadSession с несуществующим id возвращает false', () => {
    const d = useDeck()
    expect(d.loadSession('nonexistent')).toBe(false)
  })

  it('deleteSession удаляет запись из истории', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    const id = d.activeSessionId.value
    d.deleteSession(id)
    expect(d.sessions.value).toHaveLength(0)
    // activeSessionId тоже сброшен
    expect(d.activeSessionId.value).toBeNull()
  })

  it('deleteSession активной сессии сбрасывает текущее состояние', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.nextQuestion()
    const id = d.activeSessionId.value
    d.deleteSession(id)
    expect(d.deckId.value).toBeNull()
    expect(d.orderIndex.value).toBeNull()
    expect(d.role.value).toBeNull()
    expect(d.currentTurn.value).toBe(0)
  })

  it('deleteSession чужой сессии не сбрасывает активную', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')   // первая
    d.startSession('work', 1, 'listener') // вторая (активная)
    const firstId = d.sessions.value[1].id  // первая сессия (не активная)
    d.deleteSession(firstId)
    expect(d.sessions.value).toHaveLength(1)
    expect(d.activeSessionId.value).not.toBeNull()
    expect(d.deckId.value).toBe('work')  // активная не сброшена
  })

  it('завершённая сессия помечается completed', () => {
    const d = useDeck()
    d.startSession('work', 0, 'reader')
    for (let i = 0; i < 10; i++) d.nextQuestion()
    const s = d.sessions.value.find(x => x.id === d.activeSessionId.value)
    expect(s.completed).toBe(true)
  })

  it('resetProgress помечает активную сессию завершённой и сбрасывает activeId', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.nextQuestion()
    const id = d.activeSessionId.value
    d.resetProgress()
    expect(d.activeSessionId.value).toBeNull()
    const s = d.sessions.value.find(x => x.id === id)
    expect(s.completed).toBe(true)
  })

  it('после resetProgress can startNew session — старая остаётся в истории', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.nextQuestion()
    d.resetProgress()
    expect(d.sessions.value).toHaveLength(1)
    d.startSession('work', 2, 'listener')
    expect(d.sessions.value).toHaveLength(2)
    // Активна новая
    expect(d.deckId.value).toBe('work')
    expect(d.activeSessionId.value).toBe(d.sessions.value[0].id)
  })

  it('migrateV1ToV2: старый game_state конвертируется в сессию', async () => {
    // Пишем старый формат
    localStorage.setItem('game_state', JSON.stringify({
      version: 1,
      deckId: 'deep',
      orderIndex: 3,
      currentTurn: 5,
      role: 'reader',
      passedIds: ['q1'],
      skippedIds: ['q2'],
      updatedAt: '2024-01-01T00:00:00.000Z'
    }))
    vi.resetModules()
    const mod = await import('@/composables/useDeck?session=' + Date.now() + Math.random())
    const d = mod.useDeck()
    // game_state удалён, создана сессия
    expect(localStorage.getItem('game_state')).toBeNull()
    expect(d.sessions.value).toHaveLength(1)
    expect(d.sessions.value[0].deckId).toBe('deep')
    expect(d.sessions.value[0].orderIndex).toBe(3)
    expect(d.sessions.value[0].currentTurn).toBe(5)
    expect(d.sessions.value[0].role).toBe('reader')
    expect(d.sessions.value[0].passedIds).toEqual(['q1'])
    expect(d.sessions.value[0].skippedIds).toEqual(['q2'])
    expect(d.activeSessionId.value).toBe(d.sessions.value[0].id)
  })

  it('migrateV1ToV2: завершённая v1 сессия (currentTurn >= length) помечается completed', async () => {
    localStorage.setItem('game_state', JSON.stringify({
      version: 1,
      deckId: 'work',  // 10 вопросов
      orderIndex: 0,
      currentTurn: 10,  // finished
      role: 'reader',
      passedIds: [],
      skippedIds: [],
      updatedAt: '2024-01-01T00:00:00.000Z'
    }))
    vi.resetModules()
    const mod = await import('@/composables/useDeck?session=' + Date.now() + Math.random())
    const d = mod.useDeck()
    expect(d.sessions.value).toHaveLength(1)
    expect(d.sessions.value[0].completed).toBe(true)
    expect(d.sessions.value[0].currentTurn).toBe(10)
  })

  it('loadSession не портит другие сессии при переключении', () => {
    const d = useDeck()
    d.startSession('deep', 0, 'reader')
    d.nextQuestion()
    d.nextQuestion()  // turn = 2
    const firstId = d.activeSessionId.value
    const firstPassedIds = [...d.passedIds.value]

    d.startSession('work', 1, 'listener')  // turn = 0, different deck
    const secondId = d.activeSessionId.value

    // Переключаемся на первую
    d.loadSession(firstId)

    expect(d.activeSessionId.value).toBe(firstId)
    expect(d.deckId.value).toBe('deep')
    expect(d.currentTurn.value).toBe(2)
    expect(d.passedIds.value).toEqual(firstPassedIds)

    // Вторая сессия не испорчена
    const secondSession = d.sessions.value.find(s => s.id === secondId)
    expect(secondSession.deckId).toBe('work')
    expect(secondSession.currentTurn).toBe(0)
    expect(secondSession.passedIds).toEqual([])
    expect(secondSession.completed).toBe(false)
  })

  it('loadSession корректно сохраняет completed=true для завершённой сессии', () => {
    const d = useDeck()
    d.startSession('work', 0, 'reader')  // 10 вопросов
    for (let i = 0; i < 10; i++) d.nextQuestion()
    const firstId = d.activeSessionId.value
    expect(d.sessions.value.find(s => s.id === firstId).completed).toBe(true)

    d.startSession('deep', 0, 'listener')  // другая сессия

    // Переключаемся на завершённую
    d.loadSession(firstId)

    const firstSession = d.sessions.value.find(s => s.id === firstId)
    expect(firstSession.completed).toBe(true)
    expect(firstSession.currentTurn).toBe(10)
  })

  it('hasSavedSession: false если currentTurn >= sequence.length (defensive)', () => {
    const d = useDeck()
    d.startSession('work', 0, 'reader')  // 10 вопросов
    for (let i = 0; i < 10; i++) d.nextQuestion()
    // currentTurn = 10, sequence.length = 10 → isFinished, hasSavedSession false
    expect(d.hasSavedSession.value).toBe(false)
  })
})

describe('useDeck — importState validation', () => {
  let useDeck

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()
    const mod = await import('@/composables/useDeck?session=' + Date.now() + Math.random())
    useDeck = mod.useDeck
  })

  it('импортирует валидный state', async () => {
    const d = useDeck()
    const file = new File([JSON.stringify({
      version: 1,
      deckId: 'deep',
      orderIndex: 2,
      currentTurn: 5,
      role: 'reader',
      passedIds: ['q1'],
      skippedIds: ['q2']
    })], 'state.json', { type: 'application/json' })

    await d.importState(file)
    expect(d.deckId.value).toBe('deep')
    expect(d.orderIndex.value).toBe(2)
    expect(d.currentTurn.value).toBe(5)
    expect(d.role.value).toBe('reader')
    expect(d.passedIds.value).toEqual(['q1'])
    expect(d.skippedIds.value).toEqual(['q2'])
  })

  it('отклоняет неизвестную колоду', async () => {
    const d = useDeck()
    const file = new File([JSON.stringify({
      deckId: 'unknown',
      orderIndex: 0,
      role: 'reader'
    })], 'state.json')

    await expect(d.importState(file)).rejects.toThrow('Неизвестная колода')
  })

  it('отклоняет невалидный orderIndex', async () => {
    const d = useDeck()
    const file = new File([JSON.stringify({
      deckId: 'deep',
      orderIndex: 99,
      role: 'reader'
    })], 'state.json')

    await expect(d.importState(file)).rejects.toThrow('orderIndex')
  })

  it('отклоняет невалидную роль', async () => {
    const d = useDeck()
    const file = new File([JSON.stringify({
      deckId: 'deep',
      orderIndex: 0,
      role: 'admin'
    })], 'state.json')

    await expect(d.importState(file)).rejects.toThrow('роль')
  })

  it('отклоняет битый JSON', async () => {
    const d = useDeck()
    const file = new File(['{not valid json'], 'state.json')

    await expect(d.importState(file)).rejects.toThrow()
  })
})
