import { Platform } from 'react-native';

export const colors = Object.freeze({
  surfacePrimary: '#282B4A',
  surfaceSecondary: '#20223B',
  textPrimary: '#EEEBDA',
  textSecondary: 'rgba(238, 235, 218, 0.6)',
  borderSubtle: 'rgba(238, 235, 218, 0.3)',
  statusSuccess: '#A8C6A0',
  statusError: '#E8A39A',
});

export const fonts = Object.freeze({
  mono: Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' }),
  sans: Platform.select({ ios: 'System', android: 'Roboto', web: 'sans-serif' }),
});

export const spacing = Object.freeze({
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  10: 40,
});
