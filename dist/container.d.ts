import 'reflect-metadata';
type Constructor<T = any> = new (...args: any[]) => T;
export declare class Container {
    private providers;
    register(token: any, instance: any): void;
    resolve<T>(target: Constructor<T>): T;
}
export {};
