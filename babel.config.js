const presets = [
  [
    '@babel/env',
    {
      targets: {
        node: '10',
      },
      useBuiltIns: 'usage',
    },
  ],
  '@babel/typescript',
];

const plugins = [
  '@babel/plugin-proposal-numeric-separator',
  '@babel/proposal-class-properties',
  '@babel/proposal-object-rest-spread',
];

module.exports = {
  presets,
  plugins,
};