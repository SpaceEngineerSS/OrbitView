import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party vendor files
    "public/cesium/**",
  ]),
  // Rule overrides for pragmatic development
  {
    rules: {
      // TypeScript - relax strict rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-this-alias": "warn",

      // React Hooks - relax strict rules
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",

      // Disable very strict React hooks rules from eslint-config-next
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/local-memoize": "off",

      // Disable React Compiler rules entirely (Next.js 16 new rules)
      "@react-compiler/lint": "off",

      // React - relax display name and entity rules
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",

      // Preferences
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
