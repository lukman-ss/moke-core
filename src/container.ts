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
    return this.hasRegistration(this.getTokenKey(token));
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

  protected hasRegistration(key: unknown): boolean {
    if (this.registrations.has(key)) return true;
    return this.parent ? this.parent.hasRegistration(key) : false;
  }

  protected getRegistrationRecursively(key: unknown): ProviderRegistration | undefined {
    if (this.registrations.has(key)) return this.registrations.get(key);
    if (this.parent) return this.parent.getRegistrationRecursively(key);
    return undefined;
  }

  protected ensureRegistered(key: unknown, token: Token<unknown>): void {
    if (!this.registrations.has(key)) {
      if (typeof token === 'function') {
        if (this.parent) {
          this.parent.ensureRegistered(key, token);
        } else {
          this.singleton(token);
        }
      } else {
        throw new UnknownProviderError(key);
      }
    }
  }

  private createResolutionProxy(path: unknown[]): Container {
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'resolve') {
          return (t: any) => target.internalResolveSync(t, path);
        }
        if (prop === 'resolveAsync') {
          return (t: any) => target.internalResolveAsync(t, path);
        }
        const value = (target as any)[prop];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }
    });
  }

  private internalResolveSync(token: Token<unknown>, path: unknown[]): unknown {
    if (this.isDisposed) throw new Error('Cannot resolve from a disposed container');
    
    const key = this.getTokenKey(token);
    
    if (path.includes(key)) {
      throw new CircularDependencyError([...path, key]);
    }

    let reg = this.registrations.get(key);

    if (!reg) {
      if (this.hasRegistration(key)) {
        const parentReg = this.getRegistrationRecursively(key)!;
        if (parentReg.scope === 'singleton' || parentReg.scope === 'transient') {
          return this.parent!.internalResolveSync(token, path);
        } else if (parentReg.scope === 'scoped') {
          reg = { provider: parentReg.provider, scope: 'scoped' };
          this.registrations.set(key, reg);
        }
      } else {
        this.ensureRegistered(key, token);
        return this.internalResolveSync(token, path);
      }
    }

    if ('useExisting' in reg!.provider) {
      return this.internalResolveSync(reg!.provider.useExisting, [...path, key]);
    }

    if ((reg!.scope === 'singleton' || reg!.scope === 'scoped') && 'instance' in reg!) {
      return reg!.instance;
    }

    const instance = this.resolveProviderSync(reg!.provider, key, [...path, key]);

    if (reg!.scope === 'singleton' || reg!.scope === 'scoped') {
      reg!.instance = instance;
    }
    
    if (reg!.scope !== 'transient' && instance && typeof instance === 'object') {
      this.instantiatedInstances.add(instance);
    }

    return instance;
  }

  private async internalResolveAsync(token: Token<unknown>, path: unknown[]): Promise<unknown> {
    if (this.isDisposed) throw new Error('Cannot resolve from a disposed container');
    
    const key = this.getTokenKey(token);

    if (path.includes(key)) {
      throw new CircularDependencyError([...path, key]);
    }

    let reg = this.registrations.get(key);

    if (!reg) {
      if (this.hasRegistration(key)) {
        const parentReg = this.getRegistrationRecursively(key)!;
        if (parentReg.scope === 'singleton' || parentReg.scope === 'transient') {
          return this.parent!.internalResolveAsync(token, path);
        } else if (parentReg.scope === 'scoped') {
          reg = { provider: parentReg.provider, scope: 'scoped' };
          this.registrations.set(key, reg);
        }
      } else {
        this.ensureRegistered(key, token);
        return this.internalResolveAsync(token, path);
      }
    }

    if ('useExisting' in reg!.provider) {
      return this.internalResolveAsync(reg!.provider.useExisting, [...path, key]);
    }

    if ((reg!.scope === 'singleton' || reg!.scope === 'scoped') && 'instance' in reg!) {
      return reg!.instance;
    }

    if ((reg!.scope === 'singleton' || reg!.scope === 'scoped') && reg!.asyncPromise) {
      return reg!.asyncPromise;
    }

    const resolutionPromise = this.resolveProviderAsync(reg!.provider, [...path, key]);

    if (reg!.scope === 'singleton' || reg!.scope === 'scoped') {
      reg!.asyncPromise = resolutionPromise;
      try {
        reg!.instance = await resolutionPromise;
        if (reg!.instance && typeof reg!.instance === 'object') {
          this.instantiatedInstances.add(reg!.instance);
        }
        return reg!.instance;
      } catch (e) {
        delete reg!.asyncPromise;
        throw e;
      }
    }

    return await resolutionPromise;
  }

  private resolveProviderSync(provider: Provider, key: unknown, path: unknown[]): unknown {
    if ('useValue' in provider) {
      return provider.useValue;
    }

    if ('useFactory' in provider) {
      const proxy = this.createResolutionProxy(path);
      const result = provider.useFactory(proxy);
      if (result instanceof Promise) {
        throw new AsyncProviderResolutionError(key);
      }
      return result;
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
      const proxy = this.createResolutionProxy(path);
      return await provider.useFactory(proxy);
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

