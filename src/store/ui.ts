import { reactive } from 'vue';

export interface PortContext {
  deviceId: string;
  nicId: string;
  isCenter?: boolean;
}

export const portMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  deviceId: '',
  nicId: '',
  isCenter: false,
});

export const detailPanel = reactive({
  visible: false,
  deviceId: '',
  nicId: '',
});

export const configDialog = reactive({
  visible: false,
  deviceId: '',
  nicId: '',
});

export const addDeviceDialog = reactive({
  visible: false,
  deviceId: '',
  nicId: '',
});

export function openPortMenu(x: number, y: number, ctx: PortContext): void {
  portMenu.x = x;
  portMenu.y = y;
  portMenu.deviceId = ctx.deviceId;
  portMenu.nicId = ctx.nicId;
  portMenu.isCenter = ctx.isCenter ?? false;
  portMenu.visible = true;
}

export function closePortMenu(): void {
  portMenu.visible = false;
}

export function openDetailPanel(ctx: PortContext): void {
  detailPanel.deviceId = ctx.deviceId;
  detailPanel.nicId = ctx.nicId;
  detailPanel.visible = true;
}

export function closeDetailPanel(): void {
  detailPanel.visible = false;
}

export function openConfigDialog(ctx: PortContext): void {
  configDialog.deviceId = ctx.deviceId;
  configDialog.nicId = ctx.nicId;
  configDialog.visible = true;
}

export function closeConfigDialog(): void {
  configDialog.visible = false;
}

export function openAddDeviceDialog(ctx: PortContext): void {
  addDeviceDialog.deviceId = ctx.deviceId;
  addDeviceDialog.nicId = ctx.nicId;
  addDeviceDialog.visible = true;
}

export function closeAddDeviceDialog(): void {
  addDeviceDialog.visible = false;
}
