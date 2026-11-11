// @ts-nocheck - migrated verbatim from the single-file client; precise types follow in a later phase.
import { LANGUAGES } from './constants.ts';
import * as React from 'react';
const h = React.createElement;

    export function BusyDot() {
      return h('span', { className: 'dta-dot', 'aria-hidden': true });
    }

    /**
     * One language `<select>`.
     * @param {object} props - component props.
     * @returns {object} element.
     */
    export function LanguageSelect(props) {
      const { label, value, onChange, includeAuto, t } = props;
      return h('label', { className: 'dta-field' },
        h('span', { className: 'dta-fieldLabel' }, label),
        h('select', { className: 'dta-select', value, onChange: (event) => onChange(event.target.value) },
          includeAuto ? h('option', { value: 'auto' }, t('autoDetect')) : null,
          LANGUAGES.map((language) => h('option', { key: language, value: language }, language)),
        ),
      );
    }

    /** Sidebar panel icon. */
    export function TranslationPanelIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 18;
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', {
          d: 'M3.5 5.5h8M7.5 3.2v2.3c0 3.6-2.1 6.5-4.7 7.9',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M5.4 9.3c1 2.2 2.7 3.9 4.9 4.9',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M12.6 20.2 16 11.4h1.5l3.4 8.8',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M14.2 16.9h5.1',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        }),
      );
    }
