import { useCallback } from 'react';
import type { Flow, Manager, Spread, Theme, ePubCfi } from '../types';
import template from '../utils/core/template';
import type { SourceType } from '../utils/enums/source-type.enum';

export function useInjectWebViewVariables() {
  const injectWebViewVariables = useCallback(
    ({
      jszip,
      epubjs,
      type,
      book,
      theme,
      enableSelection,
      locations,
      initialAnnotations,
      initialLocation,
      allowScriptedContent,
      allowPopups,
      manager,
      flow,
      snap,
      spread,
      fullsize,
      charactersPerLocation = 1600,
      /**
       * Injects React state variables directly into the HTML template string.
       * This runs on the Native side before passing the HTML to the WebView.
       * 
       * @param args - Configuration and initial state to inject.
       * @param args.jszip - Path to local jszip file.
       * @param args.epubjs - Path to local epub.js file.
       * @param args.type - Source type (base64, binary, etc).
       * @param args.book - Book source locations.
       * @param args.theme - Current theme object to set as window.theme.
       * @param args.initialAnnotations - Annotations to pre-load as window.initialAnnotations.
       * @param args.locations - Initial location data.
       * @returns The fully constructed HTML string ready for the WebView.
       */
    }: {
      jszip: string;
      epubjs: string;
      type: SourceType;
      book: string;
      theme: Theme;
      enableSelection: boolean;
      locations?: ePubCfi[];
      initialAnnotations?: any[];
      initialLocation?: string;
      allowScriptedContent?: boolean;
      allowPopups?: boolean;
      manager: Manager;
      flow: Flow;
      snap?: boolean;
      spread?: Spread;
      fullsize?: boolean;
      charactersPerLocation?: number;
    }) => {
      return template
        .replace(
          /<script id="jszip"><\/script>/,
          `<script src="${jszip}"></script>`
        )
        .replace(
          /<script id="epubjs"><\/script>/,
          `<script src="${epubjs}"></script>`
        )
        .replace(/const type = window.type;/, `const type = '${type}';`)
        .replace(/const file = window.book;/, `const file = '${book}';`)
        .replace(
          /const theme = window.theme;/,
          `const theme = ${JSON.stringify(theme)};`
        )
        .replace(
          /const initialLocations = window.locations;/,
          `const initialLocations = ${locations};`
        )
        .replace(
          /const initialAnnotations = window.initialAnnotations;/,
          `const initialAnnotations = ${JSON.stringify(initialAnnotations)};`
        )
        .replace(
          /const initialLocation = window.initialLocation;/,
          `const initialLocation = ${typeof initialLocation === 'string'
            ? `'${initialLocation}'`
            : undefined
          };`
        )
        .replace(
          /const enableSelection = window.enable_selection;/,
          `const enableSelection = ${enableSelection};`
        )
        .replace(
          /allowScriptedContent: allowScriptedContent/,
          `allowScriptedContent: ${allowScriptedContent}`
        )
        .replace(/allowPopups: allowPopups/, `allowPopups: ${allowPopups}`)
        .replace(/const manager = window.manager;/, `const manager = ${JSON.stringify(manager)};`)
        .replace(/const flow = window.flow;/, `const flow = ${JSON.stringify(flow)};`)
        .replace(/const snap = window.snap;/, `const snap = ${snap ?? undefined};`)
        .replace(
          /const spread = window.spread;/,
          `const spread = ${spread ? JSON.stringify(spread) : undefined};`
        )
        .replace(/const fullsize = window.fullsize;/, `const fullsize = ${fullsize ?? undefined};`)
        .replace(
          /book\.locations\.generate\(2000\)/,
          `book.locations.generate(${charactersPerLocation})`
        );
    },
    []
  );
  return { injectWebViewVariables };
}
