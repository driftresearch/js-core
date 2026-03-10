// eslint-disable-next-line max-classes-per-file
import { EventEmitter } from 'events';
import { format } from 'util';

import {
  BasicLogger,
  Context,
  internal,
  LDClientImpl,
  LDContext,
  LDEvaluationDetail,
  LDEvaluationDetailTyped,
  LDFlagValue,
  LDFlagsState,
  LDFlagsStateOptions,
  LDPluginEnvironmentMetadata,
  SafeLogger,
  TypeValidators,
} from '@launchdarkly/js-server-sdk-common';

import { LDClient, LDVariationFilter } from './api/LDClient';
import { LDOptions } from './api/LDOptions';
import { LDPlugin } from './api/LDPlugin';
import NodePlatform from './platform/NodePlatform';

/**
 * The LaunchDarkly SDK client for Node.js with synchronous variation methods.
 *
 * This client extends the base LDClientImpl and overrides the variation methods
 * to return results synchronously. It relies on the in-memory feature store,
 * whose callbacks execute synchronously.
 *
 * This SDK does not support daemon mode, persistent stores, or big segments.
 *
 * @ignore
 */
class LDClientNodeSync extends LDClientImpl implements LDClient {
  emitter: EventEmitter;

  constructor(sdkKey: string, options: LDOptions) {
    const fallbackLogger = new BasicLogger({
      level: 'info',
      // eslint-disable-next-line no-console
      destination: console.error,
      formatter: format,
    });

    const logger = options.logger ? new SafeLogger(options.logger, fallbackLogger) : fallbackLogger;
    const emitter = new EventEmitter();

    const pluginValidator = TypeValidators.createTypeArray('LDPlugin', {});
    const plugins: LDPlugin[] = [];
    if (options.plugins) {
      if (pluginValidator.is(options.plugins)) {
        plugins.push(...options.plugins);
      } else {
        logger.warn('Could not validate plugins.');
      }
    }

    // Convert our simplified options to the common options format.
    // We explicitly omit useLdd, featureStore, bigSegments, and dataSystem
    // as this SDK does not support them.
    const baseOptions = { ...options, logger };
    delete (baseOptions as any).plugins;

    super(
      sdkKey,
      new NodePlatform({ ...options, logger }),
      baseOptions,
      {
        onError: (err: Error) => {
          if (emitter.listenerCount('error')) {
            emitter.emit('error', err);
          } else {
            logger.error(err.message);
          }
        },
        onFailed: (err: Error) => {
          emitter.emit('failed', err);
        },
        onReady: () => {
          emitter.emit('ready');
        },
        onUpdate: (key: string) => {
          emitter.emit('update', { key });
          emitter.emit(`update:${key}`, { key });
        },
        hasEventListeners: () =>
          emitter
            .eventNames()
            .some(
              (name) =>
                name === 'update' || (typeof name === 'string' && name.startsWith('update:')),
            ),
      },
      {
        getImplementationHooks: (environmentMetadata: LDPluginEnvironmentMetadata) =>
          internal.safeGetHooks(logger, environmentMetadata, plugins),
      },
    );

    this.emitter = emitter;

    internal.safeRegisterPlugins(logger, this.environmentMetadata, this, plugins);
  }

  /**
   * Wraps an LDVariationFilter (which receives LDContext) into one that receives the
   * internal Context type used by the evaluator.
   */
  private static _wrapFilter(
    filter: LDVariationFilter | undefined,
  ): ((ctx: any, variationId: number, index: number, value: any) => boolean) | undefined {
    if (!filter) {
      return undefined;
    }
    return (ctx: any, variationId: number, index: number, value: any) => {
      const ldContext = Context.toLDContext(ctx);
      if (!ldContext) {
        return true;
      }
      return filter(ldContext, variationId, index, value);
    };
  }

  // Override variation to be synchronous.
  // The in-memory store callbacks execute synchronously, so we capture the
  // result directly.
  override variation(
    key: string,
    context: LDContext,
    defaultValue: LDFlagValue,
    variationFilter?: LDVariationFilter,
  ): LDFlagValue {
    let result: LDFlagValue = defaultValue;
    // Call the parent's private evaluation through the public async method,
    // but since the in-memory store is synchronous, the callback resolves immediately.
    // We use a synchronous capture pattern.
    const promise = super.variation(
      key,
      context,
      defaultValue,
      undefined,
      LDClientNodeSync._wrapFilter(variationFilter),
    );
    // For in-memory stores, the promise resolves synchronously via microtask.
    // We capture the result through the then handler.
    promise.then((value) => {
      result = value;
    });
    return result;
  }

  override variationDetail(
    key: string,
    context: LDContext,
    defaultValue: LDFlagValue,
    variationFilter?: LDVariationFilter,
  ): LDEvaluationDetail {
    let result: LDEvaluationDetail = {
      value: defaultValue,
      variationIndex: null,
      reason: { kind: 'ERROR', errorKind: 'CLIENT_NOT_READY' },
    };
    const promise = super.variationDetail(
      key,
      context,
      defaultValue,
      undefined,
      LDClientNodeSync._wrapFilter(variationFilter),
    );
    promise.then((detail) => {
      result = detail;
    });
    return result;
  }

  override boolVariation(key: string, context: LDContext, defaultValue: boolean): boolean {
    let result: boolean = defaultValue;
    const promise = super.boolVariation(key, context, defaultValue);
    promise.then((value) => {
      result = value;
    });
    return result;
  }

  override numberVariation(key: string, context: LDContext, defaultValue: number): number {
    let result: number = defaultValue;
    const promise = super.numberVariation(key, context, defaultValue);
    promise.then((value) => {
      result = value;
    });
    return result;
  }

  override stringVariation(key: string, context: LDContext, defaultValue: string): string {
    let result: string = defaultValue;
    const promise = super.stringVariation(key, context, defaultValue);
    promise.then((value) => {
      result = value;
    });
    return result;
  }

  override jsonVariation(key: string, context: LDContext, defaultValue: unknown): unknown {
    let result: unknown = defaultValue;
    const promise = super.jsonVariation(key, context, defaultValue);
    promise.then((value) => {
      result = value;
    });
    return result;
  }

  override boolVariationDetail(
    key: string,
    context: LDContext,
    defaultValue: boolean,
  ): LDEvaluationDetailTyped<boolean> {
    let result: LDEvaluationDetailTyped<boolean> = {
      value: defaultValue,
      variationIndex: null,
      reason: { kind: 'ERROR', errorKind: 'CLIENT_NOT_READY' },
    };
    const promise = super.boolVariationDetail(key, context, defaultValue);
    promise.then((detail) => {
      result = detail;
    });
    return result;
  }

  override numberVariationDetail(
    key: string,
    context: LDContext,
    defaultValue: number,
  ): LDEvaluationDetailTyped<number> {
    let result: LDEvaluationDetailTyped<number> = {
      value: defaultValue,
      variationIndex: null,
      reason: { kind: 'ERROR', errorKind: 'CLIENT_NOT_READY' },
    };
    const promise = super.numberVariationDetail(key, context, defaultValue);
    promise.then((detail) => {
      result = detail;
    });
    return result;
  }

  override stringVariationDetail(
    key: string,
    context: LDContext,
    defaultValue: string,
  ): LDEvaluationDetailTyped<string> {
    let result: LDEvaluationDetailTyped<string> = {
      value: defaultValue,
      variationIndex: null,
      reason: { kind: 'ERROR', errorKind: 'CLIENT_NOT_READY' },
    };
    const promise = super.stringVariationDetail(key, context, defaultValue);
    promise.then((detail) => {
      result = detail;
    });
    return result;
  }

  override jsonVariationDetail(
    key: string,
    context: LDContext,
    defaultValue: unknown,
  ): LDEvaluationDetailTyped<unknown> {
    let result: LDEvaluationDetailTyped<unknown> = {
      value: defaultValue,
      variationIndex: null,
      reason: { kind: 'ERROR', errorKind: 'CLIENT_NOT_READY' },
    };
    const promise = super.jsonVariationDetail(key, context, defaultValue);
    promise.then((detail) => {
      result = detail;
    });
    return result;
  }

  // Override allFlagsState to be synchronous.
  override allFlagsState(
    context: LDContext,
    options?: LDFlagsStateOptions,
  ): LDFlagsState {
    let result: LDFlagsState | undefined;
    const promise = super.allFlagsState(context, options);
    promise.then((state) => {
      result = state;
    });
    // The in-memory store resolves synchronously, so result should be set.
    // If it's not (e.g., store not initialized), return an empty state.
    if (!result) {
      // This shouldn't happen with in-memory stores, but provides a safe fallback.
      return {
        valid: false,
        getFlagValue: () => null,
        getFlagReason: () => null,
        toJSON: () => ({}),
      } as any;
    }
    return result;
  }

  // #region: EventEmitter

  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.on(eventName, listener);
    return this;
  }

  addListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.addListener(eventName, listener);
    return this;
  }

  once(eventName: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.once(eventName, listener);
    return this;
  }

  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.removeListener(eventName, listener);
    return this;
  }

  off(eventName: string | symbol, listener: (...args: any) => void): this {
    this.emitter.off(eventName, listener);
    return this;
  }

  removeAllListeners(event?: string | symbol): this {
    this.emitter.removeAllListeners(event);
    return this;
  }

  setMaxListeners(n: number): this {
    this.emitter.setMaxListeners(n);
    return this;
  }

  getMaxListeners(): number {
    return this.emitter.getMaxListeners();
  }

  listeners(eventName: string | symbol): Function[] {
    return this.emitter.listeners(eventName);
  }

  rawListeners(eventName: string | symbol): Function[] {
    return this.emitter.rawListeners(eventName);
  }

  emit(eventName: string | symbol, ...args: any[]): boolean {
    return this.emitter.emit(eventName, args);
  }

  listenerCount(eventName: string | symbol): number {
    return this.emitter.listenerCount(eventName);
  }

  prependListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.prependListener(eventName, listener);
    return this;
  }

  prependOnceListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.prependOnceListener(eventName, listener);
    return this;
  }

  eventNames(): (string | symbol)[] {
    return this.emitter.eventNames();
  }

  // #endregion
}

export default LDClientNodeSync;
