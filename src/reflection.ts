import 'reflect-metadata';
import { Constructor, Token } from './types.js';

const INJECTABLE_METADATA = Symbol('moke:injectable');
const INJECT_METADATA = Symbol('moke:inject');
const MODULE_METADATA = Symbol('moke:module');
const DESIGN_PARAM_TYPES = 'design:paramtypes';

export const METADATA_KEYS = {
  INJECTABLE: INJECTABLE_METADATA,
  INJECT: INJECT_METADATA,
  MODULE: MODULE_METADATA,
  DESIGN_PARAM_TYPES,
} as const;

export interface InjectMetadata {
  index: number;
  token: Token;
}

export class ReflectionHost {
  static getParamTypes(target: Constructor<unknown>): unknown[] {
    return Reflect.getMetadata(METADATA_KEYS.DESIGN_PARAM_TYPES, target) || [];
  }

  static getExplicitInjections(target: Constructor<unknown>): InjectMetadata[] {
    return Reflect.getOwnMetadata(METADATA_KEYS.INJECT, target) || [];
  }

  static setExplicitInjection(target: object, index: number, token: Token): void {
    const injections: InjectMetadata[] = Reflect.getOwnMetadata(METADATA_KEYS.INJECT, target) || [];
    injections.push({ index, token });
    Reflect.defineMetadata(METADATA_KEYS.INJECT, injections, target);
  }

  static markInjectable(target: object): void {
    Reflect.defineMetadata(METADATA_KEYS.INJECTABLE, true, target);
  }

  static getModuleMetadata(target: Constructor<unknown>): any {
    return Reflect.getMetadata(METADATA_KEYS.MODULE, target);
  }

  static setModuleMetadata(target: object, metadata: any): void {
    Reflect.defineMetadata(METADATA_KEYS.MODULE, metadata, target);
  }
}
