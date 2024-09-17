import { createRouter, createWebHistory } from 'vue-router';
import CheckoutSwitcher from '../views/CheckoutSwitcher.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:catchAll(.*)',
      name: 'checkout-switcher',
      component: CheckoutSwitcher,
    },
  ],
});

export default router;
