import { createApp, h } from 'vue';
import { createRouter, createWebHistory, RouterView } from 'vue-router';
import './style.css';
import App from './App.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', component: App }],
  scrollBehavior(to, from) {
    if (to.query.tool !== from.query.tool || !to.hash) return false;
    return { el: to.hash };
  }
});

const app = createApp({ render: () => h(RouterView) });
app.use(router);
void router.isReady().then(() => app.mount('#app'));

