import 'reflect-metadata';
import { ReflectionHost } from './reflection.js';
import { AsyncProviderResolutionError, CircularDependencyError, InvalidProviderError, UnknownProviderError, DependencyResolutionError, DuplicateProviderError, PrimitiveDependencyError } from './errors.js';
export class Container {
    parent;
    registrations = new Map();
    instantiatedInstances = new Set();
    isDisposed = false;
    isActiveResolution = false;
    isFrozen = false;
    constructor(parent) {
        this.parent = parent;
    }
    createChild() {
        return new Container(this);
    }
    freeze() {
        this.isFrozen = true;
    }
    unfrozen() {
        return !this.isFrozen;
    }
    register(provider, scope = 'singleton') {
        if (this.isActiveResolution) {
            throw new Error('Cannot register providers during active resolution');
        }
        if (this.isFrozen) {
            throw new Error('Cannot register providers on a frozen container. Container is already initialized.');
        }
        if (!('provide' in provider) || provider.provide === undefined) {
            throw new InvalidProviderError('Provider must have a "provide" property when using register()');
        }
        const key = this.getTokenKey(provider.provide);
        if (this.hasOwn(provider.provide)) {
            throw new DuplicateProviderError(key);
        }
        this.bind(provider.provide, provider, scope);
    }
    bind(token, providerDef, scope = 'singleton') {
        this.internalBind(token, providerDef, scope, false);
    }
    override(token, providerDef, scope = 'singleton') {
        this.internalBind(token, providerDef, scope, true);
    }
    internalBind(token, providerDef, scope, isOverride) {
        if (this.isFrozen) {
            throw new Error('Cannot register providers on a frozen container. Container is already initialized.');
        }
        const key = this.getTokenKey(token);
        if (!isOverride && this.hasOwn(token)) {
            throw new DuplicateProviderError(key);
        }
        if (isOverride && this.registrations.has(key)) {
            const existing = this.registrations.get(key);
            // Clean up old instances/promises to allow immediate substitution
            if (existing.instance && typeof existing.instance === 'object') {
                this.instantiatedInstances.delete(existing.instance);
            }
        }
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
        // Always create a fresh registration entry without instance or asyncPromise attached
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
        const key = this.getTokenKey(token);
        if (this.hasOwn(token))
            throw new DuplicateProviderError(key);
        this.registrations.set(key, {
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
        return this.hasRegistration(this.getTokenKey(token));
    }
    hasOwn(token) {
        return this.registrations.has(this.getTokenKey(token));
    }
    resolve(token) {
        try {
            return this.internalResolveSync(token, []);
        }
        catch (e) {
            if (e.name === 'DependencyResolutionError')
                throw e;
            throw new DependencyResolutionError(token, e, []);
        }
    }
    async resolveAsync(token) {
        try {
            return await this.internalResolveAsync(token, []);
        }
        catch (e) {
            if (e.name === 'DependencyResolutionError')
                throw e;
            throw new DependencyResolutionError(token, e, []);
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
    hasRegistration(key) {
        if (this.registrations.has(key))
            return true;
        return this.parent ? this.parent.hasRegistration(key) : false;
    }
    getRegistrationRecursively(key) {
        if (this.registrations.has(key))
            return this.registrations.get(key);
        if (this.parent)
            return this.parent.getRegistrationRecursively(key);
        return undefined;
    }
    ensureRegistered(key, token, path) {
        if (!this.registrations.has(key)) {
            if (typeof token === 'function') {
                if (this.parent) {
                    this.parent.ensureRegistered(key, token, path);
                }
                else {
                    this.singleton(token);
                }
            }
            else {
                throw new UnknownProviderError(key, undefined, undefined, path);
            }
        }
    }
    createResolutionProxy(path) {
        const resolve = (token) => this.internalResolveSync(token, path);
        const resolveAsync = (token) => this.internalResolveAsync(token, path);
        return {
            resolve,
            resolveAsync
        };
    }
    internalResolveSync(token, path) {
        if (this.isDisposed)
            throw new Error('Cannot resolve from a disposed container');
        const key = this.getTokenKey(token);
        if (path.includes(key)) {
            throw new CircularDependencyError([...path, key]);
        }
        let reg = this.registrations.get(key);
        try {
            if (!reg) {
                if (this.hasRegistration(key)) {
                    const parentReg = this.getRegistrationRecursively(key);
                    if (parentReg.scope === 'singleton' || parentReg.scope === 'transient') {
                        return this.parent.internalResolveSync(token, path);
                    }
                    else if (parentReg.scope === 'scoped') {
                        reg = { provider: parentReg.provider, scope: 'scoped' };
                        this.registrations.set(key, reg);
                    }
                }
                else {
                    this.ensureRegistered(key, token, path);
                    return this.internalResolveSync(token, path);
                }
            }
            if ('useExisting' in reg.provider) {
                return this.internalResolveSync(reg.provider.useExisting, [...path, key]);
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
        catch (e) {
            if (e.name === 'DependencyResolutionError')
                throw e;
            throw new DependencyResolutionError(token, e, path);
        }
    }
    async internalResolveAsync(token, path) {
        if (this.isDisposed)
            throw new Error('Cannot resolve from a disposed container');
        const key = this.getTokenKey(token);
        if (path.includes(key)) {
            throw new CircularDependencyError([...path, key]);
        }
        let reg = this.registrations.get(key);
        try {
            if (!reg) {
                if (this.hasRegistration(key)) {
                    const parentReg = this.getRegistrationRecursively(key);
                    if (parentReg.scope === 'singleton' || parentReg.scope === 'transient') {
                        return this.parent.internalResolveAsync(token, path);
                    }
                    else if (parentReg.scope === 'scoped') {
                        reg = { provider: parentReg.provider, scope: 'scoped' };
                        this.registrations.set(key, reg);
                    }
                }
                else {
                    this.ensureRegistered(key, token, path);
                    return this.internalResolveAsync(token, path);
                }
            }
            if ('useExisting' in reg.provider) {
                return this.internalResolveAsync(reg.provider.useExisting, [...path, key]);
            }
            if ((reg.scope === 'singleton' || reg.scope === 'scoped') && 'instance' in reg) {
                return reg.instance;
            }
            if ((reg.scope === 'singleton' || reg.scope === 'scoped') && reg.asyncPromise) {
                return reg.asyncPromise;
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
        catch (e) {
            if (e.name === 'DependencyResolutionError')
                throw e;
            throw new DependencyResolutionError(token, e, path);
        }
    }
    resolveProviderSync(provider, key, path) {
        if ('useValue' in provider) {
            return provider.useValue;
        }
        if ('useFactory' in provider) {
            const proxy = this.createResolutionProxy(path);
            const result = provider.useFactory(proxy);
            if (result instanceof Promise) {
                throw new AsyncProviderResolutionError(key);
            }
            return result;
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
            const proxy = this.createResolutionProxy(path);
            return await provider.useFactory(proxy);
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
            if (!type) {
                throw new UnknownProviderError(null, index, target.name);
            }
            if (type === String || type === Number || type === Boolean || type === Object || type === Array || type === Function || type === Promise || type === Symbol) {
                throw new PrimitiveDependencyError(index, target.name);
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