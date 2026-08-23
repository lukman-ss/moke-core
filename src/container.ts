import 'reflect-metadata';

type Constructor<T = any> = new (...args: any[]) => T;

export class Container {
  private providers = new Map<any, any>();

  register(token: any, instance: any) {
    this.providers.set(token, instance);
  }

  resolve<T>(target: Constructor<T>): T {
    if (this.providers.has(target)) {
      return this.providers.get(target);
    }

    const tokens = Reflect.getMetadata('design:paramtypes', target) || [];
    const injections = tokens.map((token: any) => this.resolve(token));

    const instance = new target(...injections);
    this.providers.set(target, instance);
    return instance;
  }
}
