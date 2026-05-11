import { createProdMockServer } from 'vite-plugin-mock/client';
import mocks from './index';

export function setupProdMockServer(): void {
  createProdMockServer(mocks);
}
