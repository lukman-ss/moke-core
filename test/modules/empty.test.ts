import { expect } from 'chai';
import { MokeFactory } from '@lukman-ss/moke-core';
import { Module } from '@lukman-ss/moke-core';
import { Injectable } from '@lukman-ss/moke-core';

describe('Module - Empty Module', () => {
  it('should create module with no metadata', async () => {
    @Module({})
    class EmptyModule {}

    const app = await MokeFactory.createApplicationContext(EmptyModule);
    expect(app.state).to.equal('created');

    await app.init();
    expect(app.state).to.equal('ready');
  });

  it('should create module with empty providers array', async () => {
    @Module({
      providers: []
    })
    class EmptyProvidersModule {}

    const app = await MokeFactory.createApplicationContext(EmptyProvidersModule);
    await app.init();

    expect(app.state).to.equal('ready');
  });
});
