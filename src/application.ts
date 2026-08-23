import { Container } from './container.js';
import { MokeLogger } from './logger.js';
import { Constructor } from './types.js';

export class MokeFactory {
  static create<T>(module: Constructor<T>): T {
    const container = new Container();
    
    // Default providers
    container.instance(MokeLogger, new MokeLogger());
    
    const app = container.resolve(module);
    return app;
  }
}
