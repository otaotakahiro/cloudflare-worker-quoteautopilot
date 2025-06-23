import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from '../Component/App.vue';
import UploadPage from '../Page/UploadPage.vue';
import ResultsPage from '../Page/ResultsPage.vue';

/**
 * ルーター設定
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'upload',
      component: UploadPage
    },
    {
      path: '/results/:invoiceId',
      name: 'results',
      component: ResultsPage,
      props: true
    }
  ]
});

/**
 * Vue.jsアプリケーションの初期化
 */
const app = createApp(App);
app.use(router);
app.mount('#app');
