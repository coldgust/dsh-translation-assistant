// @ts-nocheck - migrated verbatim from the single-file client; precise types follow in a later phase.

import { NS, PANEL_ID } from './constants.ts';
import { zh, en } from './locales.ts';
import { TranslationPage } from './page/TranslationPage.ts';
import { TranslationPanelIcon } from './components.tsx';

const plugin = {
  inject: ['slots', 'locale'],
  apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'translation-assistant: dictionaries');
    const t = ctx.locale.bind(NS);
    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: PANEL_ID,
      locale: NS,
    }, TranslationPage));
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: PANEL_ID,
      order: 20,
      locale: NS,
      label: () => t('panel'),
    }, TranslationPanelIcon));
  },
};

export const inject = plugin.inject;
export const apply = plugin.apply;
