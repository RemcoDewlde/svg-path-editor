import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // This repo intentionally uses effects for UI sync and debug tooling.
      'react-hooks/set-state-in-effect': 'off',
      // This editor uses refs heavily (SVG DOM, monaco, etc.). Keep this as warnings.
      'react-hooks/refs': 'warn',
      // We create stable IDs for SVG nodes; Date.now is fine in event handlers.
      'react-hooks/purity': 'warn',
    },
  },
])
