import 'reflect-metadata';
import { Constructor, Token, InjectionToken } from './types.js';
import { Provider, ProviderDefinition, Scope } from './providers.js';
import { INJECT_METADATA_KEY } from './decorators.js';

interface ProviderRegistration {
  provider: Provider;
  scope: Scope;
  instance?: any;
}

export class Container {
  private registrations = new Map<any, ProviderRegistration>();

  bind<T>(token: Token<T>, providerDef: ProviderDefinition<T>, scope: Scope = 'singleton') {
    const key = this.getTokenKey(token);
    let provider: Provider<T>;

    if (typeof providerDef === 'function') {
      provider = { provide: token, useClass: providerDef as Constructor<T> };
    } else {
      provider = providerDef as Provider<T>;
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
      provider: { provide: token, useValue: value },
      scope: 'singleton',
      instance: value
    });
  }

  factory<T>(token: Token<T>, factory: (container: Container) => T | Promise<T>, scope: Scope = 'singleton') {
    this.bind(token, { provide: token, useFactory: factory }, scope);
  }

  has<T>(token: Token<T>): boolean {
    return this.registrations.has(this.getTokenKey(token));
  }

  resolve<T>(token: Token<T>): T {
    const key = this.getTokenKey(token);

    if (!this.registrations.has(key)) {
      if (typeof token === 'function') {
        this.singleton(token);
      } else {
        throw new Error(`Cannot resolve dependency for token: ${String(key)}`);
      }
    }

    const reg = this.registrations.get(key)!;

    if (reg.scope === 'singleton' && 'instance' in reg) {
      return reg.instance as T;
    }

    const instance = this.resolveProvider(reg.provider);

    if (reg.scope === 'singleton') {
      reg.instance = instance;
    }

    return instance;
  }

  private resolveProvider(provider: Provider): any {
    if ('useValue' in provider) {
      return provider.useValue;
    }

    if ('useFactory' in provider) {
      return provider.useFactory(this);
    }

    if ('useExisting' in provider) {
      return this.resolve(provider.useExisting);
    }

    if ('useClass' in provider) {
      return this.instantiateClass(provider.useClass);
    }
  }

  private instantiateClass<T>(target: Constructor<T>): T {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    const explicitInjections: { index: number, token: Token }[] = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) || [];

    const injections = paramTypes.map((type: any, index: number) => {
      const explicit = explicitInjections.find(e => e.index === index);
      if (explicit) {
        return this.resolve(explicit.token);
      }
      if (!type || type === Object) {
        throw new Error(`Cannot resolve constructor dependency at index ${index} for ${target.name}. Type is unknown or an interface. Use @Inject().`);
      }
      return this.resolve(type);
    });

    return new target(...injections);
  }

  private getTokenKey<T>(token: Token<T>): any {
    if (typeof token === 'object' && token !== null && 'key' in token) {
      return (token as InjectionToken<T>).key;
    }
    return token;
  }
}
