module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/contexts': './src/contexts',
            '@/hooks': './src/hooks',
            '@/services': './src/services',
            '@/utils': './src/utils',
            '@/types': './src/types',
            '@/app': './src/app',
          },
        },
      ],
    ],
  };
};
