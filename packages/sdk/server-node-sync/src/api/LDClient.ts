import { EventEmitter } from 'events';

import {
  LDContext,
  LDEvaluationDetail,
  LDEvaluationDetailTyped,
  LDFlagValue,
  LDLogger,
} from '@launchdarkly/js-sdk-common';

import {
  integrations,
  LDFlagsState,
  LDFlagsStateOptions,
  LDWaitForInitializationOptions,
} from '@launchdarkly/js-server-sdk-common';

type Hook = integrations.Hook;

/**
 * The LaunchDarkly SDK client object with synchronous variation methods.
 *
 * Create this object with {@link init}. Applications should configure the client at startup time
 * and continue to use it throughout the lifetime of the application, rather than creating instances
 * on the fly.
 *
 * This client differs from the standard server-side Node SDK in that variation methods are
 * synchronous. It does not support daemon mode, persistent stores, or big segments.
 */
export interface LDClient extends EventEmitter {
  /**
   * Tests whether the client has completed initialization.
   *
   * @returns
   *   True if the client has successfully initialized.
   */
  initialized(): boolean;

  /**
   * Returns a Promise that tracks the client's initialization state.
   *
   * The Promise will be resolved if the client successfully initializes, or rejected if client
   * initialization has failed unrecoverably (for instance, if it detects that the SDK key is
   * invalid).
   *
   * @param options Options which control the behavior of `waitForInitialization`.
   *
   * @returns
   * A Promise that will be resolved if the client initializes successfully, or rejected if it
   * fails.
   */
  waitForInitialization(options?: LDWaitForInitializationOptions): Promise<LDClient>;

  /**
   * Determines the variation of a feature flag for a context, returning the result synchronously.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag, to be used if the value is not available
   *   from LaunchDarkly.
   * @returns The flag variation value.
   */
  variation(key: string, context: LDContext, defaultValue: LDFlagValue): LDFlagValue;

  /**
   * Determines the variation of a feature flag for a context, along with information about how it
   * was calculated, returning the result synchronously.
   *
   * The `reason` property of the result will also be included in analytics events, if you are
   * capturing detailed event data for this flag.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag, to be used if the value is not available
   *   from LaunchDarkly.
   * @returns The evaluation detail.
   */
  variationDetail(
    key: string,
    context: LDContext,
    defaultValue: LDFlagValue,
  ): LDEvaluationDetail;

  /**
   * Determines the boolean variation of a feature flag for a context, returning the result
   * synchronously.
   *
   * If the flag variation does not have a boolean value, defaultValue is returned.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag.
   * @returns The boolean flag variation value.
   */
  boolVariation(key: string, context: LDContext, defaultValue: boolean): boolean;

  /**
   * Determines the numeric variation of a feature flag for a context, returning the result
   * synchronously.
   *
   * If the flag variation does not have a numeric value, defaultValue is returned.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag.
   * @returns The numeric flag variation value.
   */
  numberVariation(key: string, context: LDContext, defaultValue: number): number;

  /**
   * Determines the string variation of a feature flag for a context, returning the result
   * synchronously.
   *
   * If the flag variation does not have a string value, defaultValue is returned.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag.
   * @returns The string flag variation value.
   */
  stringVariation(key: string, context: LDContext, defaultValue: string): string;

  /**
   * Determines the variation of a feature flag for a context, returning the result synchronously.
   *
   * This version may be favored in TypeScript versus `variation` because it returns
   * an `unknown` type instead of `any`. `unknown` will require a cast before usage.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag.
   * @returns The flag variation value.
   */
  jsonVariation(key: string, context: LDContext, defaultValue: unknown): unknown;

  /**
   * Determines the boolean variation of a feature flag for a context, along with information about
   * how it was calculated, returning the result synchronously.
   *
   * If the flag variation does not have a boolean value, defaultValue is returned. The reason will
   * indicate an error of the type `WRONG_KIND` in this case.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag.
   * @returns The evaluation detail.
   */
  boolVariationDetail(
    key: string,
    context: LDContext,
    defaultValue: boolean,
  ): LDEvaluationDetailTyped<boolean>;

  /**
   * Determines the numeric variation of a feature flag for a context, along with information about
   * how it was calculated, returning the result synchronously.
   *
   * If the flag variation does not have a numeric value, defaultValue is returned. The reason will
   * indicate an error of the type `WRONG_KIND` in this case.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag.
   * @returns The evaluation detail.
   */
  numberVariationDetail(
    key: string,
    context: LDContext,
    defaultValue: number,
  ): LDEvaluationDetailTyped<number>;

  /**
   * Determines the string variation of a feature flag for a context, along with information about
   * how it was calculated, returning the result synchronously.
   *
   * If the flag variation does not have a string value, defaultValue is returned. The reason will
   * indicate an error of the type `WRONG_KIND` in this case.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag.
   * @returns The evaluation detail.
   */
  stringVariationDetail(
    key: string,
    context: LDContext,
    defaultValue: string,
  ): LDEvaluationDetailTyped<string>;

  /**
   * Determines the variation of a feature flag for a context, along with information about how it
   * was calculated, returning the result synchronously.
   *
   * This version may be favored in TypeScript versus `variationDetail` because it returns
   * an `unknown` type instead of `any`. `unknown` will require a cast before usage.
   *
   * @param key The unique key of the feature flag.
   * @param context The context requesting the flag.
   * @param defaultValue The default value of the flag.
   * @returns The evaluation detail.
   */
  jsonVariationDetail(
    key: string,
    context: LDContext,
    defaultValue: unknown,
  ): LDEvaluationDetailTyped<unknown>;

  /**
   * Builds an object that encapsulates the state of all feature flags for a given context.
   * This includes the flag values and also metadata that can be used on the front end. This
   * method does not send analytics events back to LaunchDarkly.
   *
   * @param context The context requesting the feature flags.
   * @param options Optional {@link LDFlagsStateOptions} to determine how the state is computed.
   * @returns The flags state object.
   */
  allFlagsState(context: LDContext, options?: LDFlagsStateOptions): LDFlagsState;

  /**
   * Computes an HMAC signature of a context signed with the client's SDK key.
   *
   * @param context The context properties.
   * @returns The hash string.
   */
  secureModeHash(context: LDContext): string;

  /**
   * Discards all network connections, background tasks, and other resources held by the client.
   *
   * Do not attempt to use the client after calling this method.
   */
  close(): void;

  /**
   * Tests whether the client is configured in offline mode.
   *
   * @returns True if the `offline` property is true in your {@link LDOptions}.
   */
  isOffline(): boolean;

  /**
   * Tracks that a context performed an event.
   *
   * @param key The name of the event.
   * @param context The context to track.
   * @param data Optional additional information to associate with the event.
   * @param metricValue A numeric value used by the LaunchDarkly experimentation feature in numeric
   *   custom metrics.
   */
  track(key: string, context: LDContext, data?: any, metricValue?: number): void;

  /**
   * Identifies a context to LaunchDarkly.
   *
   * This simply creates an analytics event that will transmit the given user properties to
   * LaunchDarkly, so that the context will be visible on your dashboard even if you have not
   * evaluated any flags for that user. It has no other effect.
   *
   * @param context The context properties. Must contain at least the `key` property.
   */
  identify(context: LDContext): void;

  /**
   * Flushes all pending analytics events.
   *
   * @param callback A function which will be called when the flush completes.
   * @returns A Promise which resolves once flushing is finished.
   */
  flush(callback?: (err: Error | null, res: boolean) => void): Promise<void>;

  /**
   * Add a hook to the client.
   *
   * @param hook The hook to add.
   */
  addHook?(hook: Hook): void;

  /**
   * Get the logger used by this LDClient instance.
   */
  get logger(): LDLogger | undefined;

  /**
   * Registers an event listener that will be called when the client triggers some type of event.
   *
   * - `"ready"`: Sent only once, when the client has successfully connected to LaunchDarkly.
   * - `"failed"`: Sent only once, if the client has permanently failed to connect to LaunchDarkly.
   * - `"error"`: Contains an error object describing some abnormal condition that the client has detected.
   * - `"update"`: The client has received a change to a feature flag.
   * - `"update:KEY"`: The client has received a change to the feature flag whose key is KEY.
   *
   * @param event the name of the event to listen for
   * @param listener the function to call when the event happens
   */
  on(event: string | symbol, listener: (...args: any[]) => void): this;
}
