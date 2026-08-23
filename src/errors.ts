export class AsyncProviderResolutionError extends Error {
  constructor(tokenKey: any) {
    const format = (p: any) => typeof p === 'function' ? p.name : String(p);
    super(`Cannot synchronously resolve async provider for token: ${format(tokenKey)}. Use resolveAsync() instead.`);
    this.name = 'AsyncProviderResolutionError';
  }
}

export class CircularDependencyError extends Error {
  constructor(path: any[]) {
    const format = (p: any) => typeof p === 'function' ? p.name : String(p);
    const pathString = path.map(format).join(' -> ');
    super(`Circular dependency detected: ${pathString}`);
    this.name = 'CircularDependencyError';
  }
}

export class InvalidProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProviderError';
  }
}
