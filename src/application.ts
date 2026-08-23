import { Container } from './container';
import { MokeLogger } from './logger';

export class MokeFactory {
  static create(module: any) {
    const container = new Container();
    
    // Default providers
    container.register(MokeLogger, new MokeLogger());
    
    const app = container.resolve(module);
    return app;
  }
}
