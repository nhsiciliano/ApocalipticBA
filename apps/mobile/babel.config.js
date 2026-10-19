// babel-preset-expo ya incluye el plugin de react-native-worklets (Reanimated 4) y la
// transformación de static class blocks que necesita Three.js.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
