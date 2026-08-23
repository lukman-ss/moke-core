import { Constructor, Token } from './types.js';
import { Container } from './container.js';

export type Scope = 'singleton' | 'transient';

export interface ProviderBase<T = any> {
  provide: Token<T>;
}

export interface ClassProvider<T = any> extends ProviderBase<T> {
  useClass: Constructor<T>;
}

export interface ValueProvider<T = any> extends ProviderBase<T> {
  useValue: T;
}

export interface FactoryProvider<T = any> extends ProviderBase<T> {
  useFactory: (container: Container) => T | Promise<T>;
}

export interface ExistingProvider<T = any> extends ProviderBase<T> {
  useExisting: Token<T>;
}

export type Provider<T = any> = ClassProvider<T> | ValueProvider<T> | FactoryProvider<T> | ExistingProvider<T>;

export type ProviderDefinition<T = any> = Provider<T> | Constructor<T>;

