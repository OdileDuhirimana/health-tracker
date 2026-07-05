// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * The project previously had a `lint` script but no ESLint config at all
 * (and no local ESLint dependency), so `npm run lint` silently fell
 * through to whatever ancient global ESLint happened to be on the
 * developer's PATH and immediately failed with "no configuration found".
 * That made lint unenforceable — precisely the kind of thing that should
 * gate CI but couldn't. This is a standard NestJS/typescript-eslint flat
 * config: recommended type-checked rules, relaxed just enough to match
 * this codebase's existing conventions (which relies on `any` in a few
 * request-shape spots and non-null assertions in places TypeORM's types
 * don't fully capture) rather than requiring an unrelated large-scale
 * rewrite to pass lint for the first time.
 */
export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'coverage/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // This codebase's entity enums (PatientStatus, MedicationStatus, etc.)
      // are frequently compared against string literals or against each
      // other across genuinely-equivalent-but-distinctly-declared enums
      // (e.g. a request DTO's plain string `status` field against an
      // entity's enum column). That pattern is pervasive and pre-existing
      // across ~10 service files; fixing it project-wide is a larger,
      // separate refactor than this pass covers, and enabling this rule at
      // "error" would make lint fail on unrelated pre-existing code rather
      // than catching new regressions.
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      // NestJS's own DI patterns (constructor property shorthand, guard
      // classes calling `reflector.getAllAndOverride` returned by a mock in
      // tests) routinely trip this rule without an actual `this`-binding
      // bug. Downgraded to a warning rather than silenced entirely so it's
      // still visible without failing CI on existing, working code.
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/require-await': 'warn',
    },
  },
);
