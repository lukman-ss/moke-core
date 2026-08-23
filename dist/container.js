import 'reflect-metadata';
import { INJECT_METADATA_KEY } from './decorators.js';
export class Container {
    registrations = new Map();
    bind(token, providerDef, scope = 'singleton') {
        const key = this.getTokenKey(token);
        let provider;
        if (typeof providerDef === 'function') {
            provider = { provide: token, useClass: providerDef };
        }
        else {
            provider = providerDef;
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
            provider: { provide: token, useValue: value },
            scope: 'singleton',
            instance: value
        });
    }
    factory(token, factory, scope = 'singleton') {
        this.bind(token, { provide: token, useFactory: factory }, scope);
    }
    has(token) {
        return this.registrations.has(this.getTokenKey(token));
    }
    resolve(token) {
        const key = this.getTokenKey(token);
        if (!this.registrations.has(key)) {
            if (typeof token === 'function') {
                this.singleton(token);
            }
            else {
                throw new Error(`Cannot resolve dependency for token: ${String(key)}`);
            }
        }
        const reg = this.registrations.get(key);
        if (reg.scope === 'singleton' && 'instance' in reg) {
            return reg.instance;
        }
        const instance = this.resolveProvider(reg.provider);
        if (reg.scope === 'singleton') {
            reg.instance = instance;
        }
        return instance;
    }
    resolveProvider(provider) {
        if ('useValue' in provider) {
            return provider.useValue;
        }
        if ('useFactory' in provider) {
            return provider.useFactory(this);
        }
        if ('useExisting' in provider) {
            return this.resolve(provider.useExisting);
        }
        if ('useClass' in provider) {
            return this.instantiateClass(provider.useClass);
        }
    }
    instantiateClass(target) {
        const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
        const explicitInjections = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) || [];
        const injections = paramTypes.map((type, index) => {
            const explicit = explicitInjections.find(e => e.index === index);
            if (explicit) {
                return this.resolve(explicit.token);
            }
            if (!type || type === Object) {
                throw new Error(`Cannot resolve constructor dependency at index ${index} for ${target.name}. Type is unknown or an interface. Use @Inject().`);
            }
            return this.resolve(type);
        });
        return new target(...injections);
    }
    getTokenKey(token) {
        if (typeof token === 'object' && token !== null && 'key' in token) {
            return token.key;
        }
        return token;
    }
}
//# sourceMappingURL=container.js.map