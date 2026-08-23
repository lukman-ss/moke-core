import 'reflect-metadata';
import { Constructor, Token, InjectionToken } from './types.js';
import { Provider, ProviderDefinition, Scope } from './providers.js';
import { ReflectionHost } from './reflection.js';
import { AsyncProviderResolutionError, CircularDependencyError, InvalidProviderError, UnknownProviderError, DependencyResolutionError } from './errors.js';

interface ProviderRegistration {
  provider: Provider;
  scope: Scope;
  instance?: unknown;
  asyncPromise?: Promise<unknown>;
}

export class Container {
  private registrations = new Map<unknown, ProviderRegistration>();
  private instantiatedInstances = new Set<unknown>();
  private isDisposed = false;

  constructor(private parent?: Container) {}

  createChild(): Container {
    return new Container(this);
  }

  register<T>(provider: Provider<T>, scope: Scope = 'singleton'): void {
    if (!('provide' in provider) || provider.provide === undefined) {
      throw new InvalidProviderError('Provider must have a "provide" property when using register()');
    }
    this.bind(provider.provide, provider, scope);
  }

  bind<T>(token: Token<T>, providerDef: ProviderDefinition<T>, scope: Scope = 'singleton'): void {
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
      scope = 'transient'; 
    }

    this.registrations.set(key, { provider, scope });
  }

  singleton<T>(token: Token<T>, providerDef?: ProviderDefinition<T>): void {
    this.bind(token, providerDef || (token as Constructor<T>), 'singleton');
  }

  scoped<T>(token: Token<T>, providerDef?: ProviderDefinition<T>): void {
    this.bind(token, providerDef || (token as Constructor<T>), 'scoped');
  }

  transient<T>(token: Token<T>, providerDef?: ProviderDefinition<T>): void {
    this.bind(token, providerDef || (token as Constructor<T>), 'transient');
  }

  instance<T>(token: Token<T>, value: T): void {
    this.registrations.set(this.getTokenKey(token), {
      provider: { useValue: value },
      scope: 'singleton',
      instance: value
    });
    this.instantiatedInstances.add(value);
  }

  factory<T>(token: Token<T>, factory: (container: Container) => T | Promise<T>, scope: Scope = 'singleton'): void {
    this.bind(token, { useFactory: factory }, scope);
  }

  has<T>(token: Token<T>): boolean {
    if (this.registrations.has(this.getTokenKey(token))) return true;
    return this.parent ? this.parent.has(token) : false;
  }

  resolve<T>(token: Token<T>): T {
    try {
      return this.internalResolveSync(token, []) as T;
    } catch (e: any) {
      if (e.name === 'DependencyResolutionError' || e.name === 'CircularDependencyError' || e.name === 'UnknownProviderError' || e.name === 'AsyncProviderResolutionError') throw e;
      throw new DependencyResolutionError(token, e);
    }
  }

  async resolveAsync<T>(token: Token<T>): Promise<T> {
    try {
      return await this.internalResolveAsync(token, []) as T;
    } catch (e: any) {
      if (e.name === 'DependencyResolutionError' || e.name === 'CircularDependencyError' || e.name === 'UnknownProviderError') throw e;
      throw new DependencyResolutionError(token, e);
    }
  }

  dispose(): void {
    this.isDisposed = true;
    this.registrations.clear();
    this.instantiatedInstances.clear();
  }

  getInstantiatedInstances(): unknown[] {
    return Array.from(this.instantiatedInstances);
  }

  private internalResolveSync(token: Token<unknown>, path: unknown[]): unknown {
    if (this.isDisposed) throw new Error('Cannot resolve from a disposed container');
    
    const key = this.getTokenKey(token);
    
    if (path.includes(key)) {
      throw new CircularDependencyError([...path, key]);
    }

    if (!this.registrations.has(key)) {
      if (this.parent && this.parent.has(token)) {
        return this.parent.internalResolveSync(token, path);
      }
      this.ensureRegistered(key, token);
    }

    const reg = this.registrations.get(key)!;

    if ('useExisting' in reg.provider) {
      return this.internalResolveSync(reg.provider.useExisting, [...path, key]);
    }

    if (reg.scope === 'singleton' && this.parent && !this.registrations.has(key)) {
      return this.parent.internalResolveSync(token, path);
    }

    if ((reg.scope === 'singleton' || reg.scope === 'scoped') && 'instance' in reg) {
      return reg.instance;
    }

    const instance = this.resolveProviderSync(reg.provider, key, [...path, key]);

    if (reg.scope === 'singleton' || reg.scope === 'scoped') {
      reg.instance = instance;
    }
    
    if (reg.scope !== 'transient' && instance && typeof instance === 'object') {
      this.instantiatedInstances.add(instance);
    }

    return instance;
  }

  private async internalResolveAsync(token: Token<unknown>, path: unknown[]): Promise<unknown> {
    if (this.isDisposed) throw new Error('Cannot resolve from a disposed container');
    
    const key = this.getTokenKey(token);

    if (!this.registrations.has(key)) {
      if (this.parent && this.parent.has(token)) {
        return this.parent.internalResolveAsync(token, path);
      }
      this.ensureRegistered(key, token);
    }

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
    
    if (reg.scope === 'singleton' && this.parent && !this.registrations.has(key)) {
      return this.parent.internalResolveAsync(token, path);
    }

    if ((reg.scope === 'singleton' || reg.scope === 'scoped') && 'instance' in reg) {
      return reg.instance;
    }

    const resolutionPromise = this.resolveProviderAsync(reg.provider, [...path, key]);

    if (reg.scope === 'singleton' || reg.scope === 'scoped') {
      reg.asyncPromise = resolutionPromise;
      try {
        reg.instance = await resolutionPromise;
        if (reg.instance && typeof reg.instance === 'object') {
          this.instantiatedInstances.add(reg.instance);
        }
        return reg.instance;
      } catch (e) {
        delete reg.asyncPromise;
        throw e;
      }
    }

    return await resolutionPromise;
  }

  private ensureRegistered(key: unknown, token: Token<unknown>): void {
    if (!this.registrations.has(key)) {
      if (typeof token === 'function') {
        this.singleton(token);
      } else {
        throw new UnknownProviderError(key);
      }
    }
  }

  private resolveProviderSync(provider: Provider, key: unknown, path: unknown[]): unknown {
    if ('useValue' in provider) {
      return provider.useValue;
    }

    if ('useFactory' in provider) {
      const originalResolve = this.resolve;
      try {
        this.resolve = ((t: any) => this.internalResolveSync(t, path)) as any;
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

  private async resolveProviderAsync(provider: Provider, path: unknown[]): Promise<unknown> {
    if ('useValue' in provider) {
      return provider.useValue;
    }

    if ('useFactory' in provider) {
      const originalResolveAsync = this.resolveAsync;
      const originalResolve = this.resolve;
      try {
        this.resolveAsync = ((t: any) => this.internalResolveAsync(t, path)) as any;
        this.resolve = ((t: any) => this.internalResolveSync(t, path)) as any;
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

  private instantiateClassSync(target: Constructor<unknown>, path: unknown[]): unknown {
    const injections = this.getConstructorInjections(target).map(t => this.internalResolveSync(t, path));
    return new target(...injections);
  }

  private async instantiateClassAsync(target: Constructor<unknown>, path: unknown[]): Promise<unknown> {
    const injections = await Promise.all(
      this.getConstructorInjections(target).map(t => this.internalResolveAsync(t, path))
    );
    return new target(...injections);
  }

  private getConstructorInjections(target: Constructor<unknown>): Token[] {
    const paramTypes = ReflectionHost.getParamTypes(target);
    const explicitInjections = ReflectionHost.getExplicitInjections(target);

    return paramTypes.map((type: unknown, index: number) => {
      const explicit = explicitInjections.find(e => e.index === index);
      if (explicit) return explicit.token;
      if (!type || type === Object) {
        throw new UnknownProviderError(null, index, target.name);
      }
      return type as Token;
    });
  }

  private getTokenKey(token: Token<unknown>): unknown {
    if (typeof token === 'object' && token !== null && 'key' in token) {
      return (token as InjectionToken<unknown>).key;
    }
    return token;
  }
}
