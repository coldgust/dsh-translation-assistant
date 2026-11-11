/**
 * Shared wire contract between the Host HTTP API and the browser page.
 *
 * Everything imported from a Harness package here is type-only: esbuild must
 * never emit a runtime require for these modules into lib/client.js.
 */
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-llm';
import type {} from '@deepseek-ai/dsh-host-webserver';

export type PluginContext = Context;

export interface ModelRoute {
  provider: string;
  model: string;
}

/** POST /dsh-translation/api/translate */
export interface TranslatePayload {
  sentences?: string[];
  paragraphs?: string[];
  document?: string | string[];
  sourceLanguage?: string;
  targetLanguage?: string;
  route?: ModelRoute;
  spec?: string;
}

/** POST /dsh-translation/api/workspace/* */
export interface WorkspacePayload {
  root: string;
  relPath?: string;
  content?: string;
  overwrite?: boolean;
  name?: string;
}
