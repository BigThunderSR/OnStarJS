import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json" with { type: "json" };
import resolve from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import { builtinModules } from "module";

export default {
  input: "src/index.ts",
  plugins: [
    json(),
    resolve(),
    commonJS({ esmExternals: true }),
    typescript({
      tsconfig: "./tsconfig.json",
      declarationDir: "dist", // Added for compatibility with @rollup/plugin-typescript 12.1.1
    }),
  ],
  output: [
    { file: pkg.main, format: "cjs", exports: "named" },
    { file: pkg.module, format: "esm" },
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...builtinModules,
  ],
};
