import { Container } from './container.js';
import { MokeLogger } from './logger.js';
export class MokeFactory {
    static create(module) {
        const container = new Container();
        // Default providers
        container.instance(MokeLogger, new MokeLogger());
        const app = container.resolve(module);
        return app;
    }
}
//# sourceMappingURL=application.js.map