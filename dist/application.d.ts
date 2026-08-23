import { Container } from './container.js';
import { Constructor, Token } from './types.js';
import { ServiceProvider } from './service-provider.js';
import { ProviderDefinition, Scope } from './providers.js';
export type ApplicationState = 'created' | 'initializing' | 'ready' | 'closing' | 'closed';
export declare class MokeApplicationContext {
    readonly container: Container;
    private _state;
    private initPromise?;
    private isRegistrationFrozen;
    constructor(container: Container);
    get state(): ApplicationState;
    get<T>(token: Token<T>): T;
    getAsync<T>(token: Token<T>): Promise<T>;
    register<T>(token: Token<T>, providerDef: ProviderDefinition<T>, scope?: Scope): void;
    registerProvider(provider: ServiceProvider): Promise<void>;
    bootProviders(): Promise<void>;
    init(): Promise<void>;
    private _initImpl;
    close(signal?: string): Promise<void>;
}
export declare class MokeFactory {
    /**
     * Creates a MokeApplicationContext, compiling the module tree.
     * Does not automatically call `init()`.
     */
    static createApplicationContext(module: Constructor<unknown>): Promise<MokeApplicationContext>;
    private static compileModuleAsync;
}
//# sourceMappingURL=application.d.ts.map