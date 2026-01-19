export default {
  multipass: true,

  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          cleanupIds: false,
          removeViewBox: false,
          removeHiddenElems: false,
          removeUnknownsAndDefaults: false,
        },
      },
    },
  ],
};
