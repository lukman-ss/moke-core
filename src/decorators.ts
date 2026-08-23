import 'reflect-metadata';
import { Token } from './types.js';

export const INJECT_METADATA_KEY = Symbol('moke:inject');

interface InjectMetadata {
  index: number;
  token: Token;
}

export function Inject(token: Token): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const injections: InjectMetadata[] = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) || [];
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
export function Injectable(): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata('injectable', true, target);
  };
}
