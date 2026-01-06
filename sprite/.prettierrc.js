export default {
  overrides: [
    {
      files: '**/*.tsx',
      options: {
        plugins: ['prettier-plugin-tailwindcss'],
      },
    },
    {
      excludeFiles: '**/package.json',
      files: '**/*.json',
      options: {
        jsonRecursiveSort: true,
        plugins: ['prettier-plugin-sort-json'],
      },
    },
    {
      files: '**/package.json',
      options: {
        plugins: ['prettier-plugin-packagejson'],
        trailingComma: 'none',
      },
    },
  ],
  proseWrap: 'always',
  quoteProps: 'consistent',
  semi: false,
  singleQuote: true,
}
