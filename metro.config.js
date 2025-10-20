const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add support for TypeScript and JSX
config.resolver.sourceExts.push('tsx', 'ts', 'jsx', 'js');

// Add support for web extensions
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configure transformer for React Native Web compatibility
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
};

// Add alias support for src directory
config.resolver.alias = {
  '@': './src',
};

module.exports = withNativeWind(config, { input: './src/styles/global.css' });
