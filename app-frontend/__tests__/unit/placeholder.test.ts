/**
 * Placeholder test to verify Vitest is configured correctly.
 * Replace with real tests in Phase 1.
 */
describe('Vitest setup', () => {
  it('runs correctly', () => {
    expect(true).toBe(true)
  })

  it('has access to vi globals', () => {
    const mockFn = vi.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })
})
