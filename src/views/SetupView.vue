<template>
  <div class="min-h-dvh bg-gradient-to-br from-indigo-900 to-purple-900 dark:from-gray-900 dark:to-gray-800 text-white p-6"
       style="padding-bottom: env(safe-area-inset-bottom);">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-4xl font-bold text-center mb-8">Random Coffee</h1>

      <!-- Тема -->
      <div class="mb-6 flex justify-center gap-2" role="group" aria-label="Выбор темы оформления">
        <button
          v-for="t in ['light', 'dark', 'auto']"
          :key="t"
          @click="setTheme(t)"
          :aria-pressed="theme === t"
          class="px-4 py-2 rounded-lg transition-all"
          :class="theme === t ? 'bg-yellow-500 text-gray-900' : 'bg-white/20 hover:bg-white/30'"
        >
          {{ t === 'light' ? '☀️ Светлая' : t === 'dark' ? '🌙 Темная' : '🔄 Авто' }}
        </button>
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- ГЛАВНЫЙ ЭКРАН: Продолжить + История (без формы новой сессии) -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <template v-if="!showNewForm">
        <!-- Продолжить сессию? -->
        <div v-if="hasSavedSession && !shareParams" class="mb-8">
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-4">
            <h2 class="text-2xl font-bold mb-3">Продолжить сессию?</h2>
            <!-- Крупное название колоды + порядок -->
            <div class="mb-2">
              <span class="text-lg font-bold">{{ savedDeckName }}</span>
              <span class="text-lg opacity-70"> • порядок {{ savedOrderName }}</span>
            </div>
            <p class="mb-4 text-sm opacity-60">
              Вопрос {{ (savedTurn ?? 0) + 1 }} из {{ savedTotalQuestions }}
            </p>
            <div class="flex gap-4 mb-4">
              <button @click="continueSession"
                      class="flex-1 py-3 bg-green-500 hover:bg-green-400 rounded-lg font-bold">
                Продолжить
              </button>
              <button @click="enterNewForm"
                      class="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold">
                Новая
              </button>
            </div>

            <!-- QR-код для продолжения + кнопка копирования ссылки -->
            <div class="text-center">
              <p class="text-sm opacity-80 mb-2">
                Покажите партнёру QR-код, чтобы продолжить с того же вопроса:
              </p>
              <div v-if="continueQrDataUrl" class="inline-block bg-white p-3 rounded-lg">
                <img :src="continueQrDataUrl" alt="QR-код для продолжения сессии" class="w-40 h-40" />
              </div>
              <div class="flex items-center justify-center gap-2 mt-2">
                <p class="text-xs opacity-70 break-all flex-1 text-left max-w-xs">{{ continueShareUrl }}</p>
                <button
                  v-if="continueShareUrl"
                  @click="copyToClipboard(continueShareUrl)"
                  class="w-9 h-9 flex items-center justify-center bg-gray-700/60 hover:bg-gray-600 rounded-lg text-sm shrink-0"
                  title="Копировать ссылку"
                  aria-label="Копировать ссылку"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Нет активной сессии: большая кнопка "Начать новую" -->
        <div v-else class="mb-8 text-center">
          <button @click="enterNewForm"
                  class="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95">
            ➕ Начать новую сессию
          </button>
        </div>

        <!-- История сессий -->
        <div v-if="sessions.length > 0" class="mb-8">
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 class="text-2xl font-bold mb-4">История сессий</h2>
            <p class="text-sm opacity-80 mb-2">
              Можно параллельно вести несколько сессий с разными колодами и возвращаться к ним позже.
            </p>
            <p class="text-xs opacity-60 mb-4">
              Хранится не более 20 последних сессий.
            </p>

            <div class="space-y-3 max-h-96 overflow-y-auto">
              <div
                v-for="s in sortedSessions"
                :key="s.id"
                class="bg-white/10 rounded-lg p-4 transition-all"
                :class="[
                  s.id === activeSessionId ? 'ring-2 ring-yellow-500' : '',
                  highlightedSessionId === s.id ? 'ring-2 ring-emerald-400 bg-emerald-500/20' : ''
                ]"
              >
                <!-- Первый ряд: иконка статуса + название + дата (текст
                     не обрезается, занимает полную ширину). -->
                <div class="flex items-start gap-3">
                  <div class="text-xl shrink-0 leading-6">
                    <span v-if="isSessionFinished(s)">✅</span>
                    <span v-else>▶️</span>
                  </div>
                  <div class="flex-grow min-w-0">
                    <!-- v5.0: имя сессии (если есть) — показываем его жирным,
                         а колоду+порядок — второй строкой мельче.
                         Если имени нет — как раньше: колода+порядок жирным. -->
                    <div v-if="s.name" class="font-bold leading-snug break-words">
                      {{ s.name }}
                    </div>
                    <div class="leading-snug break-words" :class="s.name ? 'text-sm opacity-80' : 'font-bold'">
                      {{ sessionDeckName(s) }} • порядок {{ sessionOrderName(s) }}
                    </div>
                    <div class="text-xs opacity-70 mt-1">
                      {{ isSessionFinished(s)
                        ? `Завершена • ${formatDate(s.lastActiveAt || s.updatedAt)}`
                        : `В процессе • вопрос ${(s.currentTurn || 0) + 1} из ${sessionTotal(s)}${s.id === activeSessionId ? ' • Текущая' : ''} • ${formatDate(s.lastActiveAt || s.updatedAt)}`
                      }}
                    </div>
                  </div>
                </div>

                <!-- Второй ряд: кнопка действия + утилитарные кнопки. -->
                <div class="flex items-center gap-2 mt-3 flex-wrap">
                  <!-- Кнопка Открыть — для всех незавершённых, включая активную -->
                  <button
                    v-if="!isSessionFinished(s)"
                    @click="openSession(s.id)"
                    class="px-3 py-2 bg-green-500 hover:bg-green-400 rounded-lg text-sm font-bold"
                  >
                    Открыть
                  </button>
                  <button
                    v-else
                    @click="restartCompletedSession(s)"
                    class="px-3 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-bold"
                    title="Начать новую сессию с этими же параметрами"
                    aria-label="Начать новую сессию с теми же параметрами"
                  >
                    ↻ Снова
                  </button>

                  <!-- Утилитарные кнопки справа, прижимаются вправо через ml-auto -->
                  <div class="flex items-center gap-2 ml-auto">
                    <!-- v5.0: переименовать сессию (inline-редактирование) -->
                    <button
                      @click="startRename(s)"
                      class="w-9 h-9 flex items-center justify-center bg-gray-700/60 hover:bg-gray-600 rounded-lg text-base font-bold leading-none transition-colors"
                      title="Переименовать сессию"
                      aria-label="Переименовать сессию"
                    >
                      ✎
                    </button>
                    <button
                      @click="handleExportSession(s.id)"
                      class="w-9 h-9 flex items-center justify-center bg-gray-700/60 hover:bg-gray-600 rounded-lg text-base font-bold leading-none transition-colors"
                      title="Экспортировать в файл"
                      aria-label="Экспортировать сессию в файл"
                    >
                      ↓
                    </button>
                    <button
                      @click="confirmDeleteSession(s.id)"
                      class="w-9 h-9 flex items-center justify-center bg-gray-700/60 hover:bg-red-500 hover:text-white text-gray-300 rounded-lg text-base font-bold leading-none transition-colors"
                      title="Удалить сессию"
                      aria-label="Удалить сессию"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <!-- v5.0: inline-форма переименования — отдельной строкой под карточкой.
                     Показываем только для редактируемой сессии. -->
                <div v-if="renamingSessionId === s.id" class="mt-3 flex gap-2">
                  <input
                    v-model="renamingValue"
                    @keyup.enter="saveRename"
                    @keyup.esc="cancelRename"
                    @keydown.stop
                    type="text"
                    maxlength="128"
                    placeholder="Например: с Анной в пятницу"
                    class="flex-grow px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-yellow-500"
                    autofocus
                  />
                  <button
                    @click="saveRename"
                    class="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-bold"
                    title="Сохранить"
                    aria-label="Сохранить имя"
                  >
                    ✓
                  </button>
                  <button
                    @click="cancelRename"
                    class="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-bold"
                    title="Отмена"
                    aria-label="Отмена"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <!-- Импорт сессии + бэкап — внизу блока истории -->
            <div class="mt-4 pt-4 border-t border-white/10 space-y-3">
              <label class="block w-full py-3 bg-purple-500 hover:bg-purple-400 rounded-lg font-bold text-center cursor-pointer">
                📥 Импорт сессии из файла
                <input type="file" accept=".json" @change="handleImport" class="hidden" />
              </label>
              <!-- v5.1: Полный бэкап -->
              <div class="flex gap-3">
                <button @click="handleExportBackup" class="flex-1 py-3 bg-blue-500 hover:bg-blue-400 rounded-lg font-bold text-sm">
                  💾 Бэкап
                </button>
                <label class="flex-1 py-3 bg-teal-500 hover:bg-teal-400 rounded-lg font-bold text-sm text-center cursor-pointer">
                  📂 Восстановить
                  <input type="file" accept=".json" @change="handleImportBackup" class="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- ЭКРАН НОВОЙ СЕССИИ: форма со всеми блоками (disabled до выбора) -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <template v-else>
        <!-- Назад -->
        <div class="mb-6">
          <button @click="exitNewForm" class="text-sm opacity-70 hover:opacity-100">
            ← Назад
          </button>
        </div>

        <div class="space-y-6">
          <!-- Блок 1: Выбор колоды -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 class="text-2xl font-bold mb-4">1. Выберите колоду</h2>

            <!-- v5.6: компактная плашка с выбранной колодой — показывается после выбора,
                 пока пользователь не нажмёт «Сменить».Освобождает место для шагов 2/3. -->
            <div
              v-if="selectedDeckId && !isDeckCatalogExpanded"
              class="bg-white/15 border border-yellow-400/30 rounded-lg p-4 mb-4"
            >
              <div class="font-bold text-lg leading-tight mb-2 line-clamp-2">{{ selectedDeck?.name }}</div>
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-1 flex-wrap">
                  <span
                    class="text-[10px] px-2 py-0.5 rounded font-bold leading-none border"
                    :class="isCustomDeck(selectedDeckId)
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                      : 'bg-white/15 text-white/80 border-white/20'"
                  >
                    {{ isCustomDeck(selectedDeckId) ? 'Загруженная' : 'Встроенная' }}
                  </span>
                  <span
                    v-if="selectedDeck?.lang"
                    class="text-[10px] px-2 py-0.5 rounded font-mono leading-none border bg-white/15 text-white/80 border-white/20"
                  >{{ selectedDeck.lang.split('_')[0] }}</span>
                  <span class="text-xs opacity-70 ml-1">{{ selectedDeck?.questions.length }} вопросов</span>
                </div>
                <button
                  @click="expandCatalog"
                  class="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-bold"
                  title="Выбрать другую колоду"
                >✎ Сменить</button>
              </div>
            </div>

            <!-- ── Единый каталог (встроенные + загруженные + доступные для загрузки) ── -->
            <!-- v5.6: показываем каталог если колода не выбрана, ИЛИ пользователь нажал «Сменить» -->
            <div v-show="!selectedDeckId || isDeckCatalogExpanded">
              <!-- Шапка: поиск с кнопкой очистки + фильтры + импорт из файла -->
              <div class="flex flex-wrap items-center gap-3 mb-4">
                <div class="relative flex-grow min-w-[200px]">
                  <input
                    ref="deckSearchInput"
                    v-model="deckSearch"
                    type="text"
                    placeholder="Поиск по имени или описанию..."
                    @keydown.esc="deckSearch = ''"
                    class="w-full pl-3 pr-9 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-yellow-500"
                  />
                  <button
                    v-if="deckSearch.length > 0"
                    @click="deckSearch = ''; deckSearchInput?.focus()"
                    aria-label="Очистить поиск"
                    title="Очистить (Esc)"
                    class="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded"
                    type="button"
                  >✕</button>
                </div>
                <div class="flex gap-2" role="group" aria-label="Фильтр колод">
                  <button
                    v-for="f in deckFilters"
                    :key="f.value"
                    @click="deckFilter = f.value"
                    :aria-pressed="deckFilter === f.value"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    :class="deckFilter === f.value ? 'bg-yellow-500 text-gray-900' : 'bg-white/15 hover:bg-white/25'"
                  >
                    {{ f.label }} ({{ f.count }})
                  </button>
                </div>
                <label class="px-3 py-1.5 bg-purple-500 hover:bg-purple-400 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1" title="Импортировать колоду из .json файла">
                  📥 Импорт из файла
                  <input type="file" accept=".json" @change="handleImportDeck" class="hidden" />
                </label>
              </div>

              <!-- ── Секция «Загруженные» (встроенные + кастомные) ── -->
              <div>
                <h3 class="text-sm font-bold opacity-60 mb-3">ЗАГРУЖЕННЫЕ</h3>
                <div v-if="filteredCatalogDecks.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  v-for="d in filteredCatalogDecks"
                  :key="d.deckId"
                  @click="selectDeck(d.deckId)"
                  :aria-pressed="selectedDeckId === d.deckId"
                  class="relative p-4 rounded-lg transition-all text-left"
                  :class="selectedDeckId === d.deckId ? 'bg-yellow-500 text-gray-900' : 'bg-white/20 hover:bg-white/30'"
                >
                  <!-- Имя — отдельная строка, всегда видно целиком (до 2 строк) -->
                  <div class="font-bold text-lg leading-tight mb-2 line-clamp-2">{{ d.name }}</div>
                  <!-- Бейджи одного размера: тип + lang. leading-none + одинаковый padding + border. -->
                  <div class="flex items-center gap-1 mb-2">
                    <span
                      class="text-[10px] px-2 py-0.5 rounded font-bold leading-none border"
                      :class="d.kind === 'builtin'
                        ? (selectedDeckId === d.deckId ? 'bg-gray-900/10 text-gray-700 border-gray-900/20' : 'bg-white/15 text-white/80 border-white/20')
                        : (selectedDeckId === d.deckId ? 'bg-emerald-700/30 text-emerald-900 border-emerald-700/30' : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40')"
                      :title="d.kind === 'builtin' ? 'Встроенная колода' : 'Загруженная колода'"
                    >
                      {{ d.kind === 'builtin' ? 'Встроенная' : 'Загруженная' }}
                    </span>
                    <span
                      v-if="d.lang"
                      class="text-[10px] px-2 py-0.5 rounded font-mono leading-none border"
                      :class="selectedDeckId === d.deckId ? 'bg-gray-900/10 text-gray-700 border-gray-900/20' : 'bg-white/15 text-white/80 border-white/20'"
                      :title="`Язык колоды: ${d.lang}`"
                    >{{ d.lang.split('_')[0] }}</span>
                  </div>
                  <div class="text-sm opacity-80">{{ d.description }}</div>
                  <div class="flex items-center justify-between gap-2 mt-2">
                    <div class="text-xs opacity-70">{{ d.questions.length }} вопросов</div>
                    <!-- Действия только для кастомных колод. @click.stop предотвращает выбор колоды. -->
                    <div v-if="d.kind === 'custom'" class="flex gap-1">
                      <button
                        @click.stop="handleExportDeck(d.deckId)"
                        class="w-8 h-8 flex items-center justify-center bg-gray-700/60 hover:bg-gray-600 rounded-lg text-sm"
                        title="Экспортировать колоду"
                        aria-label="Экспортировать колоду"
                      >↓</button>
                      <button
                        @click.stop="handleDeleteDeck(d.deckId)"
                        class="w-8 h-8 flex items-center justify-center bg-gray-700/60 hover:bg-red-500 hover:text-white rounded-lg text-sm"
                        title="Удалить колоду"
                        aria-label="Удалить колоду"
                      >✕</button>
                      <button
                        v-if="d.source"
                        @click.stop="handleCheckUpdates(d.deckId)"
                        class="w-8 h-8 flex items-center justify-center bg-gray-700/60 hover:bg-blue-500 rounded-lg text-sm"
                        title="Проверить обновления"
                        aria-label="Проверить обновления"
                      >🔄</button>
                    </div>
                  </div>
                </button>
              </div>
                <div v-else class="text-center py-6 opacity-70 text-sm">
                  Ничего не найдено. Измените поиск или фильтр, либо импортируйте колоду из файла.
                </div>
              </div>
            </div>

            <!-- ── Разделитель + секция «Доступны для загрузки» ── -->
            <!-- Скрывается при фильтре 'builtin'/'custom' — пользователь явно хочет только локальное -->
            <div v-if="deckFilter === 'all'" class="mt-6 pt-4 border-t border-white/10">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold opacity-60">ДОСТУПНЫ ДЛЯ ЗАГРУЗКИ</h3>
                <div class="flex items-center gap-3 text-xs opacity-50">
                  <span v-if="catalogLastFetch > 0">
                    Обновлено: {{ formatCatalogDate(catalogLastFetch) }}
                  </span>
                  <button @click="refreshCatalog" title="Обновить каталог" class="text-blue-400 hover:underline">↻</button>
                </div>
              </div>

              <div v-if="catalogLoading && catalog.length === 0" class="text-center py-4 opacity-70 text-sm">
                🔄 Загрузка каталога...
              </div>
              <div v-else-if="catalogError && catalog.length === 0" class="text-center py-4 opacity-70 text-sm">
                ⚠️ Не удалось загрузить каталог: {{ catalogError }}
                <button @click="refreshCatalog" class="block mx-auto mt-2 text-blue-400 hover:underline text-xs">Повторить</button>
              </div>
              <div v-else-if="filteredRemoteCatalog.length === 0" class="text-center py-4 opacity-70 text-sm">
                <template v-if="catalog.length === 0">Каталог пуст.</template>
                <template v-else-if="searchHasNoMatchInRemote">Ничего не найдено в каталоге.</template>
                <template v-else>✓ Все доступные колоды уже загружены.</template>
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="item in filteredRemoteCatalog"
                  :key="item.deckId"
                  class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all"
                >
                  <div class="font-bold text-lg leading-tight mb-2 line-clamp-2">{{ item.name }}</div>
                  <div class="flex items-center gap-1 mb-2">
                    <span
                      class="text-[10px] px-2 py-0.5 rounded font-bold leading-none border bg-white/10 text-white/60 border-white/15"
                      title="Колода из удалённого каталога"
                    >В каталоге</span>
                    <span
                      v-if="item.lang"
                      class="text-[10px] px-2 py-0.5 rounded font-mono leading-none border bg-white/10 text-white/60 border-white/15"
                      :title="`Язык колоды: ${item.lang}`"
                    >{{ item.lang.split('_')[0] }}</span>
                  </div>
                  <div class="text-sm opacity-70">{{ item.description }}</div>
                  <div class="text-xs opacity-50 mt-1 mb-3">{{ item.questionsCount || '?' }} вопросов</div>
                  <button
                    @click="handleLoadFromCatalog(item)"
                    :disabled="catalogLoadingDeck === item.deckId"
                    class="w-full py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold"
                  >
                    {{ catalogLoadingDeck === item.deckId ? '⏳ Загрузка...' : 'Загрузить' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Блок 2: Порядок (виден, disabled пока нет колоды) -->
          <div ref="step2Ref"
               class="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-opacity scroll-mt-4"
               :class="!selectedDeckId ? 'opacity-60' : ''">
            <h2 class="text-2xl font-bold mb-4">2. Выберите порядок вопросов</h2>

            <!-- v5.7: компактная плашка с выбранным порядком -->
            <div
              v-if="selectedOrderIndex !== null && !isOrderExpanded"
              class="bg-white/15 border border-yellow-400/30 rounded-lg p-4 mb-4"
            >
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="text-3xl font-bold">{{ selectedDeck?.orders?.[selectedOrderIndex]?.name || '—' }}</span>
                  <span class="text-sm opacity-70">порядок</span>
                </div>
                <button
                  @click="expandOrder"
                  :disabled="!selectedDeckId"
                  class="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Выбрать другой порядок"
                >✎ Сменить</button>
              </div>
            </div>

            <div v-show="selectedOrderIndex === null || isOrderExpanded">
              <p v-if="!selectedDeckId" class="text-sm opacity-70 mb-4">
                ↑ Сначала выберите колоду
              </p>
              <p v-else class="text-sm opacity-80 mb-4">
                Договоритесь с партнером о букве порядка — одинаковая буква даст
                одинаковую последовательность вопросов.
              </p>
              <div class="grid grid-cols-5 gap-3">
                <button
                  v-for="(order, index) in (selectedDeck?.orders || emptyOrders)"
                  :key="order?.id || index"
                  @click="selectOrder(index)"
                  :disabled="!selectedDeckId"
                  :aria-pressed="selectedOrderIndex === index"
                  :aria-label="`Порядок ${order?.name || '?'}`"
                  class="p-3 rounded-lg transition-all text-center font-bold disabled:cursor-not-allowed"
                  :class="selectedOrderIndex === index
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:hover:bg-white/20'"
                >
                  {{ order?.name || '—' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Блок 3: Роль (виден, disabled пока нет порядка) -->
          <div ref="step3Ref"
               class="bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-opacity scroll-mt-4"
               :class="selectedOrderIndex === null ? 'opacity-60' : ''">
            <h2 class="text-2xl font-bold mb-4">3. Выберите роль</h2>

            <!-- v5.7: компактная плашка с выбранной ролью -->
            <div
              v-if="selectedRole && !isRoleExpanded"
              class="bg-white/15 border border-yellow-400/30 rounded-lg p-4 mb-4"
            >
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">{{ selectedRole === 'reader' ? '🗣️' : '👂' }}</span>
                  <div>
                    <div class="font-bold">{{ selectedRole === 'reader' ? 'Я читаю первым' : 'Я слушаю первым' }}</div>
                    <div class="text-xs opacity-70">{{ selectedRole === 'reader' ? 'Первый вопрос читаю я' : 'Первый вопрос читает партнер' }}</div>
                  </div>
                </div>
                <button
                  @click="expandRole"
                  :disabled="selectedOrderIndex === null"
                  class="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Выбрать другую роль"
                >✎ Сменить</button>
              </div>
            </div>

            <div v-show="!selectedRole || isRoleExpanded">
              <p v-if="selectedOrderIndex === null" class="text-sm opacity-70 mb-4">
                ↑ Сначала выберите порядок
              </p>
              <p v-else class="text-sm opacity-80 mb-4">Роли будут чередоваться каждый вопрос</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  @click="selectRole('reader')"
                  :disabled="selectedOrderIndex === null"
                  :aria-pressed="selectedRole === 'reader'"
                  class="p-4 rounded-lg transition-all disabled:cursor-not-allowed"
                  :class="selectedRole === 'reader'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:hover:bg-white/20'"
                >
                  <div class="text-2xl mb-2">🗣️</div>
                  <div class="font-bold">Я читаю первым</div>
                  <div class="text-sm opacity-80">Первый вопрос читаю я</div>
                </button>
                <button
                  @click="selectRole('listener')"
                  :disabled="selectedOrderIndex === null"
                  :aria-pressed="selectedRole === 'listener'"
                  class="p-4 rounded-lg transition-all disabled:cursor-not-allowed"
                  :class="selectedRole === 'listener'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:hover:bg-white/20'"
                >
                  <div class="text-2xl mb-2">👂</div>
                  <div class="font-bold">Я слушаю первым</div>
                  <div class="text-sm opacity-80">Первый вопрос читает партнер</div>
                </button>
              </div>
            </div>
          </div>

          <!-- Блок 4: QR-код (виден, плейсхолдер пока нет роли) -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h3 class="text-xl font-bold mb-4">Синхронизация с партнёром</h3>

            <div v-if="!selectedRole">
              <div class="inline-flex items-center justify-center w-48 h-48 bg-white/10 rounded-lg mb-4 opacity-60">
                <span class="text-5xl opacity-50">📷</span>
              </div>
              <p class="text-sm opacity-70">
                ↑ Выберите колоду, порядок и роль — здесь появится QR-код
              </p>
            </div>

            <div v-else>
              <!-- Пометка-инструкция над QR-кодом: что делать и зачем -->
              <div class="flex items-start gap-2 text-left mb-4 px-2">
                <span class="text-base shrink-0 mt-0.5 opacity-70" aria-hidden="true">ℹ️</span>
                <p class="text-xs opacity-70 leading-snug">
                  Покажите партнёру QR-код — он попадёт в ту же сессию. Или отправьте ссылку сообщением.
                  Потом нажмите «Начать сессию».
                </p>
              </div>

              <div v-if="qrDataUrl" class="inline-block bg-white p-3 rounded-lg">
                <img :src="qrDataUrl" alt="QR-код со ссылкой на сессию" class="w-48 h-48" />
              </div>
              <div v-else class="inline-flex items-center justify-center w-48 h-48 bg-white/10 rounded-lg">
                <span class="text-sm opacity-70">Генерация...</span>
              </div>
              <!-- v5.7: ссылка под QR-кодом простым текстом + компактная иконка копирования рядом -->
              <p class="text-xs opacity-70 mt-3 break-all">
                {{ shareUrl }}
                <button
                  @click="handleCopyLink"
                  :aria-label="linkCopiedRef ? 'Ссылка скопирована' : 'Копировать ссылку'"
                  :title="linkCopiedRef ? 'Скопировано!' : 'Копировать ссылку'"
                  class="ml-1 align-middle inline-flex items-center justify-center w-7 h-7 -translate-y-px text-base leading-none opacity-70 hover:opacity-100 hover:text-yellow-400 transition-all"
                  type="button"
                >
                  <span v-if="linkCopiedRef" class="text-emerald-400">✓</span>
                  <span v-else aria-hidden="true">⧉</span>
                </button>
              </p>
            </div>
          </div>

          <!-- Кнопка "Начать сессию" (видна, disabled пока нет роли) -->
          <button
            ref="startButtonRef"
            @click="startGame"
            :disabled="!selectedRole"
            class="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-yellow-500 scroll-mt-4"
          >
            Начать сессию ➔
          </button>
        </div>
      </template>

      <!-- Footer: версия, коммит, ссылка на GitHub -->
      <footer class="mt-8 pt-6 border-t border-white/10 text-center text-xs opacity-60">
        <div class="flex items-center justify-center gap-3 flex-wrap">
          <span>v{{ appVersion }}</span>
          <span v-if="commitHash" class="font-mono">
            · <a :href="commitUrl" target="_blank" rel="noopener"
                 class="hover:opacity-100 hover:text-yellow-400 transition-colors"
                 :title="commitDate ? `Коммит от ${formatCommitDate(commitDate)}` : 'Открыть коммит на GitHub'">
              {{ commitHash }}
            </a>
          </span>
          <span>·</span>
          <a href="https://github.com/r3code/random-coffee" target="_blank" rel="noopener"
             class="hover:opacity-100 hover:text-yellow-400 transition-colors"
             title="Открыть репозиторий на GitHub">
            GitHub ↗
          </a>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import QRCode from 'qrcode'
import { useDeck, buildShareUrl, parseShareUrl } from '@/composables/useDeck'

// ─── Версия приложения и git-коммит (инжектируются через vite.config.js define) ──
// Если запускается не через Vite (например, в тестах) — fallback на пустые строки.
// @ts-ignore — глобальные define-константы, объявлены в vite.config.js
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
// @ts-ignore
const commitHash = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : ''
// @ts-ignore
const commitDate = typeof __COMMIT_DATE__ !== 'undefined' ? __COMMIT_DATE__ : ''

const GITHUB_REPO_URL = 'https://github.com/r3code/random-coffee'
const commitUrl = computed(() =>
  commitHash ? `${GITHUB_REPO_URL}/commit/${commitHash}` : GITHUB_REPO_URL
)

function formatCommitDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) +
           ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

const router = useRouter()
const route = useRoute()
const {
  hasSavedSession, startSession,
  importState, theme, setTheme,
  // Реактивные данные сохранённой сессии
  deckId, orderIndex, currentTurn, role, deck, currentOrder,
  // История сессий
  sessions, activeSessionId, loadSession, deleteSession, exportSession, renameSession,
  // v5.1: custom decks
  decks, customDecks, importDeck, exportDeck, deleteDeck, renameDeck,
  exportBackup, importBackup,
  // v5.4: unified catalog
  catalogDecks, isCustomDeck,
  // v5.2: catalog (remote)
  catalog, catalogLoading, catalogError, catalogLastFetch,
  loadCatalog, loadDeckFromUrl, checkDeckUpdates
} = useDeck()

// Пустой массив порядков для отображения 10 disabled-кнопок до выбора колоды
const emptyOrders = Array.from({ length: 10 }, (_, i) => ({
  id: `empty_${i}`,
  name: String.fromCharCode(65 + i)
}))

// ─── v5.4: Единый каталог колод (поиск + фильтры) ─────────────
const deckSearch = ref('')
const deckFilter = ref('all')  // 'all' | 'builtin' | 'custom'
// v5.6: progressive disclosure — после выбора колоды каталог коллапсируется
// в компактную плашку, чтобы освободить место для шага 2.
// true = каталог развёрнут (виден полный список); false = показана плашка.
const isDeckCatalogExpanded = ref(true)
// v5.6: ref на шаг 2 для плавного автоскролла после выбора колоды.
const step2Ref = ref(null)
// v5.7: ref на шаг 3 для автоскролла после выбора порядка.
const step3Ref = ref(null)
// v5.7: progressive disclosure для шагов 2 (порядок) и 3 (роль).
// Та же логика, что и для каталога: после выбора — компактная плашка + «Сменить».
const isOrderExpanded = ref(true)
const isRoleExpanded = ref(true)
// v5.7: ref на кнопку «Начать сессию» — для автоскролла после выбора роли.
const startButtonRef = ref(null)
// v5.7: визуальный feedback после копирования ссылки (✓ на 2 сек).
const linkCopiedRef = ref(false)
let linkCopiedTimer = null

const deckFilters = computed(() => {
  const all = catalogDecks.value
  const builtinCount = all.filter(d => d.kind === 'builtin').length
  const customCount = all.filter(d => d.kind === 'custom').length
  return [
    { value: 'all', label: 'Все', count: all.length },
    { value: 'builtin', label: 'Встроенные', count: builtinCount },
    { value: 'custom', label: 'Загруженные', count: customCount }
  ]
})

const filteredCatalogDecks = computed(() => {
  const q = deckSearch.value.trim().toLowerCase()
  return catalogDecks.value.filter(d => {
    if (deckFilter.value !== 'all' && d.kind !== deckFilter.value) return false
    if (!q) return true
    return (
      (d.name || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q)
    )
  })
})

// ─── Состояние формы ─────────────────────────────────────────
const showNewForm = ref(false)
const selectedDeckId = ref(null)
const selectedOrderIndex = ref(null)
const selectedRole = ref(null)
const shareParams = ref(null)
const qrDataUrl = ref('')
const continueQrDataUrl = ref('')
// ID сессии, подсвеченной после импорта (для визуального feedback). 2 сек.
const highlightedSessionId = ref(null)
// v5.0: inline-переименование сессии
const renamingSessionId = ref(null)
const renamingValue = ref('')
// v5.2: Каталог (remote) — авто-загружается при открытии формы новой сессии
const catalogLoadingDeck = ref('')

// v5.4: фильтр удалённого каталога — скрывает уже загруженные колоды.
// (isDeckAlreadyLoaded проверяет и встроенные, и кастомные.)
function isDeckAlreadyLoaded(deckIdArg) {
  return deckIdArg in decks.value
}

// v5.5: searchHasNoMatchInRemote — true если есть активный поиск, в каталоге что-то есть,
// но после применения поиска и фильтра «не загруженные» ничего не осталось.
// Используется для友好ного пустого состояния «Ничего не найдено в каталоге»
// (вместо «Все колоды уже загружены»).
const searchHasNoMatchInRemote = computed(() => {
  const q = deckSearch.value.trim().toLowerCase()
  if (!q) return false
  if (catalog.value.length === 0) return false
  // Все ещё не загруженные, но без применения поиска
  const notLoaded = catalog.value.filter(item => !isDeckAlreadyLoaded(item.deckId))
  if (notLoaded.length === 0) return false
  // Применяем поиск
  const matched = notLoaded.filter(item =>
    (item.name || '').toLowerCase().includes(q) ||
    (item.description || '').toLowerCase().includes(q)
  )
  return matched.length === 0
})

// v5.5: filteredRemoteCatalog — единый поиск работает и на локальные, и на удалённые.
// Скрываем уже загруженные + применяем тот же deckSearch, что и в верхней секции.
// Сортировка по имени (ru-locale) — как и в верхней секции.
const filteredRemoteCatalog = computed(() => {
  // Скрываем уже загруженные
  let items = catalog.value.filter(item => !isDeckAlreadyLoaded(item.deckId))
  // Поиск (тот же deckSearch, что и вверху)
  const q = deckSearch.value.trim().toLowerCase()
  if (q) {
    items = items.filter(item =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    )
  }
  // Сортировка по имени
  items = [...items].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
  return items
})

// v5.5: авто-загрузка каталога при открытии формы новой сессии.
// Если каталог пустой и не в состоянии загрузки — запускаем.
// Идёмпотентно: если уже что-то есть или уже грузится — ничего не делаем.
async function ensureCatalogLoaded() {
  if (catalog.value.length > 0) return
  if (catalogLoading.value) return
  try {
    await loadCatalog()
  } catch (e) {
    // error уже в catalogError; UI показывает «Не удалось загрузить каталог»
  }
}

async function refreshCatalog() {
  try {
    await loadCatalog(true)
  } catch (e) {
    alert('Не удалось обновить каталог: ' + e.message)
  }
}

async function handleLoadFromCatalog(item) {
  if (!item.url) {
    alert('У этой колоды нет URL для загрузки')
    return
  }
  catalogLoadingDeck.value = item.deckId
  try {
    const result = await loadDeckFromUrl(item.url)
    if (result.ok) {
      // v5.5: тихий успех — не alert, а автo-select загруженной колоды,
      // чтобы пользователь сразу видел её вверху и мог выбирать порядок.
      selectDeck(result.deck.deckId)
    } else {
      alert('Ошибка: ' + result.error)
    }
  } catch (e) {
    alert('Ошибка загрузки: ' + e.message)
  } finally {
    catalogLoadingDeck.value = ''
  }
}

async function handleCheckUpdates(deckIdArg) {
  try {
    const result = await checkDeckUpdates(deckIdArg)
    if (result.ok) {
      alert(`Обновлено до версии ${result.remoteVersion}`)
    } else if (result.upToDate) {
      alert('Обновлений нет')
    } else if (result.notFound) {
      // v5.5: колода удалена из репо
      alert(result.error)
    } else if (result.structural) {
      alert(`Доступна версия ${result.remoteVersion}, но структура изменилась.\nЭто новая колода — загрузите отдельно из каталога.`)
    } else {
      alert('Ошибка: ' + result.error)
    }
  } catch (e) {
    alert('Ошибка: ' + e.message)
  }
}

function formatCatalogDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
         ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function copyToClipboard(text) {
  if (!text) return
  try {
    navigator.clipboard.writeText(text)
  } catch {
    // Fallback для older browsers
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  // Визуальный feedback — меняем иконку на ✓ на 2 сек
  // (простая версия: alert не нужен, пользователь увидит что кнопка нажалась)
}
let highlightTimer = null

const selectedDeck = computed(() => selectedDeckId.value ? decks.value[selectedDeckId.value] : null)

// ─── QR для НОВОЙ сессии ─────────────────────────────────────
const shareUrl = computed(() => {
  if (!selectedDeckId.value || selectedOrderIndex.value === null || !selectedRole.value) return ''
  return buildShareUrl(selectedDeckId.value, selectedOrderIndex.value, selectedRole.value)
})

// ─── Инфо о сохранённой сессии (для блока "Продолжить") ─────
const savedDeckName = computed(() => deck.value?.name || '—')
const savedOrderName = computed(() => currentOrder.value?.name || '—')
const savedTurn = computed(() => currentTurn.value)
const savedTotalQuestions = computed(() => currentOrder.value?.sequence.length ?? 0)

// ─── QR для ПРОДОЛЖЕНИЯ ──────────────────────────────────────
const continueShareUrl = computed(() => {
  if (!hasSavedSession.value) return ''
  return buildShareUrl(deckId.value, orderIndex.value, role.value, currentTurn.value)
})

// ─── История сессий: сортировка ─────────────────────────────
const sortedSessions = computed(() => {
  return [...sessions.value].sort((a, b) => {
    if (a.id === activeSessionId.value) return -1
    if (b.id === activeSessionId.value) return 1
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  })
})

function sessionDeckName(s) {
  return decks.value[s.deckId]?.name || '—'
}
function sessionOrderName(s) {
  return decks.value[s.deckId]?.orders?.[s.orderIndex]?.name || '—'
}
function sessionTotal(s) {
  return decks.value[s.deckId]?.orders?.[s.orderIndex]?.sequence.length ?? 0
}
// Защитная проверка: сессия завершена, даже если completed=false,
// но currentTurn >= длины последовательности (старый баг или миграция).
function isSessionFinished(s) {
  if (s.completed) return true
  const total = sessionTotal(s)
  return total > 0 && (s.currentTurn || 0) >= total
}
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
         ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

async function generateContinueQr(url) {
  if (!url) { continueQrDataUrl.value = ''; return }
  try {
    continueQrDataUrl.value = await QRCode.toDataURL(url, { width: 256, margin: 1 })
  } catch (e) {
    console.error('Continue QR generation failed:', e)
    continueQrDataUrl.value = ''
  }
}

watch(shareUrl, async (url) => {
  if (!url) { qrDataUrl.value = ''; return }
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, { width: 256, margin: 1 })
  } catch (e) {
    console.error('QR generation failed:', e)
    qrDataUrl.value = ''
  }
}, { immediate: false })

watch([hasSavedSession, continueShareUrl], ([has, url]) => {
  if (has) generateContinueQr(url)
  else continueQrDataUrl.value = ''
}, { immediate: true })

onMounted(() => {
  // First-time user (no sessions): по умолчанию открываем форму
  if (sessions.value.length === 0) {
    showNewForm.value = true
  }
  // Share URL: предзаполняем форму и открываем её
  const parsed = parseShareUrl(route.query)
  if (parsed) {
    shareParams.value = parsed
    selectedDeckId.value = parsed.deck
    selectedOrderIndex.value = parsed.order
    selectedRole.value = parsed.role
    showNewForm.value = true
    // v5.6: колода уже выбрана — каталог коллапсируем (без скролла, без анимации,
    // пользователь только зашёл и должен сразу видеть шаг 2/3).
    isDeckCatalogExpanded.value = false
    // v5.7: порядок и роль тоже предзаполнены — коллапсируем и их.
    isOrderExpanded.value = false
    isRoleExpanded.value = false
  }
  // v5.5: авто-загрузка каталога — каталог виден сразу при открытии формы.
  ensureCatalogLoaded()
})

function selectDeck(dId) {
  selectedDeckId.value = dId
  selectedOrderIndex.value = null
  selectedRole.value = null
  // v5.6: коллапсируем каталог в плашку, плавно скроллим к шагу 2.
  isDeckCatalogExpanded.value = false
  // v5.7: пользователь сменил колоду — шаги 2 и 3 разворачиваем (старый выбор невалиден).
  isOrderExpanded.value = true
  isRoleExpanded.value = true
  nextTick(() => {
    step2Ref.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

// v5.6: разворачиваем каталог обратно (кнопка «Сменить» на плашке).
// Состояние selectedDeckId НЕ сбрасываем — пользователь просто хочет выбрать
// другую колоду; текущая остаётся выделенной как fallback, пока он не кликнет новую.
function expandCatalog() {
  isDeckCatalogExpanded.value = true
}

function selectOrder(index) {
  selectedOrderIndex.value = index
  // v5.7: сбрасываем выбор роли (логическая несогласованность — порядок поменялся).
  selectedRole.value = null
  // Если роль уже была выбрана до этого — разворачиваем её обратно (пользователь только что сменил порядок).
  isRoleExpanded.value = true
  // v5.7: коллапсируем шаг 2 в плашку, плавно скроллим к шагу 3.
  isOrderExpanded.value = false
  nextTick(() => {
    step3Ref.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function expandOrder() {
  isOrderExpanded.value = true
}

function selectRole(r) {
  selectedRole.value = r
  // v5.7: коллапсируем шаг 3 в плашку, плавно скроллим к кнопке «Начать сессию».
  isRoleExpanded.value = false
  nextTick(() => {
    startButtonRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function expandRole() {
  isRoleExpanded.value = true
}

// v5.7: копирование share-ссылки с визуальным feedback (✓ на 2 сек).
function handleCopyLink() {
  if (!shareUrl.value) return
  copyToClipboard(shareUrl.value)
  linkCopiedRef.value = true
  if (linkCopiedTimer) clearTimeout(linkCopiedTimer)
  linkCopiedTimer = setTimeout(() => {
    linkCopiedRef.value = false
    linkCopiedTimer = null
  }, 2000)
}

function enterNewForm() {
  // Просто переключаем режим, не трогая активную сессию.
  // Старая активная сессия остаётся в истории как in-progress.
  showNewForm.value = true
  // Сбрасываем форму, чтобы пользователь видел чистый выбор.
  selectedDeckId.value = null
  selectedOrderIndex.value = null
  selectedRole.value = null
  shareParams.value = null
  // v5.6: каталог разворачиваем (форма открыта заново — пользователь выбирает с нуля).
  isDeckCatalogExpanded.value = true
  // v5.7: шаги 2 и 3 тоже разворачиваем.
  isOrderExpanded.value = true
  isRoleExpanded.value = true
  // v5.5: подгружаем каталог, если ещё не загружен (для случая, когда форма
  // открывается кнопкой «Новая сессия», а не при первом заходе).
  ensureCatalogLoaded()
}

function exitNewForm() {
  showNewForm.value = false
}

function startGame() {
  const turn = shareParams.value?.turn
  startSession(
    selectedDeckId.value,
    selectedOrderIndex.value,
    selectedRole.value,
    typeof turn === 'number' ? turn : 0
  )
  // Очищаем shareParams после использования, чтобы при следующем
  // ручном старте без share-ссылки не применялся старый turn.
  shareParams.value = null
  router.push('/game')
}

function continueSession() { router.push('/game') }

function openSession(id) {
  if (loadSession(id)) {
    router.push('/game')
  }
}

function restartCompletedSession(s) {
  startSession(s.deckId, s.orderIndex, s.role)
  router.push('/game')
}

function confirmDeleteSession(id) {
  const s = sessions.value.find(x => x.id === id)
  if (!s) return
  const name = s.name || `${sessionDeckName(s)} • порядок ${sessionOrderName(s)}`
  if (confirm(`Удалить сессию "${name}" из истории?`)) {
    deleteSession(id)
    // Если удаляли редактируемую — сброс
    if (renamingSessionId.value === id) cancelRename()
  }
}

// v5.0: переименование сессии — inline input появляется под карточкой
function startRename(s) {
  renamingSessionId.value = s.id
  renamingValue.value = s.name || ''
}

function saveRename() {
  if (!renamingSessionId.value) return
  const id = renamingSessionId.value
  const trimmed = renamingValue.value.trim().slice(0, 128)
  renameSession(id, trimmed || null)
  renamingSessionId.value = null
  renamingValue.value = ''
}

function cancelRename() {
  renamingSessionId.value = null
  renamingValue.value = ''
}

// Экспорт конкретной сессии по id. Имя файла формируется в useDeck:
// coffee-cards-<deckId>-<orderLetter>-<YYYY-MM-DD>.json
function handleExportSession(id) {
  exportSession(id)
}

async function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return
  try {
    const newId = await importState(file)
    // Подсветка новой записи на 2 секунды
    highlightedSessionId.value = newId
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => {
      highlightedSessionId.value = null
      highlightTimer = null
    }, 2000)
    alert('Сессия добавлена в историю')
    // НЕ переходим в /game — пользователь откроет импортированную через «Открыть»
  } catch (error) {
    alert('Ошибка импорта: ' + error.message)
  }
  event.target.value = ''
}

// ─── v5.1: Управление кастомными колодами ─────────────────────

async function handleImportDeck(event) {
  const file = event.target.files[0]
  if (!file) return
  try {
    const text = await file.text()
    const deckData = JSON.parse(text)
    // v5.4: sourcePath = file.name (только имя, без пути)
    const result = importDeck(deckData, { sourcePath: file.name })
    if (result.ok) {
      alert(`Колода "${result.deck.name}" загружена (${result.deck.questions.length} вопросов)`)
    } else {
      alert('Ошибка: ' + result.error)
    }
  } catch (error) {
    alert('Ошибка чтения файла: ' + error.message)
  }
  event.target.value = ''
}

function handleExportDeck(deckIdArg) {
  exportDeck(deckIdArg)
}

function handleDeleteDeck(deckIdArg) {
  if (deleteDeck(deckIdArg)) {
    // Если удалили колоду, которая была выбрана — сброс
    if (selectedDeckId.value === deckIdArg) {
      selectedDeckId.value = null
      selectedOrderIndex.value = null
      selectedRole.value = null
    }
  }
}

// ─── v5.1: Полный бэкап ────────────────────────────────────────

function handleExportBackup() {
  exportBackup()
}

async function handleImportBackup(event) {
  const file = event.target.files[0]
  if (!file) return
  try {
    const result = await importBackup(file)
    alert(`Бэкап восстановлен: ${result.sessionsAdded} сессий, ${result.decksAdded} колод загружено` +
      (result.decksSkipped > 0 ? `, ${result.decksSkipped} пропущено` : ''))
  } catch (error) {
    alert('Ошибка восстановления: ' + error.message)
  }
  event.target.value = ''
}
</script>
