// Theme 派生自 device-types.json 中每个类型的 color 三元组
import { getTypeDef } from '../data/deviceTypes';

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

export function getTypeTheme(type: string): TypeTheme {
  const def = getTypeDef(type);
  return makeTheme(def.label, def.color);
}
