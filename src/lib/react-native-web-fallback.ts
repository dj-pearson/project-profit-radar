// Web fallback for React Native
// This prevents React Native from being bundled in the web build

export const Platform = {
  OS: 'web' as const,
  select: (obj: any) => obj.web || obj.default,
};

export const StyleSheet = {
  create: (styles: any) => styles,
};

export const View = 'div';
export const Text = 'span';
export const TouchableOpacity = 'button';
export const ScrollView = 'div';
export const Image = 'img';

// Stub exports for other common React Native APIs
export const Dimensions = {
  get: () => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }),
};

export const Alert = {
  alert: (title: string, message?: string) => {
    if (typeof window !== 'undefined') {
      window.alert(`${title}${message ? '\n' + message : ''}`);
    }
  },
};

export default {
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
};
