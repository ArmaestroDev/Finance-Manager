/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#8E1E5E';
const tintColorDark = '#FDF4F8';

export const Colors = {
  light: {
    text: '#1E1B4B',
    textSecondary: '#6B7280',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    primary: '#8E1E5E',
    primaryLight: '#FDF4F8',
    income: '#10B981',
    expense: '#F43F5E',
    border: '#F3F4F6',
  },
  dark: {
    text: '#FDF4F8',
    textSecondary: '#9CA3AF',
    background: '#111827',
    surface: '#1F2937',
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorDark,
    primary: '#FDF4F8', // Lighter for dark mode
    primaryLight: '#8E1E5E', // Darker for dark mode
    income: '#10B981', // Keep semantic colors consistent or slightly muted
    expense: '#F43F5E',
    border: '#374151',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
