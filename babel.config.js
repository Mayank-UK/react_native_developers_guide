/** Expo + Expo Router babel preset (RN has no bespoke babel config of its own). */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
