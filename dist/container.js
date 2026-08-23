import 'reflect-metadata';
import { INJECT_METADATA_KEY } from './decorators.js';
import { AsyncProviderResolutionError, CircularDependencyError, InvalidProviderError } from './errors.js';
export class Container {
    registrations = new Map();
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
            scope = 'transient'; // Alias does not hold its own state/scope
        }
        this.registrations.set(key, { provider, scope });
    }
    singleton(token, providerDef) {
        this.bind(token, providerDef || token, 'singleton');
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
    }
    factory(token, factory, scope = 'singleton') {
        this.bind(token, { useFactory: factory }, scope);
    }
    has(token) {
        return this.registrations.has(this.getTokenKey(token));
    }
    resolve(token) {
        return this.internalResolveSync(token, []);
    }
    async resolveAsync(token) {
        return this.internalResolveAsync(token, []);
    }
    internalResolveSync(token, path) {
        const key = this.getTokenKey(token);
        if (path.includes(key)) {
            throw new CircularDependencyError([...path, key]);
        }
        this.ensureRegistered(key, token);
        const reg = this.registrations.get(key);
        if ('useExisting' in reg.provider) {
            return this.internalResolveSync(reg.provider.useExisting, [...path, key]);
        }
        if (reg.scope === 'singleton' && 'instance' in reg) {
            return reg.instance;
        }
        const instance = this.resolveProviderSync(reg.provider, key, [...path, key]);
        if (reg.scope === 'singleton') {
            reg.instance = instance;
        }
        return instance;
    }
    async internalResolveAsync(token, path) {
        const key = this.getTokenKey(token);
        this.ensureRegistered(key, token);
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
        if (reg.scope === 'singleton' && 'instance' in reg) {
            return reg.instance;
        }
        const resolutionPromise = this.resolveProviderAsync(reg.provider, [...path, key]);
        if (reg.scope === 'singleton') {
            reg.asyncPromise = resolutionPromise;
            try {
                reg.instance = await resolutionPromise;
                return reg.instance;
            }
            catch (e) {
                delete reg.asyncPromise;
                throw e;
            }
        }
        return resolutionPromise;
    }
    ensureRegistered(key, token) {
        if (!this.registrations.has(key)) {
            if (typeof token === 'function') {
                this.singleton(token);
            }
            else {
                throw new Error(`Cannot resolve dependency for token: ${String(key)}`);
            }
        }
    }
    resolveProviderSync(provider, key, path) {
        if ('useValue' in provider) {
            return provider.useValue;
        }
        if ('useFactory' in provider) {
            // Temporarily inject internalResolve to track path inside factory
            const originalResolve = this.resolve;
            try {
                this.resolve = (t) => this.internalResolveSync(t, path);
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
                this.resolveAsync = (t) => this.internalResolveAsync(t, path);
                this.resolve = (t) => this.internalResolveSync(t, path);
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
        const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
        const explicitInjections = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) || [];
        return paramTypes.map((type, index) => {
            const explicit = explicitInjections.find(e => e.index === index);
            if (explicit)
                return explicit.token;
            if (!type || type === Object) {
                throw new Error(`Cannot resolve constructor dependency at index ${index} for ${target.name}. Type is unknown or an interface. Use @Inject().`);
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