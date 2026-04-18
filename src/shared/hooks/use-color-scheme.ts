import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';

export function useColorScheme() {
  const nativeColorScheme = useNativeColorScheme();
  const context = useContext(SettingsContext);
  
  if (!context || context.theme === 'system') {
    return nativeColorScheme;
  }
  
  return context.theme;
}
