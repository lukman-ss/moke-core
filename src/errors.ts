export class AsyncProviderResolutionError extends Error {
  constructor(tokenKey: any) {
    super(`Cannot synchronously resolve async provider for token: ${String(tokenKey)}. Use resolveAsync() instead.`);
    this.name = 'AsyncProviderResolutionError';
  }
}
