import 'reflect-metadata';

export function Injectable(): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata('injectable', true, target);
  };
}
