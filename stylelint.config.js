export default {
  root: true,
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-css-modules',
    'stylelint-config-recess-order',
    'stylelint-config-recommended-vue',
  ],
  plugins: ['stylelint-scss', 'stylelint-order'],
  overrides: [
    {
      files: ['**/*.scss'],
      customSyntax: 'postcss-scss',
    },
    {
      files: ['**/*.html', 'index.html'],
      customSyntax: 'postcss-html',
    },
  ],
  rules: {
    'alpha-value-notation': 'number',
    'at-rule-no-unknown': null,
    'block-no-empty': [true, { severity: 'warning' }],
    'color-function-notation': 'legacy',
    'color-hex-length': 'short',
    'function-no-unknown': [
      true,
      {
        ignoreFunctions: ['breakpoint', 'font-size', 'theme', 'rpx', 'v-bind'],
      },
    ],
    'length-zero-no-unit': true,
    'no-descending-specificity': null,
    'scss/at-rule-no-unknown': true,
    'scss/comment-no-empty': [true, { severity: 'warning' }],
    'scss/double-slash-comment-empty-line-before': null,
    'scss/dollar-variable-pattern': null,
    'selector-class-pattern': [
      /^(?!:)([a-z][a-zA-Z0-9]+|[a-z])$/,
      {
        resolveNestedSelectors: true,
        message: 'セレクタは小文字で始まるキャメルケースにしてください',
      },
    ],
    'shorthand-property-no-redundant-values': true,
    'value-keyword-case': 'lower',
    'value-no-vendor-prefix': null,
  },
};
