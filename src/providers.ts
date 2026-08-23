import { Constructor, Token } from './types.js';
import { Container } from './container.js';

export type Scope = 'singleton' | 'scoped' | 'transient';

export interface ProviderBase<T = unknown> {
  provide?: Token<T>;
}

export interface ClassProvider<T = unknown> extends ProviderBase<T> {
  // Use Constructor<T> so useClass must be assignable to T
  useClass: Constructor<T>;
}

export interface ValueProvider<T = unknown> extends ProviderBase<T> {
  // Value must be exactly T
  useValue: T;
}

export interface FactoryProvider<T = unknown> extends ProviderBase<T> {
  // Factory must return T or Promise<T>
  useFactory: (container: Container) => T | Promise<T>;
}

export interface ExistingProvider<T = unknown> extends ProviderBase<T> {
  // useExisting must be a Token that represents T
  useExisting: Token<T>;
}

export type Provider<T = unknown> = ClassProvider<T> | ValueProvider<T> | FactoryProvider<T> | ExistingProvider<T>;

export type ProviderDefinition<T = unknown> = Provider<T> | Constructor<T>;


