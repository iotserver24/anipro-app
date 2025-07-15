// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver configuration to help with expo-constants and exclude problematic packages
config.resolver = {
  ...config.resolver,
  alias: {
    ...config.resolver.alias,
    'expo-constants': require.resolve('expo-constants'),
  },
  blockList: [
    /node_modules\/react-devtools-core\/.*/,
  ],
};

module.exports = config;
