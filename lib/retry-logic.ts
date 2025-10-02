export const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  return await fn()
}