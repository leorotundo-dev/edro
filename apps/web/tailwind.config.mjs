import { heroui } from '@heroui/react';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceThemePresetPath = path.join(__dirname, '../../packages/theme/tailwind-preset.js');
const bundledThemePresetPath = path.join(__dirname, './vendor/@edro/theme/tailwind-preset.js');
const themePresetModule = await import(existsSync(workspaceThemePresetPath) ? workspaceThemePresetPath : bundledThemePresetPath);
const themePreset = themePresetModule.default ?? themePresetModule;

/** @type {import('tailwindcss').Config} */
export default {
  presets: [themePreset],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./vendor/@edro/ui/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
    "../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {}
  },
  darkMode: "class",
  plugins: [heroui()]
};
