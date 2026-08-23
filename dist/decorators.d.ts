import 'reflect-metadata';
import { Token } from './types.js';
export declare const INJECT_METADATA_KEY: unique symbol;
export declare function Inject(token: Token): ParameterDecorator;
/**
 * Marks a class as injectable.
 * Currently permissive: Moke Container can resolve classes without this decorator,
 * provided they do not rely on TypeScript emitDecoratorMetadata for constructor arguments.
 * Using @Injectable() forces TypeScript to emit design:paramtypes metadata.
 */
export declare function Injectable(): ClassDecorator;
//# sourceMappingURL=decorators.d.ts.map