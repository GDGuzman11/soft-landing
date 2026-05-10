import { defineConfig, type Plugin } from 'vitest/config'
import path from 'path'

/**
 * Intercept binary asset imports (.jpg / .png / etc.) so Vitest doesn't try
 * to evaluate the file as JavaScript. Metro handles these at runtime; in the
 * Vitest Node environment we substitute a numeric stub matching what Metro
 * normally returns from `require('./image.png')`.
 */
function assetStubPlugin(): Plugin {
  const ASSET_RE = /\.(jpg|jpeg|png|gif|webp|svg)$/
  // Matches both `require('./foo.png')` and `import x from './foo.png'`
  const REQUIRE_ASSET_RE = /require\(\s*(['"])([^'"]+\.(?:jpg|jpeg|png|gif|webp|svg))\1\s*\)/g
  return {
    name: 'soft-landing:asset-stub',
    enforce: 'pre',
    resolveId(source) {
      if (ASSET_RE.test(source)) return '\0asset-stub:' + source
      return null
    },
    load(id) {
      if (id.startsWith('\0asset-stub:')) return 'export default 0; module.exports = 0;'
      return null
    },
    transform(code, id) {
      // Skip node_modules and the stub itself.
      if (id.includes('node_modules') || id.startsWith('\0')) return null
      if (!REQUIRE_ASSET_RE.test(code)) return null
      // Reset regex state and replace each `require('*.jpg')` with `0`.
      REQUIRE_ASSET_RE.lastIndex = 0
      const replaced = code.replace(REQUIRE_ASSET_RE, '0')
      return { code: replaced, map: null }
    },
  }
}

export default defineConfig({
  plugins: [assetStubPlugin()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/types/**', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
