import 'reflect-metadata';
import { Constructor, Token, InjectionToken } from './types.js';
import { Provider, ProviderDefinition, Scope } from './providers.js';
import { INJECT_METADATA_KEY } from './decorators.js';
import { AsyncProviderResolutionError, CircularDependencyError, InvalidProviderError } from './errors.js';

interface ProviderRegistration {
  provider: Provider;
  scope: Scope;
  instance?: any;
  asyncPromise?: Promise<any>;
}

export class Container {
  private registrations = new Map<any, ProviderRegistration>();

  register<T>(provider: Provider<T>, scope: Scope = 'singleton') {
    if (!('provide' in provider) || provider.provide === undefined) {
      throw new InvalidProviderError('Provider must have a "provide" property when using register()');
    }
    this.bind(provider.provide, provider, scope);
  }

  bind<T>(token: Token<T>, providerDef: ProviderDefinition<T>, scope: Scope = 'singleton') {
    const key = this.getTokenKey(token);
    let provider: Provider<T>;

    if (typeof providerDef === 'function') {
      provider = { useClass: providerDef as Constructor<T> };
    } else {
      provider = providerDef as Provider<T>;
      
      if ('provide' in provider && provider.provide !== undefined && provider.provide !== token) {
        throw new InvalidProviderError(`Mismatch between bound token and provider.provide`);
      }
    }

    if (!('useClass' in provider) && !('useValue' in provider) && !('useFactory' in provider) && !('useExisting' in provider)) {
      throw new InvalidProviderError(`Provider definition is invalid. Must provide useClass, useValue, useFactory, or useExisting.`);
    }

    if ('useExisting' in provider) {
      scope = 'transient'; // Alias does not hold its own state/scope
    }

    this.registrations.set(key, { provider, scope });
  }

  singleton<T>(token: Token<T>, providerDef?: ProviderDefinition<T>) {
    this.bind(token, providerDef || (token as Constructor<T>), 'singleton');
  }

  transient<T>(token: Token<T>, providerDef?: ProviderDefinition<T>) {
    this.bind(token, providerDef || (token as Constructor<T>), 'transient');
  }

  instance<T>(token: Token<T>, value: T) {
    this.registrations.set(this.getTokenKey(token), {
      provider: { useValue: value },
      scope: 'singleton',
      instance: value
    });
  }

  factory<T>(token: Token<T>, factory: (container: Container) => T | Promise<T>, scope: Scope = 'singleton') {
    this.bind(token, { useFactory: factory }, scope);
  }

  has<T>(token: Token<T>): boolean {
    return this.registrations.has(this.getTokenKey(token));
  }

  resolve<T>(token: Token<T>): T {
    return this.internalResolveSync(token, []);
  }

  async resolveAsync<T>(token: Token<T>): Promise<T> {
    return this.internalResolveAsync(token, []);
  }

  private internalResolveSync<T>(token: Token<T>, path: any[]): T {
    const key = this.getTokenKey(token);
    
    if (path.includes(key)) {
      throw new CircularDependencyError([...path, key]);
    }

    this.ensureRegistered(key, token);
    const reg = this.registrations.get(key)!;

    if ('useExisting' in reg.provider) {
      return this.internalResolveSync(reg.provider.useExisting, [...path, key]);
    }

    if (reg.scope === 'singleton' && 'instance' in reg) {
      return reg.instance as T;
    }

    const instance = this.resolveProviderSync(reg.provider, key, [...path, key]);

    if (reg.scope === 'singleton') {
      reg.instance = instance;
    }

    return instance;
  }

  private async internalResolveAsync<T>(token: Token<T>, path: any[]): Promise<T> {
    const key = this.getTokenKey(token);

    this.ensureRegistered(key, token);
    const reg = this.registrations.get(key)!;

    if (reg.scope === 'singleton' && reg.asyncPromise) {
      return reg.asyncPromise;
    }

    if (path.includes(key)) {
      throw new CircularDependencyError([...path, key]);
    }

    if ('useExisting' in reg.provider) {
      return this.internalResolveAsync(reg.provider.useExisting, [...path, key]);
    }

    if (reg.scope === 'singleton' && 'instance' in reg) {
      return reg.instance as T;
    }

    const resolutionPromise = this.resolveProviderAsync(reg.provider, [...path, key]);

    if (reg.scope === 'singleton') {
      reg.asyncPromise = resolutionPromise;
      try {
        reg.instance = await resolutionPromise;
        return reg.instance as T;
      } catch (e) {
        delete reg.asyncPromise;
        throw e;
      }
    }

    return resolutionPromise;
  }

  private ensureRegistered<T>(key: any, token: Token<T>) {
    if (!this.registrations.has(key)) {
      if (typeof token === 'function') {
        this.singleton(token);
      } else {
        throw new Error(`Cannot resolve dependency for token: ${String(key)}`);
      }
    }
  }

  private resolveProviderSync(provider: Provider, key: any, path: any[]): any {
    if ('useValue' in provider) {
      return provider.useValue;
    }

    if ('useFactory' in provider) {
      // Temporarily inject internalResolve to track path inside factory
      const originalResolve = this.resolve;
      try {
        this.resolve = (t: any) => this.internalResolveSync(t, path);
        const result = provider.useFactory(this);
        if (result instanceof Promise) {
          throw new AsyncProviderResolutionError(key);
        }
        return result;
      } finally {
        this.resolve = originalResolve;
      }
    }

    if ('useClass' in provider) {
      return this.instantiateClassSync(provider.useClass, path);
    }
  }

  private async resolveProviderAsync(provider: Provider, path: any[]): Promise<any> {
    if ('useValue' in provider) {
      return provider.useValue;
    }

    if ('useFactory' in provider) {
      const originalResolveAsync = this.resolveAsync;
      const originalResolve = this.resolve;
      try {
        this.resolveAsync = (t: any) => this.internalResolveAsync(t, path);
        this.resolve = (t: any) => this.internalResolveSync(t, path);
        return await provider.useFactory(this);
      } finally {
        this.resolveAsync = originalResolveAsync;
        this.resolve = originalResolve;
      }
    }

    if ('useClass' in provider) {
      return this.instantiateClassAsync(provider.useClass, path);
    }
  }

  private instantiateClassSync<T>(target: Constructor<T>, path: any[]): T {
    const injections = this.getConstructorInjections(target).map(t => this.internalResolveSync(t, path));
    return new target(...injections);
  }

  private async instantiateClassAsync<T>(target: Constructor<T>, path: any[]): Promise<T> {
    const injections = await Promise.all(
      this.getConstructorInjections(target).map(t => this.internalResolveAsync(t, path))
    );
    return new target(...injections);
  }

  private getConstructorInjections<T>(target: Constructor<T>): Token[] {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    const explicitInjections: { index: number, token: Token }[] = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) || [];

    return paramTypes.map((type: any, index: number) => {
      const explicit = explicitInjections.find(e => e.index === index);
      if (explicit) return explicit.token;
      if (!type || type === Object) {
        throw new Error(`Cannot resolve constructor dependency at index ${index} for ${target.name}. Type is unknown or an interface. Use @Inject().`);
      }
      return type;
    });
  }

  private getTokenKey<T>(token: Token<T>): any {
    if (typeof token === 'object' && token !== null && 'key' in token) {
      return (token as InjectionToken<T>).key;
    }
    return token;
  }
}
