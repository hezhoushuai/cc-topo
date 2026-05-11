import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { loadTopologyData } from './mock/mockData';
import { loadDeviceTypes } from './data/deviceTypes';
import { refreshSelectableDevices } from './data/devices';
import { setupProdMockServer } from './mock/prodServer';

async function bootstrap(): Promise<void> {
  try {
    // 类型定义和拓扑数据都从 /data/*.json 加载，两者无依赖关系，可并行
    await Promise.all([loadDeviceTypes(), loadTopologyData()]);
  } catch (err) {
    console.error('[bootstrap] 加载配置 JSON 失败：', err);
  }
  refreshSelectableDevices();
  setupProdMockServer();
  createApp(App).mount('#app');
}

bootstrap();
