import 'reflect-metadata';
export const INJECT_METADATA_KEY = Symbol('moke:inject');
export function Inject(token) {
    return (target, propertyKey, parameterIndex) => {
        const injections = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) || [];
        injections.push({ index: parameterIndex, token });
        Reflect.defineMetadata(INJECT_METADATA_KEY, injections, target);
    };
}
/**
 * Marks a class as injectable.
 * Currently permissive: Moke Container can resolve classes without this decorator,
 * provided they do not rely on TypeScript emitDecoratorMetadata for constructor arguments.
 * Using @Injectable() forces TypeScript to emit design:paramtypes metadata.
 */
export function Injectable() {
    return (target) => {
        Reflect.defineMetadata('injectable', true, target);
    };
}
//# sourceMappingURL=decorators.js.map