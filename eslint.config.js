import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "backend/repos/**",   // cloned third-party repos – not our code
      "tailwind.config.ts", // uses require() intentionally for plugins
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // shadcn UI auto-generated files use `any` in layout helpers — warn only
      "@typescript-eslint/no-explicit-any": "warn",
      // shadcn empty interfaces are intentional extension points — warn only
      "@typescript-eslint/no-empty-object-type": "warn",
      // empty catch blocks are used intentionally for resilience
      "no-empty": ["error", { "allowEmptyCatch": true }],
    },
  },
);
