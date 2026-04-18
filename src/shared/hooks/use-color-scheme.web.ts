import { useEffect, useState, useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { SettingsContext } from '../context/SettingsContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const colorScheme = useRNColorScheme();
  const context = useContext(SettingsContext);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return 'light';
  }

  if (!context || context.theme === 'system') {
    return colorScheme ?? 'light';
  }

  return context.theme;
}
