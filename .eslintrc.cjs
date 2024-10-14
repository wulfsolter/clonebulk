module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: 'airbnb-base',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'key-spacing': ['error', { align: 'value' }],
    'import/no-relative-packages': 'off',
    'import/extensions': [
      'error',
      {
        js: 'ignorePackages',
      },
    ],
    'max-len': [
      2, // This rule calculates the length of a line via code points, not characters. That means if you use a double-byte character in your code, it will count as 2 code points instead of 1, and 2 will be used to calculate line length.
      400, // max line length
      2, // tab size
      { ignoreUrls: true },
    ],
  },
};
