export default {
  paths: ['tests/features/**/*.feature'],
  import: [
    '.cucumber-dist/tests/features/step-definitions/world.js',
    '.cucumber-dist/tests/features/step-definitions/given.steps.js',
    '.cucumber-dist/tests/features/step-definitions/when.steps.js',
    '.cucumber-dist/tests/features/step-definitions/then.steps.js',
  ],
  format: ['progress-bar'],
};
