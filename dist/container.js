import 'reflect-metadata';
import { ReflectionHost } from './reflection.js';
import { AsyncProviderResolutionError, CircularDependencyError, InvalidProviderError, UnknownProviderError, DependencyResolutionError } from './errors.js';
export class Container {
    parent;
    registrations = new Map();
    instantiatedInstances = new Set();
    isDisposed = false;
    constructor(parent) {
        this.parent = parent;
    }
    createChild() {
        return new Container(this);
    }
    register(provider, scope = 'singleton') {
        if (!('provide' in provider) || provider.provide === undefined) {
            throw new InvalidProviderError('Provider must have a "provide" property when using register()');
        }
        this.bind(provider.provide, provider, scope);
    }
    bind(token, providerDef, scope = 'singleton') {
        const key = this.getTokenKey(token);
        let provider;
        if (typeof providerDef === 'function') {
            provider = { useClass: providerDef };
        }
        else {
            provider = providerDef;
            if ('provide' in provider && provider.provide !== undefined && provider.provide !== token) {
                throw new InvalidProviderError(`Mismatch between bound token and provider.provide`);
            }
        }
        if (!('useClass' in provider) && !('useValue' in provider) && !('useFactory' in provider) && !('useExisting' in provider)) {
            throw new InvalidProviderError(`Provider definition is invalid. Must provide useClass, useValue, useFactory, or useExisting.`);
        }
        if ('useExisting' in provider) {
            scope = 'transient';
        }
        this.registrations.set(key, { provider, scope });
    }
    singleton(token, providerDef) {
        this.bind(token, providerDef || token, 'singleton');
    }
    scoped(token, providerDef) {
        this.bind(token, providerDef || token, 'scoped');
    }
    transient(token, providerDef) {
        this.bind(token, providerDef || token, 'transient');
    }
    instance(token, value) {
        this.registrations.set(this.getTokenKey(token), {
            provider: { useValue: value },
            scope: 'singleton',
            instance: value
        });
        this.instantiatedInstances.add(value);
    }
    factory(token, factory, scope = 'singleton') {
        this.bind(token, { useFactory: factory }, scope);
    }
    has(token) {
        if (this.registrations.has(this.getTokenKey(token)))
            return true;
        return this.parent ? this.parent.has(token) : false;
    }
    resolve(token) {
        try {
            return this.internalResolveSync(token, []);
        }
        catch (e) {
            if (e.name === 'DependencyResolutionError' || e.name === 'CircularDependencyError' || e.name === 'UnknownProviderError' || e.name === 'AsyncProviderResolutionError')
                throw e;
            throw new DependencyResolutionError(token, e);
        }
    }
    async resolveAsync(token) {
        try {
            return await this.internalResolveAsync(token, []);
        }
        catch (e) {
            if (e.name === 'DependencyResolutionError' || e.name === 'CircularDependencyError' || e.name === 'UnknownProviderError')
                throw e;
            throw new DependencyResolutionError(token, e);
        }
    }
    dispose() {
        this.isDisposed = true;
        this.registrations.clear();
        this.instantiatedInstances.clear();
    }
    getInstantiatedInstances() {
        return Array.from(this.instantiatedInstances);
    }
    internalResolveSync(token, path) {
        if (this.isDisposed)
            throw new Error('Cannot resolve from a disposed container');
        const key = this.getTokenKey(token);
        if (path.includes(key)) {
            throw new CircularDependencyError([...path, key]);
        }
        if (!this.registrations.has(key)) {
            if (this.parent && this.parent.has(token)) {
                return this.parent.internalResolveSync(token, path);
            }
            this.ensureRegistered(key, token);
        }
        const reg = this.registrations.get(key);
        if ('useExisting' in reg.provider) {
            return this.internalResolveSync(reg.provider.useExisting, [...path, key]);
        }
        if (reg.scope === 'singleton' && this.parent && !this.registrations.has(key)) {
            return this.parent.internalResolveSync(token, path);
        }
        if ((reg.scope === 'singleton' || reg.scope === 'scoped') && 'instance' in reg) {
            return reg.instance;
        }
        const instance = this.resolveProviderSync(reg.provider, key, [...path, key]);
        if (reg.scope === 'singleton' || reg.scope === 'scoped') {
            reg.instance = instance;
        }
        if (reg.scope !== 'transient' && instance && typeof instance === 'object') {
            this.instantiatedInstances.add(instance);
        }
        return instance;
    }
    async internalResolveAsync(token, path) {
        if (this.isDisposed)
            throw new Error('Cannot resolve from a disposed container');
        const key = this.getTokenKey(token);
        if (!this.registrations.has(key)) {
            if (this.parent && this.parent.has(token)) {
                return this.parent.internalResolveAsync(token, path);
            }
            this.ensureRegistered(key, token);
        }
        const reg = this.registrations.get(key);
        if (reg.scope === 'singleton' && reg.asyncPromise) {
            return reg.asyncPromise;
        }
        if (path.includes(key)) {
            throw new CircularDependencyError([...path, key]);
        }
        if ('useExisting' in reg.provider) {
            return this.internalResolveAsync(reg.provider.useExisting, [...path, key]);
        }
        if (reg.scope === 'singleton' && this.parent && !this.registrations.has(key)) {
            return this.parent.internalResolveAsync(token, path);
        }
        if ((reg.scope === 'singleton' || reg.scope === 'scoped') && 'instance' in reg) {
            return reg.instance;
        }
        const resolutionPromise = this.resolveProviderAsync(reg.provider, [...path, key]);
        if (reg.scope === 'singleton' || reg.scope === 'scoped') {
            reg.asyncPromise = resolutionPromise;
            try {
                reg.instance = await resolutionPromise;
                if (reg.instance && typeof reg.instance === 'object') {
                    this.instantiatedInstances.add(reg.instance);
                }
                return reg.instance;
            }
            catch (e) {
                delete reg.asyncPromise;
                throw e;
            }
        }
        return await resolutionPromise;
    }
    ensureRegistered(key, token) {
        if (!this.registrations.has(key)) {
            if (typeof token === 'function') {
                this.singleton(token);
            }
            else {
                throw new UnknownProviderError(key);
            }
        }
    }
    resolveProviderSync(provider, key, path) {
        if ('useValue' in provider) {
            return provider.useValue;
        }
        if ('useFactory' in provider) {
            const originalResolve = this.resolve;
            try {
                this.resolve = ((t) => this.internalResolveSync(t, path));
                const result = provider.useFactory(this);
                if (result instanceof Promise) {
                    throw new AsyncProviderResolutionError(key);
                }
                return result;
            }
            finally {
                this.resolve = originalResolve;
            }
        }
        if ('useClass' in provider) {
            return this.instantiateClassSync(provider.useClass, path);
        }
    }
    async resolveProviderAsync(provider, path) {
        if ('useValue' in provider) {
            return provider.useValue;
        }
        if ('useFactory' in provider) {
            const originalResolveAsync = this.resolveAsync;
            const originalResolve = this.resolve;
            try {
                this.resolveAsync = ((t) => this.internalResolveAsync(t, path));
                this.resolve = ((t) => this.internalResolveSync(t, path));
                return await provider.useFactory(this);
            }
            finally {
                this.resolveAsync = originalResolveAsync;
                this.resolve = originalResolve;
            }
        }
        if ('useClass' in provider) {
            return this.instantiateClassAsync(provider.useClass, path);
        }
    }
    instantiateClassSync(target, path) {
        const injections = this.getConstructorInjections(target).map(t => this.internalResolveSync(t, path));
        return new target(...injections);
    }
    async instantiateClassAsync(target, path) {
        const injections = await Promise.all(this.getConstructorInjections(target).map(t => this.internalResolveAsync(t, path)));
        return new target(...injections);
    }
    getConstructorInjections(target) {
        const paramTypes = ReflectionHost.getParamTypes(target);
        const explicitInjections = ReflectionHost.getExplicitInjections(target);
        return paramTypes.map((type, index) => {
            const explicit = explicitInjections.find(e => e.index === index);
            if (explicit)
                return explicit.token;
            if (!type || type === Object) {
                throw new UnknownProviderError(null, index, target.name);
            }
            return type;
        });
    }
    getTokenKey(token) {
        if (typeof token === 'object' && token !== null && 'key' in token) {
            return token.key;
        }
        return token;
    }
}
//# sourceMappingURL=container.js.map