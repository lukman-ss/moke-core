import { Container } from './container.js';
import { ConsoleLogger, Logger, MokeLogger } from './logger.js';
import { Constructor, Token } from './types.js';
import { ServiceProvider } from './service-provider.js';
import { ProviderDefinition, Scope, Provider } from './providers.js';
import { ReflectionHost } from './reflection.js';

import { MokeCircularModuleError, MokeBootstrapError, MokeShutdownError } from './errors.js';

export type ApplicationState = 'created' | 'initializing' | 'ready' | 'closing' | 'closed';

export class MokeApplicationContext {
  private _state: ApplicationState = 'created';
  private initPromise?: Promise<void>;
  private isRegistrationFrozen = false;

  constructor(public readonly container: Container) {}

  get state(): ApplicationState {
    return this._state;
  }

  get<T>(token: Token<T>): T {
    return this.container.resolve(token);
  }

  /** @deprecated Use get() instead */
  resolve<T>(token: Token<T>): T {
    return this.get(token);
  }

  getAsync<T>(token: Token<T>): Promise<T> {
    return this.container.resolveAsync(token);
  }

  /** @deprecated Use getAsync() instead */
  async resolveAsync<T>(token: Token<T>): Promise<T> {
    return this.getAsync(token);
  }

  register<T>(token: Token<T>, providerDef: ProviderDefinition<T>, scope: Scope = 'singleton'): void {
    if (this._state !== 'created') {
      throw new Error('Cannot register providers after application has been initialized');
    }
    this.container.bind(token, providerDef, scope);
  }

  async registerProvider(provider: ServiceProvider): Promise<void> {
    if (this._state !== 'created') {
      throw new Error('Cannot register providers after application has been initialized');
    }
    
    const registeredProviders = Reflect.getMetadata('moke:registeredProviders', provider) || [];
    if (registeredProviders.includes(provider.constructor)) {
      throw new Error(`ServiceProvider ${provider.constructor.name} has already been registered. Use register() instead of registerProvider() for class-based providers.`);
    }
    
    Reflect.defineMetadata('moke:registeredProviders', [...registeredProviders, provider.constructor], provider);
    
    await provider.register?.();
  }

  async bootProviders(): Promise<void> {
    const bootQueue: ServiceProvider[] = [];
    
    for (const instance of this.container.getInstantiatedInstances()) {
      if (instance instanceof ServiceProvider) {
        const registered = Reflect.getMetadata('moke:registeredProviders', instance) || [];
        if (registered.length > 0) {
          bootQueue.push(instance);
        }
      }
    }
    
    for (const provider of bootQueue) {
      await provider.boot?.();
    }
  }

  async init(): Promise<void> {
    if (this._state === 'ready') return;
    if (this._state === 'closing' || this._state === 'closed') {
      throw new Error('Cannot initialize an application that is closing or closed.');
    }

    if (this._state === 'initializing' && this.initPromise) {
      return this.initPromise;
    }

    this._state = 'initializing';
    this.initPromise = this._initImpl();

    try {
      await this.initPromise;
      this.container.freeze();
      this._state = 'ready';
    } catch (e) {
      this._state = 'created';
      throw e;
    } finally {
      this.initPromise = undefined;
    }
  }

  private async _initImpl(): Promise<void> {
    const instances = this.container.getInstantiatedInstances();

    // 1. onModuleInit
    for (const instance of instances as any[]) {
      if (typeof instance.onModuleInit === 'function') {
        try {
          await instance.onModuleInit();
        } catch (e: any) {
          throw new MokeBootstrapError('onModuleInit', e, instance.constructor?.name);
        }
      }
    }

    // 2. onApplicationBootstrap
    for (const instance of instances as any[]) {
      if (typeof instance.onApplicationBootstrap === 'function') {
        try {
          await instance.onApplicationBootstrap();
        } catch (e: any) {
          throw new MokeBootstrapError('onApplicationBootstrap', e, instance.constructor?.name);
        }
      }
    }
  }

  async close(signal?: string): Promise<void> {
    if (this._state === 'closed') return;
    this._state = 'closing';

    const shutdownErrors: Error[] = [];

    // Reverse order for teardown
    const instances = this.container.getInstantiatedInstances().reverse();

    // 1. onApplicationShutdown
    for (const instance of instances as any[]) {
      if (typeof instance.onApplicationShutdown === 'function') {
        try {
          await instance.onApplicationShutdown(signal);
        } catch (e: any) {
          shutdownErrors.push(e);
        }
      }
    }

    // 2. onModuleDestroy
    for (const instance of instances as any[]) {
      if (typeof instance.onModuleDestroy === 'function') {
        try {
          await instance.onModuleDestroy();
        } catch (e: any) {
          shutdownErrors.push(e);
        }
      }
    }

    this.container.dispose();
    this._state = 'closed';

    if (shutdownErrors.length > 0) {
      throw new MokeShutdownError(shutdownErrors);
    }
  }
}

export class MokeFactory {
  /**
   * @deprecated Use `createApplicationContext` instead. This method skips proper module traversal and lifecycle hooks.
   */
  static create<T>(module: Constructor<T>): T {
    const container = new Container();
    container.instance(MokeLogger, new MokeLogger());
    container.bind('Logger', { useExisting: MokeLogger });
    return container.resolve(module);
  }

  /**
   * @deprecated Use `createApplicationContext` instead. This method skips proper module traversal and lifecycle hooks.
   */
  static async createAsync<T>(module: Constructor<T>): Promise<T> {
    const container = new Container();
    container.instance(MokeLogger, new MokeLogger());
    container.bind('Logger', { useExisting: MokeLogger });
    return container.resolveAsync(module);
  }

  /**
   * Creates a MokeApplicationContext, compiling the module tree.
   * Does not automatically call `init()`.
   */
  static async createApplicationContext(module: Constructor<unknown>): Promise<MokeApplicationContext> {
    const container = new Container();
    
    // Core default registrations
    container.instance(MokeLogger, new MokeLogger());
    container.bind('Logger', { useExisting: MokeLogger });
    
    await this.compileModuleAsync(module, container, new Set(), []);
    await container.resolveAsync(module); // Resolve the root module to trigger graph instantiation
    
    return new MokeApplicationContext(container);
  }

  private static async compileModuleAsync(module: Constructor<unknown>, container: Container, resolved: Set<unknown>, path: Constructor<unknown>[]) {
    if (path.includes(module)) {
      throw new MokeCircularModuleError([...path, module]);
    }
    
    if (resolved.has(module)) return;

    path.push(module);

    const metadata = ReflectionHost.getModuleMetadata(module);
      
    if (!metadata) {
      container.singleton(module);
      resolved.add(module);
      path.pop();
      return;
    }

    if (metadata.imports) {
      for (const imported of metadata.imports) {
        await this.compileModuleAsync(imported, container, resolved, path);
      }
    }

    if (metadata.providers) {
      for (const provider of metadata.providers) {
        if (typeof provider === 'function') {
          // Provide default singleton bindings only if not already bound
          // In an encapsulated model, this logic will branch. Here in the flattened model, we skip if already explicitly bound.
          if (!container.hasOwn(provider)) {
            container.singleton(provider);
          }
        } else {
          const providerDef = provider as Provider;
          if (providerDef.provide && !container.hasOwn(providerDef.provide)) {
            container.register(providerDef);
          }
        }
      }
    }

    // Exports behavior in core is currently flattened globally.
    // In Model B (Encapsulated), each module would get a child container,
    // and exports would be forwarded.
    // For Moke's simplicity vs NestJS-like complexity, we use a flattened global DI by default.

    if (!container.hasOwn(module)) {
      container.singleton(module);
    }
    
    resolved.add(module);
    path.pop();
  }
}
