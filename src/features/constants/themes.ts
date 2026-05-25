export type ThemeId =
  | 'default'
  | 'cool'
  | 'mono'
  | 'ocean'
  | 'forest'
  | 'sunset'

export interface ThemeSwatch {
  id: ThemeId
  nameKey: string
  primary: string
  secondary: string
  base: string
}

export const THEME_SWATCHES: ThemeSwatch[] = [
  {
    id: 'default',
    nameKey: 'ThemeDefault',
    primary: '#856292',
    secondary: '#ff617f',
    base: '#fbe2ca',
  },
  {
    id: 'cool',
    nameKey: 'ThemeCool',
    primary: '#60a5fa',
    secondary: '#0891b2',
    base: '#eff6ff',
  },
  {
    id: 'mono',
    nameKey: 'ThemeMono',
    primary: '#6b7280',
    secondary: '#4b5563',
    base: '#d1d1d1',
  },
  {
    id: 'ocean',
    nameKey: 'ThemeOcean',
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    base: '#d7eaf7',
  },
  {
    id: 'forest',
    nameKey: 'ThemeForest',
    primary: '#10b981',
    secondary: '#77bc0f',
    base: '#c5fcd5',
  },
  {
    id: 'sunset',
    nameKey: 'ThemeSunset',
    primary: '#f59e0b',
    secondary: '#ee6666',
    base: '#fff2be',
  },
]
