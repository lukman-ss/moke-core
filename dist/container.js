"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Container = void 0;
require("reflect-metadata");
class Container {
    constructor() {
        this.providers = new Map();
    }
    register(token, instance) {
        this.providers.set(token, instance);
    }
    resolve(target) {
        if (this.providers.has(target)) {
            return this.providers.get(target);
        }
        const tokens = Reflect.getMetadata('design:paramtypes', target) || [];
        const injections = tokens.map((token) => this.resolve(token));
        const instance = new target(...injections);
        this.providers.set(target, instance);
        return instance;
    }
}
exports.Container = Container;
