export class MokeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MokeError';
  }
}

export class UnknownProviderError extends MokeError {
  constructor(tokenKey: unknown, index?: number, targetName?: string) {
    const key = typeof tokenKey === 'function' ? tokenKey.name : String(tokenKey);
    let msg = `Cannot resolve dependency for token: ${key}.`;
    if (index !== undefined && targetName) {
      msg = `Cannot resolve constructor dependency at index ${index} for ${targetName}. Type is unknown or an interface. Use @Inject().`;
    }
    super(msg, 'MOKE_DI_UNKNOWN_PROVIDER');
    this.name = 'UnknownProviderError';
  }
}

export class CircularDependencyError extends MokeError {
  constructor(path: unknown[]) {
    const format = (p: unknown) => typeof p === 'function' ? p.name : String(p);
    const pathString = path.map(format).join(' -> ');
    super(`Circular dependency detected: ${pathString}`, 'MOKE_DI_CIRCULAR_DEPENDENCY');
    this.name = 'CircularDependencyError';
  }
}

export class DuplicateProviderError extends MokeError {
  constructor(tokenKey: unknown) {
    const format = (p: unknown) => typeof p === 'function' ? p.name : String(p);
    super(`Provider already registered for ${format(tokenKey)}. Use override() to replace it explicitly.`, 'MOKE_DI_DUPLICATE_PROVIDER');
    this.name = 'DuplicateProviderError';
  }
}

export class InvalidProviderError extends MokeError {
  constructor(message: string) {
    super(message, 'MOKE_DI_INVALID_PROVIDER');
    this.name = 'InvalidProviderError';
  }
}

export class AsyncProviderResolutionError extends MokeError {
  constructor(tokenKey: unknown) {
    const format = (p: unknown) => typeof p === 'function' ? p.name : String(p);
    super(`Cannot synchronously resolve async provider for token: ${format(tokenKey)}. Use resolveAsync() instead.`, 'MOKE_DI_ASYNC_PROVIDER_SYNC_RESOLUTION');
    this.name = 'AsyncProviderResolutionError';
  }
}

export class MokeCircularModuleError extends MokeError {
  constructor(path: unknown[]) {
    const format = (p: unknown) => typeof p === 'function' ? p.name : String(p);
    const pathString = path.map(format).join(' -> ');
    super(`Circular module dependency detected: ${pathString}`, 'MOKE_MODULE_CIRCULAR_DEPENDENCY');
    this.name = 'MokeCircularModuleError';
  }
}

export class PrimitiveDependencyError extends MokeError {
  constructor(index: number, targetName: string) {
    super(`Moke cannot infer dependency for parameter #${index} of ${targetName}. Primitive or interface-like dependencies require an explicit injection token. Use @Inject(TOKEN).`, 'MOKE_DI_PRIMITIVE_DEPENDENCY');
    this.name = 'PrimitiveDependencyError';
  }
}

export class DependencyResolutionError extends MokeError {
  constructor(tokenKey: unknown, cause: Error) {
    const format = (p: unknown) => typeof p === 'function' ? p.name : String(p);
    super(`Failed to resolve dependency: ${format(tokenKey)}.`, 'MOKE_DI_RESOLUTION_FAILED');
    this.name = 'DependencyResolutionError';
    this.cause = cause;
  }
}
