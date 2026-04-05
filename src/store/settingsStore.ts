'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CardBackStyle = 'classic-blue' | 'crimson-ruby' | 'midnight-dragon' | 'emerald-forest';

interface SettingsStore {
  cardBack: CardBackStyle;
  setCardBack: (style: CardBackStyle) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      cardBack: 'classic-blue',
      setCardBack: (style) => set({ cardBack: style }),
    }),
    {
      name: 'khoti-settings', // name of the item in the storage (must be unique)
    }
  )
);
