"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MokeFactory = void 0;
const container_1 = require("./container");
const logger_1 = require("./logger");
class MokeFactory {
    static create(module) {
        const container = new container_1.Container();
        // Default providers
        container.register(logger_1.MokeLogger, new logger_1.MokeLogger());
        const app = container.resolve(module);
        return app;
    }
}
exports.MokeFactory = MokeFactory;
