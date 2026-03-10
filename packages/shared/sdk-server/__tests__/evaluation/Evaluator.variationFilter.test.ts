import { AttributeReference, Context, LDContext } from '@launchdarkly/js-sdk-common';

import { Flag } from '../../src/evaluation/data/Flag';
import { FlagRule } from '../../src/evaluation/data/FlagRule';
import Evaluator from '../../src/evaluation/Evaluator';
import { VariationFilter } from '../../src/evaluation/VariationFilter';
import { createBasicPlatform } from '../createBasicPlatform';
import { makeClauseThatMatchesUser } from './flags';
import noQueries from './mocks/noQueries';

const basicUser: LDContext = { key: 'userkey' };

function makeFlagOn(overrides: Partial<Flag> = {}): Flag {
  return {
    key: 'feature',
    version: 1,
    on: true,
    fallthrough: { variation: 0 },
    offVariation: 1,
    variations: ['fall', 'off', 'target', 'rule1', 'rule2'],
    targets: [],
    rules: [],
    ...overrides,
  };
}

describe('given an evaluator with a variationFilter', () => {
  let evaluator: Evaluator;

  beforeEach(() => {
    evaluator = new Evaluator(createBasicPlatform(), noQueries);
  });

  it('serves fallback when off variation is filtered out', async () => {
    const flag = makeFlagOn({ on: false, offVariation: 1 });
    const filter: VariationFilter = (_ctx, variationId) => variationId !== 1;
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    // variationIndex should be null since the off variation was rejected
    expect(res.detail.variationIndex).toBeNull();
    expect(res.detail.value).toBeNull();
    expect(res.detail.reason.kind).toBe('OFF');
  });

  it('serves off variation when filter allows it', async () => {
    const flag = makeFlagOn({ on: false, offVariation: 1 });
    const filter: VariationFilter = () => true;
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    expect(res.detail.variationIndex).toBe(1);
    expect(res.detail.value).toBe('off');
    expect(res.detail.reason.kind).toBe('OFF');
  });

  it('skips target match when filter rejects the variation', async () => {
    const flag = makeFlagOn({
      targets: [{ values: ['userkey'], variation: 2 }],
      fallthrough: { variation: 0 },
    });
    // Reject variation 2 (the target), allow variation 0 (fallthrough)
    const filter: VariationFilter = (_ctx, variationId) => variationId !== 2;
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    // Should fall through to fallthrough since target was filtered
    expect(res.detail.variationIndex).toBe(0);
    expect(res.detail.value).toBe('fall');
    expect(res.detail.reason.kind).toBe('FALLTHROUGH');
  });

  it('serves target match when filter allows it', async () => {
    const flag = makeFlagOn({
      targets: [{ values: ['userkey'], variation: 2 }],
    });
    const filter: VariationFilter = () => true;
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    expect(res.detail.variationIndex).toBe(2);
    expect(res.detail.value).toBe('target');
    expect(res.detail.reason.kind).toBe('TARGET_MATCH');
  });

  it('skips rule match when filter rejects the variation and falls through', async () => {
    const matchClause = makeClauseThatMatchesUser(basicUser);
    const rule: FlagRule = { id: 'rule1', clauses: [matchClause], variation: 3 };
    const flag = makeFlagOn({
      rules: [rule],
      fallthrough: { variation: 0 },
    });
    // Reject variation 3 (the rule), allow variation 0 (fallthrough)
    const filter: VariationFilter = (_ctx, variationId) => variationId !== 3;
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    expect(res.detail.variationIndex).toBe(0);
    expect(res.detail.value).toBe('fall');
    expect(res.detail.reason.kind).toBe('FALLTHROUGH');
  });

  it('skips first rule and matches second rule when filter rejects first', async () => {
    const matchClause = makeClauseThatMatchesUser(basicUser);
    const rule1: FlagRule = { id: 'rule1', clauses: [matchClause], variation: 3 };
    const rule2: FlagRule = { id: 'rule2', clauses: [matchClause], variation: 4 };
    const flag = makeFlagOn({
      rules: [rule1, rule2],
      fallthrough: { variation: 0 },
    });
    // Reject variation 3 (rule1), allow variation 4 (rule2)
    const filter: VariationFilter = (_ctx, variationId) => variationId !== 3;
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    expect(res.detail.variationIndex).toBe(4);
    expect(res.detail.value).toBe('rule2');
    expect(res.detail.reason).toMatchObject({
      kind: 'RULE_MATCH',
      ruleIndex: 1,
      ruleId: 'rule2',
    });
  });

  it('serves fallback when fallthrough variation is filtered out', async () => {
    const flag = makeFlagOn({
      fallthrough: { variation: 0 },
    });
    // Reject all variations
    const filter: VariationFilter = () => false;
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    expect(res.detail.variationIndex).toBeNull();
    expect(res.detail.value).toBeNull();
    expect(res.detail.reason.kind).toBe('FALLTHROUGH');
  });

  it('serves fallthrough when filter allows it', async () => {
    const flag = makeFlagOn({
      fallthrough: { variation: 0 },
    });
    const filter: VariationFilter = () => true;
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    expect(res.detail.variationIndex).toBe(0);
    expect(res.detail.value).toBe('fall');
    expect(res.detail.reason.kind).toBe('FALLTHROUGH');
  });

  it('works normally without a filter', async () => {
    const matchClause = makeClauseThatMatchesUser(basicUser);
    const rule: FlagRule = { id: 'rule1', clauses: [matchClause], variation: 3 };
    const flag = makeFlagOn({ rules: [rule] });
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser));
    expect(res.detail.variationIndex).toBe(3);
    expect(res.detail.value).toBe('rule1');
  });

  it('passes correct arguments to the filter function', async () => {
    const flag = makeFlagOn({
      targets: [{ values: ['userkey'], variation: 2 }],
    });
    const filterCalls: Array<{ variationId: number; index: number; value: any }> = [];
    const filter: VariationFilter = (ctx, variationId, index, value) => {
      filterCalls.push({ variationId, index, value });
      return true;
    };
    await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    expect(filterCalls).toHaveLength(1);
    expect(filterCalls[0]).toEqual({
      variationId: 2,
      index: 2,
      value: 'target',
    });
  });

  it('handles contextTargets with filter', async () => {
    const flag = makeFlagOn({
      contextTargets: [{ contextKind: 'user', values: [], variation: 2 }],
      targets: [{ values: ['userkey'], variation: 2 }],
    });
    // Reject target variation, should fall through
    const filter: VariationFilter = (_ctx, variationId) => variationId !== 2;
    const res = await evaluator.evaluate(flag, Context.fromLDContext(basicUser), undefined, filter);
    expect(res.detail.reason.kind).toBe('FALLTHROUGH');
  });
});
