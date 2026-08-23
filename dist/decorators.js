import { ReflectionHost } from './reflection.js';
export function Inject(token) {
    return (target, propertyKey, parameterIndex) => {
        ReflectionHost.setExplicitInjection(target, parameterIndex, token);
    };
}
export function Injectable() {
    return (target) => {
        ReflectionHost.markInjectable(target);
    };
}
//# sourceMappingURL=decorators.js.map