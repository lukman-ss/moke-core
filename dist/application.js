import { Container } from './container.js';
import { MokeLogger } from './logger.js';
import { ReflectionHost } from './reflection.js';
export class MokeApplicationContext {
    container;
    _state = 'created';
    initPromise;
    constructor(container) {
        this.container = container;
    }
    get state() {
        return this._state;
    }
    get(token) {
        return this.container.resolve(token);
    }
    resolve(token) {
        return this.container.resolve(token);
    }
    async resolveAsync(token) {
        return this.container.resolveAsync(token);
    }
    async init() {
        if (this._state === 'ready')
            return;
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
            this._state = 'ready';
        }
        catch (e) {
            this._state = 'created'; // Fallback to created so it can be retried if needed
            throw e;
        }
        finally {
            this.initPromise = undefined;
        }
    }
    async _initImpl() {
        const instances = this.container.getInstantiatedInstances();
        // 1. onModuleInit
        for (const instance of instances) {
            if (typeof instance.onModuleInit === 'function') {
                await instance.onModuleInit();
            }
        }
        // 2. onApplicationBootstrap
        for (const instance of instances) {
            if (typeof instance.onApplicationBootstrap === 'function') {
                await instance.onApplicationBootstrap();
            }
        }
    }
    async close(signal) {
        if (this._state === 'closed')
            return;
        this._state = 'closing';
        const instances = this.container.getInstantiatedInstances();
        for (const instance of instances) {
            if (typeof instance.onModuleDestroy === 'function') {
                try {
                    await instance.onModuleDestroy();
                }
                catch (e) {
                    // Swallow destroy errors
                }
            }
        }
        for (const instance of instances) {
            if (typeof instance.onApplicationShutdown === 'function') {
                try {
                    await instance.onApplicationShutdown(signal);
                }
                catch (e) {
                    // Swallow shutdown errors
                }
            }
        }
        this.container.dispose();
        this._state = 'closed';
    }
}
export class MokeFactory {
    /**
     * @deprecated Use `createApplicationContext` instead. This method skips proper module traversal and lifecycle hooks.
     */
    static create(module) {
        const container = new Container();
        container.instance(MokeLogger, new MokeLogger());
        container.bind('Logger', { useExisting: MokeLogger });
        return container.resolve(module);
    }
    /**
     * @deprecated Use `createApplicationContext` instead. This method skips proper module traversal and lifecycle hooks.
     */
    static async createAsync(module) {
        const container = new Container();
        container.instance(MokeLogger, new MokeLogger());
        container.bind('Logger', { useExisting: MokeLogger });
        return container.resolveAsync(module);
    }
    /**
     * Creates a MokeApplicationContext, compiling the module tree.
     * Does not automatically call `init()`.
     */
    static async createApplicationContext(module) {
        const container = new Container();
        // Core default registrations
        container.instance(MokeLogger, new MokeLogger());
        container.bind('Logger', { useExisting: MokeLogger });
        await this.compileModuleAsync(module, container, new Set());
        await container.resolveAsync(module); // Resolve the root module to trigger graph instantiation
        return new MokeApplicationContext(container);
    }
    static async compileModuleAsync(module, container, resolved) {
        if (resolved.has(module))
            return;
        resolved.add(module);
        const metadata = ReflectionHost.getModuleMetadata(module);
        if (!metadata) {
            container.singleton(module);
            return;
        }
        if (metadata.imports) {
            for (const imported of metadata.imports) {
                await this.compileModuleAsync(imported, container, resolved);
            }
        }
        if (metadata.providers) {
            for (const provider of metadata.providers) {
                if (typeof provider === 'function') {
                    container.singleton(provider);
                }
                else {
                    container.register(provider);
                }
            }
        }
        // Exports behavior in core is currently flattened globally.
        // Full module encapsulation (where providers are hidden) can be added later 
        // by using child containers per-module if needed.
        container.singleton(module);
    }
}
//# sourceMappingURL=application.js.map