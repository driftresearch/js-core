import { integrations, LDPluginBase } from '@launchdarkly/js-server-sdk-common';

import { LDClient } from './LDClient';

/**
 * Interface for plugins to the LaunchDarkly SDK.
 */
export interface LDPlugin extends LDPluginBase<LDClient, integrations.Hook> {}
