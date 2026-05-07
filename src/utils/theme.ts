import type { DeviceType } from '../types/topology';

export interface TypeTheme {
  label: string;
  primary: string;
  primaryLight: string;
  border: string;
  background: string;
  iconBg: string;
  iconBorder: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
}

function makeTheme(label: string, rgb: [number, number, number]): TypeTheme {
  const [r, g, b] = rgb;
  const lr = Math.min(255, r + 50);
  const lg = Math.min(255, g + 50);
  const lb = Math.min(255, b + 50);
  return {
    label,
    primary: `rgb(${r}, ${g}, ${b})`,
    primaryLight: `rgb(${lr}, ${lg}, ${lb})`,
    border: `rgba(${r}, ${g}, ${b}, 0.55)`,
    background: `linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(${r},${g},${b},0.10) 55%, rgba(2,6,23,0.96) 100%)`,
    iconBg: `rgba(${r}, ${g}, ${b}, 0.18)`,
    iconBorder: `rgba(${r}, ${g}, ${b}, 0.5)`,
    glow: `rgba(${r}, ${g}, ${b}, 0.32)`,
    badgeBg: `rgba(${r}, ${g}, ${b}, 0.16)`,
    badgeText: `rgb(${lr}, ${lg}, ${lb})`,
  };
}

export const TYPE_THEME: Record<DeviceType, TypeTheme> = {
  workstation: makeTheme('工作站', [59, 130, 246]),
  laptop:      makeTheme('笔记本', [99, 102, 241]),
  server:      makeTheme('服务器', [139, 92, 246]),
  switch:      makeTheme('交换机', [6, 182, 212]),
  router:      makeTheme('路由器', [20, 184, 166]),
  ap:          makeTheme('无线 AP', [245, 158, 11]),
  phone:       makeTheme('手机', [217, 70, 239]),
  tablet:      makeTheme('平板', [236, 72, 153]),
  printer:     makeTheme('打印机', [148, 163, 184]),
  nas:         makeTheme('NAS', [16, 185, 129]),
  firewall:    makeTheme('防火墙', [244, 63, 94]),
};
