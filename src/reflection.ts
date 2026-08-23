import 'reflect-metadata';
import { Constructor, Token } from './types.js';

export const METADATA_KEYS = {
  INJECTABLE: Symbol.for('moke:injectable'),
  INJECT: Symbol.for('moke:inject'),
  MODULE: Symbol.for('moke:module'),
  DESIGN_PARAM_TYPES: 'design:paramtypes',
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
