import { Token } from './types.js';
import { ReflectionHost } from './reflection.js';

export function Inject(token: Token): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    ReflectionHost.setExplicitInjection(target, parameterIndex, token);
  };
}

export function Injectable(): ClassDecorator {
  return (target: any) => {
    ReflectionHost.markInjectable(target);
  };
}
