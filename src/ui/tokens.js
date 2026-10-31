import { Platform } from 'react-native';

export const colors = Object.freeze({
  deepSpace: '#003049',
  navy: '#002337',
  deepNavy: '#001927',
  brickRed: '#C1121F',
  moltenLava: '#780000',
  steelBlue: '#669BBC',
  steelBlueDeep: '#4A7A9A',
  papayaWhip: '#FDF0D5',
  white: '#FFFFFF',
  
  // Aliases for compatibility
  surfacePrimary: '#002337',
  surfaceSecondary: '#001927',
  textPrimary: '#FDF0D5',
  textSecondary: '#669BBC',
  borderSubtle: '#4A7A9A',
  statusSuccess: '#A8C6A0',
  statusError: '#C1121F',
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
