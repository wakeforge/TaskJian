import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/main' },
  { path: '/main', name: 'main', component: () => import('../views/MainWorkspace.vue') },
  { path: '/archive', name: 'archive', component: () => import('../views/ArchiveView.vue') },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
