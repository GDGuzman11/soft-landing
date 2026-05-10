---
name: Static asset imports in Vitest (jpg/png in screen files)
description: How vitest.config.ts intercepts binary asset require()/import calls so node doesn't choke on the binary
type: feedback
---

Expo screens use `require('../../assets/images/foo.jpg')` (Metro bundler convention). In Vitest (node env) those resolve to the actual JPG file, which Node tries to parse as JS → "SyntaxError: Invalid or unexpected token".

`vi.mock('path/to.jpg', ...)` does NOT intercept `require()` calls inside transformed source — it only intercepts ESM imports, and only when the path string matches verbatim from the test file's perspective.

The fix lives in `vitest.config.ts`: a custom `assetStubPlugin()` does two things:
1. `resolveId` + `load` for ESM imports of asset files → stubs them to `export default 0`
2. A `transform` step that source-rewrites every `require('*.jpg')` (and other binary extensions) to the literal `0` *before* the file is parsed. This handles the CJS/`require()` case which the resolver alone cannot.

The matching extensions: jpg, jpeg, png, gif, webp, svg.

**Why:** Without the transform step, `require()` calls in screen files reach Node's native CommonJS loader which has no plugin hooks, and the binary file blows up the parser.

**How to apply:** When testing any screen that loads images, no per-file mocking needed — the plugin handles it globally. If a new asset extension shows up, add it to both regexes in the plugin.
