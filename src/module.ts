import { Constructor, Token } from './types.js';
import { ProviderDefinition } from './providers.js';
import { ReflectionHost } from './reflection.js';

export interface ModuleMetadata {
  imports?: Constructor<unknown>[];
  providers?: ProviderDefinition[];
  exports?: Token[];
  controllers?: Constructor<unknown>[];
}

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: any) => {
    ReflectionHost.setModuleMetadata(target, metadata);
  };
}
