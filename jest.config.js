export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 900000, // Set global timeout to accommodate auth tests
  coveragePathIgnorePatterns: [
    "./src/auth/GMAuth.ts", // Add the path to the file you want to exclude
  ],
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          allowJs: true,
        },
        // ts-jest 29.4.10+ bug: creates two TypeScript Programs (ESM + CJS) that each
        // independently load tough-cookie, making CookieJar appear as two unrelated types.
        // Both TS2719 error paths point to the identical file path — confirmed false positive.
        // Remove once ts-jest fixes the dual-Program issue. Build (tsc via rollup) still
        // catches any real version splits independently.
        diagnostics: {
          ignoreCodes: [2719],
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!\\.pnpm|agent-base|http-cookie-agent)",
  ],
};
