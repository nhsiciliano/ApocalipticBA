// Metro de la app mobile. Ver docs/decisions/ADR-008 para el porqué de cada ajuste.
const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// `three` no expone ./package.json en `exports`: se parte del entry CommonJS (build/three.cjs).
const threeDir = path.resolve(path.dirname(require.resolve('three')), '..');

// Todo `three` apunta al build WebGPU: así hay una sola copia de las clases base en el bundle,
// incluso para los imports de `three` que hacen librerías de terceros (React Three Fiber).
const threeAliases = {
  three: 'build/three.webgpu.js',
  'three/webgpu': 'build/three.webgpu.js',
  'three/tsl': 'build/three.tsl.js',
};
const THREE_ADDONS_PREFIX = 'three/addons/';

/** @type {NonNullable<import('expo/metro-config').MetroConfig['resolver']>['resolveRequest']} */
const resolveRequest = (context, moduleName, platform) => {
  const alias = threeAliases[moduleName];
  if (alias) {
    return { type: 'sourceFile', filePath: path.join(threeDir, alias) };
  }

  if (moduleName.startsWith(THREE_ADDONS_PREFIX)) {
    const addon = moduleName.slice(THREE_ADDONS_PREFIX.length);
    const file = addon.endsWith('.js') ? addon : `${addon}.js`;
    return { type: 'sourceFile', filePath: path.join(threeDir, 'examples/jsm', file) };
  }

  // R3F publica un bundle nativo (campo `react-native`) atado a WebGLRenderer. Para WebGPU
  // hace falta el bundle web: se elige por `mainFields` en lugar de parchear el package.json.
  if (moduleName === '@react-three/fiber' && platform !== 'web') {
    return context.resolveRequest(
      { ...context, mainFields: ['module'], unstable_conditionNames: ['module'] },
      moduleName,
      platform,
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.resolveRequest = resolveRequest;
config.resolver.assetExts = [...config.resolver.assetExts, 'glb', 'gltf', 'bin', 'hdr'];

module.exports = config;
