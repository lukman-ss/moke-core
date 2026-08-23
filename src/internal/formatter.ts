import { Token, InjectionToken } from '../types.js';

export function formatToken(token: unknown): string {
  if (typeof token === 'function') {
    return token.name || 'AnonymousClass';
  }
  
  if (typeof token === 'string') {
    return `"${token}"`;
  }
  
  if (typeof token === 'symbol') {
    return token.toString();
  }
  
  if (typeof token === 'object' && token !== null && 'key' in token) {
    const injToken = token as InjectionToken<unknown>;
    return injToken.description || injToken.key.toString();
  }
  
  return String(token);
}

export function formatPath(path: unknown[]): string {
  return path.map(formatToken).join('\n→ ');
}
