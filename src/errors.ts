import { formatToken, formatPath } from './internal/formatter.js';

export class MokeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MokeError';
  }
}

export class UnknownProviderError extends MokeError {
  constructor(tokenKey: unknown, index?: number, targetName?: string, path?: unknown[]) {
    let msg = `No provider registered for ${formatToken(tokenKey)}.`;
    
    if (index !== undefined && targetName) {
      msg = `Unable to resolve parameter #${index} of ${targetName}.\n\nDependency:\n${formatToken(tokenKey)}\n\nReason:\nNo provider registered for ${formatToken(tokenKey)}.`;
    }

    if (path && path.length > 0) {
      msg += `\n\nResolution path:\n${formatPath(path)}\n→ ${formatToken(tokenKey)}`;
    }

    super(msg, 'MOKE_DI_UNKNOWN_PROVIDER');
    this.name = 'UnknownProviderError';
  }
}

export class CircularDependencyError extends MokeError {
  constructor(path: unknown[]) {
    super(`Circular dependency detected:\n${formatPath(path)}`, 'MOKE_DI_CIRCULAR_DEPENDENCY');
    this.name = 'CircularDependencyError';
  }
}

export class DuplicateProviderError extends MokeError {
  constructor(tokenKey: unknown) {
    super(`Provider already registered for ${formatToken(tokenKey)}. Use override() to replace it explicitly.`, 'MOKE_DI_DUPLICATE_PROVIDER');
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
  constructor(tokenKey: unknown, path?: unknown[]) {
    let msg = `Cannot synchronously resolve async provider for token: ${formatToken(tokenKey)}. Use resolveAsync() instead.`;
    if (path && path.length > 0) {
      msg += `\n\nResolution path:\n${formatPath(path)}\n→ ${formatToken(tokenKey)}`;
    }
    super(msg, 'MOKE_DI_ASYNC_PROVIDER_SYNC_RESOLUTION');
    this.name = 'AsyncProviderResolutionError';
  }
}

export class MokeCircularModuleError extends MokeError {
  constructor(path: unknown[]) {
    super(`Circular module dependency detected:\n${formatPath(path)}`, 'MOKE_MODULE_CIRCULAR_DEPENDENCY');
    this.name = 'MokeCircularModuleError';
  }
}

export class PrimitiveDependencyError extends MokeError {
  constructor(index: number, targetName: string, path?: unknown[]) {
    let msg = `Moke cannot infer dependency for parameter #${index} of ${targetName}.\nPrimitive or interface-like dependencies require an explicit injection token.\nUse @Inject(TOKEN).`;
    if (path && path.length > 0) {
      msg += `\n\nResolution path:\n${formatPath(path)}\n→ Parameter #${index} of ${targetName}`;
    }
    super(msg, 'MOKE_DI_PRIMITIVE_DEPENDENCY');
    this.name = 'PrimitiveDependencyError';
  }
}

export class DependencyResolutionError extends MokeError {
  constructor(tokenKey: unknown, cause: Error, path?: unknown[]) {
    let msg = `Failed while constructing ${formatToken(tokenKey)}.`;
    
    if (path && path.length > 0) {
      msg += `\n\nResolution path:\n${formatPath(path)}\n→ ${formatToken(tokenKey)}`;
    }

    msg += `\n\nCause:\n${cause.message}`;

    super(msg, 'MOKE_DI_RESOLUTION_FAILED');
    this.name = 'DependencyResolutionError';
    this.cause = cause;
  }
}

export class MokeBootstrapError extends MokeError {
  constructor(public readonly hook: string, cause: Error, public readonly instanceName?: string) {
    super(`Bootstrap failed during ${hook}${instanceName ? ` for ${instanceName}` : ''}: ${cause.message}`, 'MOKE_APP_BOOTSTRAP_ERROR');
    this.name = 'MokeBootstrapError';
    this.cause = cause;
  }
}

export class MokeShutdownError extends MokeError {
  constructor(public readonly errors: Error[]) {
    super(`Application shutdown completed with ${errors.length} error(s).`, 'MOKE_APP_SHUTDOWN_ERROR');
    this.name = 'MokeShutdownError';
  }
}
