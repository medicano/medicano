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
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    // Arquivos que, por padrão idiomático, co-locam não-componentes:
    // primitivos de UI (variants do cva), providers com seus hooks e a
    // configuração de rotas. A regra react-refresh é apenas DX de Fast Refresh
    // (sem efeito em produção), então é desativada só nesses casos estruturais.
    files: [
      'src/app/components/ui/**/*.{ts,tsx}',
      'src/app/components/StatusBadge.tsx',
      'src/app/components/Toast.tsx',
      'src/app/components/SpecialtyCombobox.tsx',
      'src/app/contexts/**/*.{ts,tsx}',
      'src/app/routes.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
