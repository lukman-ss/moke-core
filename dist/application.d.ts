import { Constructor } from './types.js';
export declare class MokeFactory {
    static create<T>(module: Constructor<T>): T;
    static createAsync<T>(module: Constructor<T>): Promise<T>;
}
//# sourceMappingURL=application.d.ts.map