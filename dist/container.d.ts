import 'reflect-metadata';
import { Token } from './types.js';
import { Provider, ProviderDefinition, Scope } from './providers.js';
interface ProviderRegistration {
    provider: Provider;
    scope: Scope;
    instance?: unknown;
    asyncPromise?: Promise<unknown>;
}
export declare class Container {
    private parent?;
    private registrations;
    private instantiatedInstances;
    private isDisposed;
    constructor(parent?: Container | undefined);
    createChild(): Container;
    register<T>(provider: Provider<T>, scope?: Scope): void;
    bind<T>(token: Token<T>, providerDef: ProviderDefinition<T>, scope?: Scope): void;
    override<T>(token: Token<T>, providerDef: ProviderDefinition<T>, scope?: Scope): void;
    private internalBind;
    singleton<T>(token: Token<T>, providerDef?: ProviderDefinition<T>): void;
    scoped<T>(token: Token<T>, providerDef?: ProviderDefinition<T>): void;
    transient<T>(token: Token<T>, providerDef?: ProviderDefinition<T>): void;
    instance<T>(token: Token<T>, value: T): void;
    factory<T>(token: Token<T>, factory: (container: Container) => T | Promise<T>, scope?: Scope): void;
    has<T>(token: Token<T>): boolean;
    hasOwn<T>(token: Token<T>): boolean;
    resolve<T>(token: Token<T>): T;
    resolveAsync<T>(token: Token<T>): Promise<T>;
    dispose(): void;
    getInstantiatedInstances(): unknown[];
    protected hasRegistration(key: unknown): boolean;
    protected getRegistrationRecursively(key: unknown): ProviderRegistration | undefined;
    protected ensureRegistered(key: unknown, token: Token<unknown>): void;
    private createResolutionProxy;
    private internalResolveSync;
    private internalResolveAsync;
    private resolveProviderSync;
    private resolveProviderAsync;
    private instantiateClassSync;
    private instantiateClassAsync;
    private getConstructorInjections;
    private getTokenKey;
}
export {};
//# sourceMappingURL=container.d.ts.map