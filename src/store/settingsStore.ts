'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CardBackStyle = 'classic-blue' | 'crimson-ruby' | 'midnight-dragon' | 'emerald-forest';
export type TableThemeStyle = 'classic-green' | 'royal-burgundy' | 'midnight-blue' | 'noir-black' | 'vintage-wood' | 'cyberpunk-neon' | 'marble-highroller' | 'obsidian-hex' | 'abyssal-carbon' | 'crimson-shadow';

interface SettingsStore {
  cardBack: CardBackStyle;
  tableTheme: TableThemeStyle;
  setCardBack: (style: CardBackStyle) => void;
  setTableTheme: (style: TableThemeStyle) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      cardBack: 'classic-blue',
      tableTheme: 'noir-black', // default dark classic table
      setCardBack: (style) => set({ cardBack: style }),
      setTableTheme: (style) => set({ tableTheme: style }),
    }),
    {
      name: 'khoti-settings', // name of the item in the storage (must be unique)
    }
  )
);
