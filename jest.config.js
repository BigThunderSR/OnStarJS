export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 900000, // Set global timeout to accommodate auth tests
  coveragePathIgnorePatterns: [
    "./src/auth/GMAuth.ts", // Add the path to the file you want to exclude
  ],
  transformIgnorePatterns: [
    "node_modules/(?!\\.pnpm|agent-base|http-cookie-agent)",
  ],
};
