"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Injectable = Injectable;
require("reflect-metadata");
function Injectable() {
    return (target) => {
        Reflect.defineMetadata('injectable', true, target);
    };
}
