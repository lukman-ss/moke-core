import { Constructor } from './types.js';
import { ReflectionHost } from './reflection.js';

export interface ModuleMetadata {
  imports?: Constructor<unknown>[];
  providers?: any[];
  exports?: any[];
}

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: any) => {
    ReflectionHost.setModuleMetadata(target, metadata);
  };
}
