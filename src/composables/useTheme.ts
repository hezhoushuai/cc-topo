import { computed, ref, watch } from 'vue';

export type ThemeMode = 'dark' | 'light';

const LOCAL_STORAGE_KEY = 'topo-theme';

const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY) as ThemeMode | null;
const currentMode = ref<ThemeMode>(savedTheme || 'dark');

export function useTheme() {
  const isDark = computed(() => currentMode.value === 'dark');
  const isLight = computed(() => currentMode.value === 'light');

  function toggleTheme(): void {
    currentMode.value = currentMode.value === 'dark' ? 'light' : 'dark';
  }

  function setTheme(mode: ThemeMode): void {
    currentMode.value = mode;
  }

  // 监听主题变化，更新 localStorage 和 body class
  watch(
    currentMode,
    (mode) => {
      localStorage.setItem(LOCAL_STORAGE_KEY, mode);
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(mode);
    },
    { immediate: true },
  );

  return {
    currentMode,
    isDark,
    isLight,
    toggleTheme,
    setTheme,
  };
}
