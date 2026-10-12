import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser },
    plugins: { 'react-refresh': reactRefresh },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Exportan el provider y su hook juntos a propósito
    files: ['src/hooks/useAuth.tsx', 'src/hooks/useConfirm.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['e2e/**', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
