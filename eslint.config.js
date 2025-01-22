/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...require('@js-toolkit/configs/eslint/common'),
  ...require('@js-toolkit/configs/eslint/web'),
];
