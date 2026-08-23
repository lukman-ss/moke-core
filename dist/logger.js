"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MokeLogger = void 0;
class MokeLogger {
    log(message) {
        console.log(`[Moke] ${message}`);
    }
    error(message, trace) {
        console.error(`[Moke ERROR] ${message}`, trace || '');
    }
}
exports.MokeLogger = MokeLogger;
