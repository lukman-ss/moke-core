import { Container } from './container.js';
import { MokeLogger } from './logger.js';
export class MokeFactory {
    static create(module) {
        const container = new Container();
        // Default providers
        container.instance(MokeLogger, new MokeLogger());
        return container.resolve(module);
    }
    static async createAsync(module) {
        const container = new Container();
        // Default providers
        container.instance(MokeLogger, new MokeLogger());
        return container.resolveAsync(module);
    }
}
//# sourceMappingURL=application.js.map