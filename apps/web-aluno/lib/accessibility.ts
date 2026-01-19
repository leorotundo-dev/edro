export type AccessibilitySettings = {
  mode?: 'default' | 'tdah' | 'dislexia' | 'baixa-visao' | 'ansiedade';
  tts_voice?: string | null;
  tts_speed?: number;
  stt_language?: string;
  font_size?: 'sm' | 'md' | 'lg' | 'xl';
  contrast_mode?: 'normal' | 'high';
  motion_reduced?: boolean;
};

const STORAGE_KEY = 'accessibility_settings';

export function applyAccessibilitySettings(settings: AccessibilitySettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-accessibility-mode', settings.mode ?? 'default');
  root.setAttribute('data-accessibility-font', settings.font_size ?? 'md');
  root.setAttribute('data-accessibility-contrast', settings.contrast_mode ?? 'normal');
  root.setAttribute(
    'data-accessibility-motion',
    settings.motion_reduced ? 'reduced' : 'full'
  );
}

export function readStoredAccessibility(): AccessibilitySettings | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AccessibilitySettings;
  } catch {
    return null;
  }
}

export function storeAccessibilitySettings(settings: AccessibilitySettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
