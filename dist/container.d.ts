import 'reflect-metadata';
import { Token } from './types.js';
import { ProviderDefinition, Scope } from './providers.js';
export declare class Container {
    private registrations;
    bind<T>(token: Token<T>, providerDef: ProviderDefinition<T>, scope?: Scope): void;
    singleton<T>(token: Token<T>, providerDef?: ProviderDefinition<T>): void;
    transient<T>(token: Token<T>, providerDef?: ProviderDefinition<T>): void;
    instance<T>(token: Token<T>, value: T): void;
    factory<T>(token: Token<T>, factory: (container: Container) => T | Promise<T>, scope?: Scope): void;
    has<T>(token: Token<T>): boolean;
    resolve<T>(token: Token<T>): T;
    private resolveProvider;
    private instantiateClass;
    private getTokenKey;
}
//# sourceMappingURL=container.d.ts.map