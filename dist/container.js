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
        return this.hasRegistration(this.getTokenKey(token));
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
    ensureRegistered(key, token) {
        if (!this.registrations.has(key)) {
            if (typeof token === 'function') {
                if (this.parent) {
                    this.parent.ensureRegistered(key, token);
                }
                else {
                    this.singleton(token);
                }
            }
            else {
                throw new UnknownProviderError(key);
            }
        }
    }
    createResolutionProxy(path) {
        return new Proxy(this, {
            get: (target, prop) => {
                if (prop === 'resolve') {
                    return (t) => target.internalResolveSync(t, path);
                }
                if (prop === 'resolveAsync') {
                    return (t) => target.internalResolveAsync(t, path);
                }
                const value = target[prop];
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            }
        });
    }
    internalResolveSync(token, path) {
        if (this.isDisposed)
            throw new Error('Cannot resolve from a disposed container');
        const key = this.getTokenKey(token);
        if (path.includes(key)) {
            throw new CircularDependencyError([...path, key]);
        }
        let reg = this.registrations.get(key);
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
                this.ensureRegistered(key, token);
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
    async internalResolveAsync(token, path) {
        if (this.isDisposed)
            throw new Error('Cannot resolve from a disposed container');
        const key = this.getTokenKey(token);
        if (path.includes(key)) {
            throw new CircularDependencyError([...path, key]);
        }
        let reg = this.registrations.get(key);
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
                this.ensureRegistered(key, token);
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