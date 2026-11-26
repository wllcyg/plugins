import { createSSRApp, h } from 'vue';
import { createMemoryHistory, createRouter, createWebHistory, RouterView, type RouteRecordRaw } from 'vue-router';
import './style.css';
import App from './App.vue';

export const routes: RouteRecordRaw[] = [
  { path: '/', component: App },
  { path: '/install', component: App },
  { path: '/feedback', component: App },
  { path: '/tools/:toolId', component: App },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

export function createAppRouter(isServer = false) {
  return createRouter({
    history: isServer ? createMemoryHistory(import.meta.env.BASE_URL) : createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior(to, from) {
      if (to.path !== from.path || !to.hash) return false;
      return { el: to.hash };
    }
  });
}

export function createPortalApp(isServer = false) {
  const router = createAppRouter(isServer);
  const app = createSSRApp({ render: () => h(RouterView) });
  app.use(router);
  return { app, router };
}

if (!import.meta.env.SSR) {
  const { app, router } = createPortalApp(false);
  void router.isReady().then(() => app.mount('#app'));
}
