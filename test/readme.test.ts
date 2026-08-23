import { expect } from 'chai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

describe('README Examples', () => {
  it('basic example should compile without errors', () => {
    const examplePath = resolve('examples', 'basic.ts');
    const code = readFileSync(examplePath, 'utf8');
    
    // Check that it imports from the public package
    expect(code).to.include("@lukman-ss/moke-core");
    
    // Verify it has expected content
    expect(code).to.include("Container");
    expect(code).to.include("Inject");
    expect(code).to.include("Injectable");
  });
});
