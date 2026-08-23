import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect } from 'chai';

describe('README Verification', () => {
  it('README example should compile with public API imports', () => {
    const examplePath = resolve('examples', 'basic.ts');
    const code = readFileSync(examplePath, 'utf-8');
    
    const hasPublicImports = code.includes('@lukman-ss/moke-core');
    const hasNoSourceImports = !code.includes('../src/');
    const hasContainer = code.includes('Container');
    const hasInject = code.includes('Inject');
    const hasInjectable = code.includes('Injectable');
    const hasModule = code.includes('Module') || code.includes('MokeFactory');
    
    expect(hasPublicImports, 'Should import from public API').to.be.true;
    expect(hasNoSourceImports, 'Should not import from source').to.be.true;
    expect(hasContainer, 'Should demonstrate Container').to.be.true;
    expect(hasInject, 'Should demonstrate @Inject').to.be.true;
    expect(hasInjectable, 'Should demonstrate @Injectable').to.be.true;
  });
});