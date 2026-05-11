import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { setupProdMockServer } from './mock/prodServer';

// 拦截 XHR 请求，开发和生产环境均使用 mock 数据
setupProdMockServer();

createApp(App).mount('#app');
