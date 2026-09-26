/**
 * Колоды вопросов и предвычисленные порядки (A..J).
 * Порядок детерминирован seed — два участника, выбравшие одну букву,
 * получат одинаковую последовательность.
 *
 * v5.3:  категории вопросов внутри колоды (`categories` + `categoryId`).
 * v5.11: deckCategory — категория КОЛОДЫ (одна на колоду, slug из белого списка).
 *        7 категорий: couples, first-date, friendship, family, work, self, party.
 *        Используется и для встроенных, и для импортированных колод.
 * v5.12: встроенными остаются только 2 колоды (deep, work). Остальные
 *        публикуются в репозитории random-coffee-decks и подгружаются
 *        через каталог (секция «Каталог» в UI выбора колоды).
 */

// Линейный конгруэнтный генератор — детерминирован на всех платформах
export function makeRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function generateOrder(questions, seed) {
  const ids = questions.map(q => q.id)
  const random = makeRandom(seed)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

// v5.11: Категории КОЛОД — slug, name, color. Slug — для валидации в формате колоды.
// Используется в карточках колод (бейдж), в шапке GameView, в фильтре каталога.
// ВАЖНО: это НЕ категории вопросов внутри колоды (те — отдельное поле `categories`).
// v5.12: список категорий остаётся здесь же — он нужен для валидации импортируемых
// колод из каталога. Сами колоды для категорий `couples`, `first-date`,
// `friendship`, `family` живут в репо random-coffee-decks.
export const deckCategories = {
  'couples':     { name: 'Для пар',        color: '#ec4899' },
  'first-date':  { name: 'Знакомство',     color: '#f59e0b' },
  'friendship':  { name: 'Дружба',         color: '#10b981' },
  'family':      { name: 'Семья',          color: '#8b5cf6' },
  'work':        { name: 'Работа',        color: '#3b82f6' },
  'self':        { name: 'Самопознание',   color: '#06b6d4' },
  'party':       { name: 'Группа',         color: '#f43f5e' }
}

// v5.11: экспортируем массив slug'ов для валидации (используется в useDeck.validateDeckFormat).
export const deckCategorySlugs = Object.keys(deckCategories)

// v5.3: Категории для deep (вопросы ВНУТРИ колоды)
const deepCategories = {
  relationships: { name: 'Отношения', color: '#ec4899' },
  self:          { name: 'Самопознание', color: '#3b82f6' },
  values:        { name: 'Ценности', color: '#10b981' },
  memory:        { name: 'Память и будущее', color: '#f59e0b' },
  fears:         { name: 'Чего боимся', color: '#8b5cf6' }
}

// v5.3: Категории для work
const workCategories = {
  career:      { name: 'Карьера', color: '#3b82f6' },
  drive:       { name: 'Драйв', color: '#10b981' },
  burnout:     { name: 'Выгорание', color: '#ef4444' },
  skills:      { name: 'Навыки', color: '#f59e0b' },
  priorities:  { name: 'Приоритеты', color: '#8b5cf6' }
}

const deepQuestions = [
  { id: 'q1',  text: 'Какое событие в жизни сильно изменило твои взгляды?', categoryId: 'self' },
  { id: 'q2',  text: 'Что ты считаешь своим главным достижением, о котором мало кто знает?', categoryId: 'self' },
  { id: 'q3',  text: 'Если бы ты мог узнать абсолютную истину об одном вопросе вселенной, что бы это было?', categoryId: 'values' },
  { id: 'q4',  text: 'Какой совет ты бы дал себе 10 лет назад?', categoryId: 'memory' },
  { id: 'q5',  text: 'Что для тебя значит успех?', categoryId: 'values' },
  { id: 'q6',  text: 'Какой самый важный урок ты извлек из неудачи?', categoryId: 'fears' },
  { id: 'q7',  text: 'Что тебя больше всего вдохновляет в людях?', categoryId: 'relationships' },
  { id: 'q8',  text: 'Если бы ты мог прожить один день в жизни другого человека, кто бы это был?', categoryId: 'relationships' },
  { id: 'q9',  text: 'Какая твоя мечта кажется тебе самой нереальной?', categoryId: 'memory' },
  { id: 'q10', text: 'Что ты хочешь, чтобы люди помнили о тебе?', categoryId: 'values' },
  { id: 'q11', text: 'Какой момент в жизни был для тебя самым счастливым?', categoryId: 'memory' },
  { id: 'q12', text: 'Что ты ценишь в дружбе больше всего?', categoryId: 'relationships' },
  { id: 'q13', text: 'Какой страх мешает тебе двигаться вперед?', categoryId: 'fears' },
  { id: 'q14', text: 'Что бы ты изменил в мире, если бы мог?', categoryId: 'values' },
  { id: 'q15', text: 'Какой комплимент тебе запомнился больше всего?', categoryId: 'relationships' }
]

const workQuestions = [
  { id: 'w1',  text: 'Какой самый полезный совет ты получал на работе?', categoryId: 'career' },
  { id: 'w2',  text: 'Что тебя больше всего драйвит в текущих задачах?', categoryId: 'drive' },
  { id: 'w3',  text: 'Как ты справляешься с выгоранием?', categoryId: 'burnout' },
  { id: 'w4',  text: 'Какой проект стал для тебя переломным?', categoryId: 'career' },
  { id: 'w5',  text: 'Что ты хочешь достичь через 5 лет?', categoryId: 'skills' },
  { id: 'w6',  text: 'Какой навык ты хочешь развить в ближайший год?', categoryId: 'skills' },
  { id: 'w7',  text: 'Как ты определяешь приоритеты в работе?', categoryId: 'priorities' },
  { id: 'w8',  text: 'Что тебя больше всего раздражает в рабочих процессах?', categoryId: 'priorities' },
  { id: 'w9',  text: 'Какой твой главный профессиональный успех?', categoryId: 'career' },
  { id: 'w10', text: 'Как ты обучаешься новому?', categoryId: 'skills' }
]

export const decks = {
  deep: {
    deckId: 'deep',
    id: 'deep',                    // обратная совместимость
    name: 'Глубокие мысли',
    description: 'Вопросы для глубоких размышлений о жизни',
    lang: 'ru_RU',
    baseDeckId: 'deep',
    deckCategory: 'self',          // v5.11: категория колоды
    questions: deepQuestions,
    categories: deepCategories,
    orders: Array.from({ length: 10 }, (_, i) => ({
      id: `order_${i + 1}`,
      name: String.fromCharCode(65 + i),
      sequence: generateOrder(deepQuestions, (i + 1) * 12345)
    })),
    isCustom: false
  },
  work: {
    deckId: 'work',
    id: 'work',                    // обратная совместимость
    name: 'Про работу и цели',
    description: 'Вопросы о карьере и профессиональном росте',
    lang: 'ru_RU',
    baseDeckId: 'work',
    deckCategory: 'work',          // v5.11: категория колоды
    questions: workQuestions,
    categories: workCategories,
    orders: Array.from({ length: 10 }, (_, i) => ({
      id: `order_${i + 1}`,
      name: String.fromCharCode(65 + i),
      sequence: generateOrder(workQuestions, (i + 1) * 67890)
    })),
    isCustom: false
  }
}

export const deckIds = Object.keys(decks)
export const ORDER_COUNT = 10
