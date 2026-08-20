const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    path.resolve(__dirname, '../shared')
  ],
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName.startsWith('@shared/')) {
        const sharedPath = moduleName.replace('@shared/', '');
        const absolutePath = path.resolve(__dirname, '../shared', sharedPath);
        return context.resolveRequest(context, absolutePath, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    }
  }
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
