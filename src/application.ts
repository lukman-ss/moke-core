import { Container } from './container.js';
import { MokeLogger } from './logger.js';
import { Constructor } from './types.js';

export class MokeFactory {
  static create<T>(module: Constructor<T>): T {
    const container = new Container();
    
    // Default providers
    container.instance(MokeLogger, new MokeLogger());
    
    return container.resolve(module);
  }

  static async createAsync<T>(module: Constructor<T>): Promise<T> {
    const container = new Container();
    
    // Default providers
    container.instance(MokeLogger, new MokeLogger());
    
    return container.resolveAsync(module);
  }
}
