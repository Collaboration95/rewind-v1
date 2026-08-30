const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const domainRoot = path.resolve(projectRoot, '../../packages/domain');
const config = getDefaultConfig(projectRoot);

// The local adapter reuses the framework-free domain fixture and types. Keep
// that package outside the app bundle while explicitly making it resolvable by
// Metro; no other workspace directory is made available to the client bundle.
config.watchFolders = [domainRoot];

module.exports = config;
