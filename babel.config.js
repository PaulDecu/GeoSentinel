module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      allowUndefined: false,  // ← ajoutez juste ici
    }],
    ['react-native-reanimated/plugin'],
  ],
};