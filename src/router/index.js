import { createRouter, createWebHistory } from 'vue-router'
import SetupView from '@/views/SetupView.vue'
import GameView from '@/views/GameView.vue'

const routes = [
  { path: '/', name: 'setup', component: SetupView },
  {
    path: '/game',
    name: 'game',
    component: GameView,
    beforeEnter: () => {
      // Нельзя зайти в игру без активной сессии.
      // Проверяем по activeSessionId и наличию записи в sessions.
      // v6.0: в solo mode role не нужна (mode='solo' → role может быть null).
      try {
        const activeId = localStorage.getItem('coffee_active_session_id')
        if (!activeId) return { name: 'setup' }
        const sessions = JSON.parse(localStorage.getItem('coffee_sessions') || '[]')
        const s = sessions.find(x => x.id === activeId)
        if (!s || s.completed) return { name: 'setup' }
        if (!s.deckId || s.orderIndex === null || s.orderIndex === undefined) {
          return { name: 'setup' }
        }
        // role нужен только в duo mode (solo работает без роли)
        const sessionMode = s.mode || 'duo'  // fallback для старых сессий
        if (sessionMode === 'duo' && !s.role) {
          return { name: 'setup' }
        }
      } catch {
        return { name: 'setup' }
      }
    }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
