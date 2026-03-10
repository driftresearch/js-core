import { Context } from '@launchdarkly/js-sdk-common';

/**
 * A function that filters whether a particular variation is allowed during evaluation.
 * If it returns false, the variation is treated as if the target/rule did not match.
 *
 * @param context The evaluation context.
 * @param variationId The variation index.
 * @param index The variation index.
 * @param value The variation value.
 * @returns true if the variation is allowed, false to skip it.
 */
export type VariationFilter = (
  context: Context,
  variationId: number,
  index: number,
  value: any,
) => boolean;
