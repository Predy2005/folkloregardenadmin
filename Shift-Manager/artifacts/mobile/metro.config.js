const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// pnpm workspace fix: getDefaultConfig nastaví projectRoot na "." (relativní),
// což v některých Expo CLI cestách (zejména expo-router require.context)
// vede k resolution z workspace root (Shift-Manager/) místo z mobile dir.
// Explicitní absolutní cesta to opravuje.
const config = getDefaultConfig(__dirname);
config.projectRoot = __dirname;

// Workspace root pro watch (pnpm má hoisted node_modules nahoře).
config.watchFolders = [
  __dirname,
  path.resolve(__dirname, "../.."),
];

module.exports = config;
