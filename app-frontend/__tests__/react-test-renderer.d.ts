/**
 * Minimal ambient module declaration for `react-test-renderer`.
 *
 * The package ships without bundled types and `@types/react-test-renderer`
 * is not installed in this project. We only use a thin slice of the API in
 * Vitest tests (create / act / ReactTestRenderer / ReactTestInstance and the
 * findAll predicate), so we declare just what the test files consume.
 *
 * The default export is typed as a namespace-style object so that
 * `import TestRenderer from 'react-test-renderer'` followed by
 * `TestRenderer.ReactTestInstance` (used as a type) resolves correctly.
 *
 * Owned by: tester. Do not import this from production code.
 */
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react'

  namespace TestRenderer {
    interface ReactTestInstance {
      type: string | { displayName?: string; name?: string }
      props: Record<string, unknown>
      parent: ReactTestInstance | null
      children: Array<ReactTestInstance | string>
      instance: unknown
      findAll(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[]
      find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance
      findByType(type: unknown): ReactTestInstance
      findAllByType(type: unknown): ReactTestInstance[]
      findByProps(props: Record<string, unknown>): ReactTestInstance
      findAllByProps(props: Record<string, unknown>): ReactTestInstance[]
    }

    interface ReactTestRendererJSON {
      type: string
      props: Record<string, unknown>
      children: null | Array<ReactTestRendererJSON | string>
    }

    interface ReactTestRenderer {
      root: ReactTestInstance
      toJSON(): ReactTestRendererJSON | ReactTestRendererJSON[] | null
      toTree(): unknown
      update(element: ReactElement): void
      unmount(): void
      getInstance(): unknown
    }

    interface TestRendererOptions {
      createNodeMock?: (element: ReactElement) => unknown
    }

    function create(
      element: ReactElement,
      options?: TestRendererOptions,
    ): ReactTestRenderer

    function act(callback: () => void | Promise<void>): Promise<void> | void
  }

  export = TestRenderer
}
