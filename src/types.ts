export type Constructor<T = unknown> = new (...args: any[]) => T;

export interface InjectionToken<T> {
  readonly key: symbol;
  readonly description?: string;
  readonly __type_brand?: T; // Type-only field to infer T
}

export type Token<T = unknown> = Constructor<T> | string | symbol | InjectionToken<T>;

export function createToken<T>(description?: string): InjectionToken<T> {
  return {
    key: Symbol(description),
    description
  } as InjectionToken<T>;
}
