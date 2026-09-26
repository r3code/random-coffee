/**
 * Колоды вопросов и предвычисленные порядки (A..J).
 * Порядок детерминирован seed — два участника, выбравшие одну букву,
 * получат одинаковую последовательность.
 *
 * v5.3:  категории вопросов внутри колоды (`categories` + `categoryId`).
 * v5.11: deckCategory — категория КОЛОДЫ (одна на колоду, slug из белого списка).
 *        7 категорий: couples, first-date, friendship, family, work, self, party.
 *        4 новые встроенные колоды: couples, first-date, friends, family.
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

// v5.11: Категории вопросов для couples
const couplesCategories = {
  love:        { name: 'Любовь', color: '#ec4899' },
  future:      { name: 'Будущее', color: '#f59e0b' },
  past:        { name: 'Прошлое', color: '#8b5cf6' },
  gratitude:   { name: 'Благодарность', color: '#10b981' },
  honesty:     { name: 'Честность', color: '#3b82f6' }
}

// v5.11: Категории вопросов для first-date
const firstDateCategories = {
  icebreaker:  { name: 'Лёд', color: '#f59e0b' },
  values:      { name: 'Ценности', color: '#10b981' },
  fun:         { name: 'Веселье', color: '#ec4899' },
  curiosity:   { name: 'Любопытство', color: '#3b82f6' }
}

// v5.11: Категории вопросов для friends
const friendsCategories = {
  memories:    { name: 'Воспоминания', color: '#10b981' },
  values:      { name: 'Ценности', color: '#3b82f6' },
  growth:      { name: 'Рост', color: '#8b5cf6' },
  secrets:     { name: 'Секреты', color: '#f59e0b' }
}

// v5.11: Категории вопросов для family
const familyCategories = {
  traditions:  { name: 'Традиции', color: '#8b5cf6' },
  history:     { name: 'История', color: '#f59e0b' },
  values:      { name: 'Ценности', color: '#10b981' },
  gratitude:   { name: 'Благодарность', color: '#ec4899' },
  future:      { name: 'Будущее', color: '#3b82f6' }
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

// v5.11: Для пар — 12 вопросов для установленных пар.
const couplesQuestions = [
  { id: 'c1',  text: 'Что ты ценишь во мне больше всего?', categoryId: 'love' },
  { id: 'c2',  text: 'Когда ты почувствовал, что мы стали по-настоящему близки?', categoryId: 'love' },
  { id: 'c3',  text: 'Что бы ты изменил в нашем первом годе вместе?', categoryId: 'past' },
  { id: 'c4',  text: 'Каким ты видишь нас через 5 лет?', categoryId: 'future' },
  { id: 'c5',  text: 'Что ты никогда мне не говорил, но хотел бы?', categoryId: 'honesty' },
  { id: 'c6',  text: 'За что ты до сих пор благодарен нашим отношениям?', categoryId: 'gratitude' },
  { id: 'c7',  text: 'Какой момент с тобой я до сих пор помню и берегу?', categoryId: 'past' },
  { id: 'c8',  text: 'Что тебя волнует в нашем будущем?', categoryId: 'future' },
  { id: 'c9',  text: 'Что-то, что я делаю, до сих пор тебя удивляет?', categoryId: 'love' },
  { id: 'c10', text: 'Какая традиция только наша — и что в ней важно?', categoryId: 'gratitude' },
  { id: 'c11', text: 'Что-то, что тебя раньше беспокоило, теперь не беспокоит — почему?', categoryId: 'honesty' },
  { id: 'c12', text: 'За что ты хочешь, чтобы я знал, что ты благодарна/благодарен?', categoryId: 'gratitude' }
]

// v5.11: Первое свидание — 12 лёгких вопросов без интимности.
const firstDateQuestions = [
  { id: 'fd1',  text: 'Что тебя больше всего драйвит сейчас?', categoryId: 'curiosity' },
  { id: 'fd2',  text: 'Самый неожиданный комплимент, что тебе делали?', categoryId: 'fun' },
  { id: 'fd3',  text: 'Какое твое хобби, о котором мало кто знает?', categoryId: 'icebreaker' },
  { id: 'fd4',  text: 'Что ты никогда не прощаешь?', categoryId: 'values' },
  { id: 'fd5',  text: 'Какую книгу или фильм ты бы посоветовал 16-летнему себе?', categoryId: 'curiosity' },
  { id: 'fd6',  text: 'Что для тебя значит «хороший день»?', categoryId: 'values' },
  { id: 'fd7',  text: 'Самый запоминающийся момент этого года?', categoryId: 'fun' },
  { id: 'fd8',  text: 'Что ты в себе ценишь?', categoryId: 'values' },
  { id: 'fd9',  text: 'Что ты изучаешь новому с удовольствием?', categoryId: 'curiosity' },
  { id: 'fd10', text: 'Как ты отдыхаешь, когда совсем устал?', categoryId: 'icebreaker' },
  { id: 'fd11', text: 'Что ты никогда не делал, но очень хочешь?', categoryId: 'fun' },
  { id: 'fd12', text: 'Что тебя в людях сразу отталкивает, а что притягивает?', categoryId: 'values' }
]

// v5.11: Для друзей — 12 вопросов для старой дружбы.
const friendsQuestions = [
  { id: 'fr1',  text: 'Что ты помнишь о нашем первом знакомстве?', categoryId: 'memories' },
  { id: 'fr2',  text: 'Какое моё решение тебя удивило сильнее всего?', categoryId: 'growth' },
  { id: 'fr3',  text: 'Что ты никогда мне не рассказывал, но хотел бы?', categoryId: 'secrets' },
  { id: 'fr4',  text: 'Какое наше общее воспоминание греет тебя больше всего?', categoryId: 'memories' },
  { id: 'fr5',  text: 'Что ты ценишь в нашей дружбе больше всего?', categoryId: 'values' },
  { id: 'fr6',  text: 'В чём мы стали разными за эти годы — и хорошо это или нет?', categoryId: 'growth' },
  { id: 'fr7',  text: 'Что я о тебе знаю, чего не знает почти никто?', categoryId: 'secrets' },
  { id: 'fr8',  text: 'Какое моё качество тебя раздражает, но ты его терпишь?', categoryId: 'values' },
  { id: 'fr9',  text: 'Что ты понял о себе через нашу дружбу?', categoryId: 'growth' },
  { id: 'fr10', text: 'Самый дурацкий наш совместный поступок — что он тебе дал?', categoryId: 'memories' },
  { id: 'fr11', text: 'Что ты хотел бы, чтобы я знал о тебе, но не спрашивал?', categoryId: 'secrets' },
  { id: 'fr12', text: 'Как ты видишь нашу дружбу через 10 лет?', categoryId: 'growth' }
]

// v5.11: Семейные разговоры — 12 вопросов для родственников.
const familyQuestions = [
  { id: 'fm1',  text: 'Какую традицию нашей семьи ты хочешь сохранить?', categoryId: 'traditions' },
  { id: 'fm2',  text: 'Что ты унаследовал от родителей, что хочешь передать дальше?', categoryId: 'history' },
  { id: 'fm3',  text: 'Какая история нашей семьи тебя больше всего впечатлила?', categoryId: 'history' },
  { id: 'fm4',  text: 'За что ты благодарен нашей семье?', categoryId: 'gratitude' },
  { id: 'fm5',  text: 'Что ты никогда не говорил родителям, но хотел бы?', categoryId: 'values' },
  { id: 'fm6',  text: 'Что в нашей семье тебя беспокоит, и что ты хочешь с этим сделать?', categoryId: 'values' },
  { id: 'fm7',  text: 'Каким ты видишь нашу семью через 10 лет?', categoryId: 'future' },
  { id: 'fm8',  text: 'Что в наших традициях устарело, и что ты хотел бы изменить?', categoryId: 'traditions' },
  { id: 'fm9',  text: 'За какой момент в детстве ты благодарен родителям больше всего?', categoryId: 'gratitude' },
  { id: 'fm10', text: 'Какую историю ты хочешь, чтобы знали твои дети о нас?', categoryId: 'history' },
  { id: 'fm11', text: 'Что тебя в нашей семье делает сильнее?', categoryId: 'values' },
  { id: 'fm12', text: 'Что ты хочешь начать делать вместе, чего мы раньше не делали?', categoryId: 'future' }
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
  },
  couples: {
    deckId: 'couples',
    id: 'couples',                 // обратная совместимость
    name: 'Для пар',
    description: 'Разговоры для установленных пар — от благодарности к будущему',
    lang: 'ru_RU',
    baseDeckId: 'couples',
    deckCategory: 'couples',       // v5.11: категория колоды
    questions: couplesQuestions,
    categories: couplesCategories,
    orders: Array.from({ length: 10 }, (_, i) => ({
      id: `order_${i + 1}`,
      name: String.fromCharCode(65 + i),
      sequence: generateOrder(couplesQuestions, (i + 1) * 24681)
    })),
    isCustom: false
  },
  'first-date': {
    deckId: 'first-date',
    id: 'first-date',              // обратная совместимость
    name: 'Первое свидание',
    description: 'Лёгкие вопросы для знакомства — без интимности, с интересом',
    lang: 'ru_RU',
    baseDeckId: 'first-date',
    deckCategory: 'first-date',    // v5.11: категория колоды
    questions: firstDateQuestions,
    categories: firstDateCategories,
    orders: Array.from({ length: 10 }, (_, i) => ({
      id: `order_${i + 1}`,
      name: String.fromCharCode(65 + i),
      sequence: generateOrder(firstDateQuestions, (i + 1) * 35791)
    })),
    isCustom: false
  },
  friends: {
    deckId: 'friends',
    id: 'friends',                 // обратная совместимость
    name: 'Для друзей',
    description: 'Для старой дружбы — воспоминания, ценности, что-то новое',
    lang: 'ru_RU',
    baseDeckId: 'friends',
    deckCategory: 'friendship',    // v5.11: категория колоды
    questions: friendsQuestions,
    categories: friendsCategories,
    orders: Array.from({ length: 10 }, (_, i) => ({
      id: `order_${i + 1}`,
      name: String.fromCharCode(65 + i),
      sequence: generateOrder(friendsQuestions, (i + 1) * 46802)
    })),
    isCustom: false
  },
  family: {
    deckId: 'family',
    id: 'family',                  // обратная совместимость
    name: 'Семейные разговоры',
    description: 'Традиции, история, благодарность и будущее семьи',
    lang: 'ru_RU',
    baseDeckId: 'family',
    deckCategory: 'family',        // v5.11: категория колоды
    questions: familyQuestions,
    categories: familyCategories,
    orders: Array.from({ length: 10 }, (_, i) => ({
      id: `order_${i + 1}`,
      name: String.fromCharCode(65 + i),
      sequence: generateOrder(familyQuestions, (i + 1) * 57913)
    })),
    isCustom: false
  }
}

export const deckIds = Object.keys(decks)
export const ORDER_COUNT = 10
