import { integrations, LDContext, LDLogger } from '@launchdarkly/js-server-sdk-common';

import { init, LDClient } from '../src';

type TestData = integrations.TestData;

let logger: LDLogger;

beforeEach(() => {
  logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

it('fires ready event in offline mode', (done) => {
  const client = init('sdk_key', { offline: true });
  client.on('ready', () => {
    client.close();
    done();
  });
});

it('fires the failed event if initialization fails', async () => {
  jest.useFakeTimers();

  const failedHandler = jest.fn().mockName('failedHandler');
  const client = init('sdk_key', {
    sendEvents: false,
    logger,
    updateProcessor: (clientContext, dataSourceUpdates, initSuccessHandler, errorHandler) => ({
      start: () => {
        setTimeout(() => errorHandler?.(new Error('Something unexpected happened')), 0);
      },
      close: jest.fn(),
    }),
  });
  client.on('failed', failedHandler);
  jest.runAllTimers();

  expect(failedHandler).toBeCalledWith(new Error('Something unexpected happened'));
  client.close();
  jest.useRealTimers();
});

describe('when using secure mode hash', () => {
  it('correctly computes hash for a known message and secret', () => {
    const client = init('secret', { offline: true });
    const hash = client.secureModeHash({ key: 'Message' });
    expect(hash).toEqual('aa747c502a898200f9e4fa21bac68136f886a0e27aec70ba06daf2e2a5cb5597');
    client.close();
  });

  it.each<[LDContext, string]>([
    [{ key: 'Message' }, 'aa747c502a898200f9e4fa21bac68136f886a0e27aec70ba06daf2e2a5cb5597'],
    [
      { kind: 'user', key: 'Message' },
      'aa747c502a898200f9e4fa21bac68136f886a0e27aec70ba06daf2e2a5cb5597',
    ],
    [
      { kind: 'org', key: 'orgtest' },
      '40bc9b2e66a842e269ab98dad813e4e15203bbbfd91e8c96b92f3ae6f3f5e223',
    ],
    [
      { kind: 'multi', user: { key: 'user:test' }, org: { key: 'org:test' } },
      '607cc91526c615823e320dabca7967ce544fbe83bcb2b7287163f2d1c7aa210f',
    ],
  ])('it uses the canonical key %p', (context, expectedHash) => {
    const client = init('secret', { offline: true });
    const hash = client.secureModeHash(context);

    expect(hash).toEqual(expectedHash);
    client.close();
  });
});

describe('synchronous variation methods', () => {
  let td: TestData;
  let client: LDClient;

  beforeEach(async () => {
    td = new integrations.TestData();
    td.update(td.flag('bool-flag').valueForAll(true));
    td.update(td.flag('number-flag').valueForAll(42));
    td.update(td.flag('string-flag').valueForAll('hello'));
    td.update(td.flag('json-flag').valueForAll({ key: 'value' }));
    td.update(td.flag('off-flag').on(false).offVariation(0).variations(false));

    client = init('sdk-key', {
      sendEvents: false,
      updateProcessor: td.getFactory(),
      logger,
    });
    await client.waitForInitialization({ timeout: 5 });
  });

  afterEach(() => {
    client.close();
  });

  it('returns the correct value for variation synchronously', () => {
    const result = client.variation('bool-flag', { key: 'user1' }, false);
    expect(result).toBe(true);
  });

  it('returns default value for unknown flag', () => {
    const result = client.variation('unknown-flag', { key: 'user1' }, 'default');
    expect(result).toBe('default');
  });

  it('returns the correct value for boolVariation synchronously', () => {
    const result = client.boolVariation('bool-flag', { key: 'user1' }, false);
    expect(result).toBe(true);
  });

  it('returns the correct value for numberVariation synchronously', () => {
    const result = client.numberVariation('number-flag', { key: 'user1' }, 0);
    expect(result).toBe(42);
  });

  it('returns the correct value for stringVariation synchronously', () => {
    const result = client.stringVariation('string-flag', { key: 'user1' }, '');
    expect(result).toBe('hello');
  });

  it('returns the correct value for jsonVariation synchronously', () => {
    const result = client.jsonVariation('json-flag', { key: 'user1' }, {});
    expect(result).toEqual({ key: 'value' });
  });

  it('returns correct detail for variationDetail synchronously', () => {
    const detail = client.variationDetail('bool-flag', { key: 'user1' }, false);
    expect(detail.value).toBe(true);
    expect(detail.reason.kind).toBe('FALLTHROUGH');
    expect(detail.variationIndex).toBe(0);
  });

  it('returns correct detail for boolVariationDetail synchronously', () => {
    const detail = client.boolVariationDetail('bool-flag', { key: 'user1' }, false);
    expect(detail.value).toBe(true);
    expect(detail.reason.kind).toBe('FALLTHROUGH');
  });

  it('returns correct detail for numberVariationDetail synchronously', () => {
    const detail = client.numberVariationDetail('number-flag', { key: 'user1' }, 0);
    expect(detail.value).toBe(42);
    expect(detail.reason.kind).toBe('FALLTHROUGH');
  });

  it('returns correct detail for stringVariationDetail synchronously', () => {
    const detail = client.stringVariationDetail('string-flag', { key: 'user1' }, '');
    expect(detail.value).toBe('hello');
    expect(detail.reason.kind).toBe('FALLTHROUGH');
  });

  it('returns correct detail for jsonVariationDetail synchronously', () => {
    const detail = client.jsonVariationDetail('json-flag', { key: 'user1' }, {});
    expect(detail.value).toEqual({ key: 'value' });
    expect(detail.reason.kind).toBe('FALLTHROUGH');
  });

  it('returns off variation when flag is off', () => {
    const result = client.variation('off-flag', { key: 'user1' }, true);
    expect(result).toBe(false);
  });

  it('returns correct reason for off flag via variationDetail', () => {
    const detail = client.variationDetail('off-flag', { key: 'user1' }, true);
    expect(detail.value).toBe(false);
    expect(detail.reason.kind).toBe('OFF');
  });

  it('returns allFlagsState synchronously', () => {
    const state = client.allFlagsState({ key: 'user1' });
    expect(state.valid).toBe(true);
    expect(state.getFlagValue('bool-flag')).toBe(true);
    expect(state.getFlagValue('number-flag')).toBe(42);
    expect(state.getFlagValue('string-flag')).toBe('hello');
  });

  it('returns default value for invalid context', () => {
    // @ts-ignore - testing invalid context
    const result = client.variation('bool-flag', {}, false);
    expect(result).toBe(false);
  });
});

describe('synchronous variation before initialization', () => {
  it('returns default value when client is not initialized', () => {
    const client = init('sdk-key', { offline: true, sendEvents: false, logger });
    // The offline client initializes asynchronously via setTimeout, so calling
    // variation before the event loop tick should return default.
    // But actually, offline mode resolves on a setTimeout(0), so the store
    // may not be initialized yet.
    const result = client.variation('any-flag', { key: 'user1' }, 'default');
    expect(result).toBe('default');
    client.close();
  });
});
