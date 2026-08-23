import { Container } from './container.js';
import { Constructor, Token } from './types.js';
export type ApplicationState = 'created' | 'initializing' | 'ready' | 'closing' | 'closed';
export declare class MokeApplicationContext {
    readonly container: Container;
    private _state;
    private initPromise?;
    constructor(container: Container);
    get state(): ApplicationState;
    get<T>(token: Token<T>): T;
    resolve<T>(token: Token<T>): T;
    resolveAsync<T>(token: Token<T>): Promise<T>;
    init(): Promise<void>;
    private _initImpl;
    close(signal?: string): Promise<void>;
}
export declare class MokeFactory {
    /**
     * @deprecated Use `createApplicationContext` instead. This method skips proper module traversal and lifecycle hooks.
     */
    static create<T>(module: Constructor<T>): T;
    /**
     * @deprecated Use `createApplicationContext` instead. This method skips proper module traversal and lifecycle hooks.
     */
    static createAsync<T>(module: Constructor<T>): Promise<T>;
    /**
     * Creates a MokeApplicationContext, compiling the module tree.
     * Does not automatically call `init()`.
     */
    static createApplicationContext(module: Constructor<unknown>): Promise<MokeApplicationContext>;
    private static compileModuleAsync;
}
//# sourceMappingURL=application.d.ts.map