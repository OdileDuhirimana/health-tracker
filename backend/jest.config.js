/**
 * Unit test configuration. Deliberately separate from test/jest-e2e.json:
 * unit tests are colocated with source (`src/**\/*.spec.ts`) and must never
 * require a live database, whereas the e2e suite boots the full Nest
 * application against a real Postgres instance. Keeping the two configs
 * distinct lets `npm test` (fast, no external dependencies) run safely in
 * any environment, including CI stages that haven't provisioned a database
 * yet.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  // Excludes DTOs (pure data shape, validated declaratively by
  // class-validator decorators, not logic to unit test), entities (same —
  // declarative TypeORM metadata), migrations (exercised by the
  // `migration-check` CI job against a real database, not meaningfully
  // unit-testable), seed scripts (dev/CI fixtures, not application logic),
  // and the composition-root files (main.ts, *.module.ts) from the coverage
  // denominator. Including them would dilute the coverage percentage with
  // files that have no meaningful branches to cover, making the number
  // measure less than it appears to.
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.dto.(t|j)s',
    '!**/*.entity.(t|j)s',
    '!**/*.module.(t|j)s',
    '!**/*.spec.(t|j)s',
    '!main.(t|j)s',
    '!migrations/**',
    '!seeds/**',
    '!scripts/**',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  // V8's native coverage instrumentation, not Jest's default "babel"
  // provider. The babel provider instruments source via
  // babel-plugin-istanbul, which delegates file-exclusion matching to
  // `test-exclude` — a package still on its `minimatch@^3` calling
  // convention (`minimatch(file, pattern)` as a callable default export).
  // This repo's package.json pins a root-level `minimatch` override to
  // v10 (for an unrelated security/compat fix elsewhere in the dependency
  // tree), and npm's `overrides` field applies that version transitively
  // to every nested dependency, including `test-exclude`. minimatch v10
  // dropped the callable-default-export shape in favor of named exports
  // only, so `test-exclude` crashes with "minimatch is not a function" the
  // moment coverage instrumentation starts — this is almost certainly why
  // a prior audit found `--coverage` produced no `coverage-summary.json`
  // at all. Switching to the v8 provider sidesteps `test-exclude`/Babel
  // entirely by reading coverage directly from Node's built-in V8 code
  // coverage API, which has no minimatch dependency in this codepath.
  coverageProvider: 'v8',
  testEnvironment: 'node',
  // Enforced, not aspirational: these are the actual `npm run test:cov`
  // numbers measured after adding unit coverage for the 9 previously-
  // untested feature services (statements/lines 51.96%, branches 89.26%,
  // functions 64.23%), each rounded down by 1-2 points to absorb minor
  // future variance without the gate flapping on unrelated changes. The
  // large gap between the branch figure and the statement/line figures is
  // expected, not a bug in this threshold: every controller in `src/modules/**`
  // is still untested (0%) and controllers are mostly thin delegation to
  // services with few conditionals, so they drag down statements/lines far
  // more than branches. Controller coverage is the next gap to close, not
  // something this threshold should paper over by being set low across the
  // board — hence branches is held to a much higher bar (87%) than
  // statements/lines/functions, reflecting that the tested layer (services)
  // is thoroughly branch-covered even though the untested layer
  // (controllers) still dilutes the file-level percentages.
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 87,
      functions: 62,
      lines: 50,
    },
  },
};
