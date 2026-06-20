const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const pnpmStore = path.resolve(projectRoot, "node_modules/.pnpm");

const config = getDefaultConfig(projectRoot);

// Enable package.json `exports` field resolution (needed for Firebase 12)
config.resolver.unstable_enablePackageExports = true;

// Prefer react-native > browser > default for package exports
config.resolver.unstable_conditionNames = [
  "react-native",
  "browser",
  "require",
  "default",
];

// Follow pnpm symlinks
config.resolver.unstable_enableSymlinks = true;

// Watch the pnpm virtual store so Metro can transform symlinked files
config.watchFolders = [pnpmStore];

// Tell Metro to also search the pnpm store for modules it can't find
// via the top-level node_modules symlinks
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  pnpmStore,
];

module.exports = config;
