import { createSelector } from 'reselect';

import { getWindowConfig, getVisibleCanvases, getTheme } from 'mirador/dist/es/src/state/selectors';
import { miradorSlice } from 'mirador/dist/es/src/state/selectors/utils';

const defaultConfig = {
  // Enable the text selection and display feature
  enabled: true,
  // Default opacity of text overlay
  opacity: 1.0,
  // Make text selectable by default
  selectable: false,
  // Overlay text overlay by default
  visible: false,
  // Try to automatically determine the text and background color
  useAutoColors: true,
  // Color of rendered text, used as a fallback if auto-detection is enabled and fails
  textColor: '#000000',
  // Color of line background, used as a fallback if auto-detection is enabled and fails
  bgColor: '#ffffff',
};

/** Selector to get text display options for a given window */
export const getWindowTextOverlayOptions = createSelector(
  [getWindowConfig, getTheme],
  ({ textOverlay }, { typography: { fontFamily },  }) => ({
    fontFamily,
    ...defaultConfig,
    ...(textOverlay ?? {}),
  })
);

export const getPlainTextOptions = createSelector(
  [getWindowConfig, getTheme],
  ({ plainText }, { typography: { fontFamily } }) => ({
    fontFamily,
    ...defaultConfig,
    ...(plainText ?? { imageVisible: true, textVisible: true, }),
  })
);

/** Selector to get all loaded texts */
export const getTexts = (state) => miradorSlice(state).texts;

const fetchText = async function(canvasId) {
  const parts = canvasId.split('/')
  parts.pop();
  parts.pop();
  const identifier = parts.pop();
  const [ collid, idno, seq ] = identifier.split(':');
  const requestUrl = new URL(canvasId);
  requestUrl.pathname = '/cgi/t/text/pageviewer-idx';
  requestUrl.searchParams.set('view', 'text');
  requestUrl.searchParams.set('tpl', 'plaintext.viewer');
  requestUrl.searchParams.set('cc', collid);
  requestUrl.searchParams.set('idno', idno);
  requestUrl.searchParams.set('seq', seq);
  console.log(":: plaintext.identifier", identifier, requestUrl.toString());
  // let promise = new Promise(function(resolve, reject) {
  //   setTimeout(() => resolve("done"), 1000);
  // });
  // return promise;
  const request = await fetch(requestUrl, { credentials: 'include'} );
  return await request.text();
}

/** Selector for text on all visible canvases */
export const getTextsForVisibleCanvases = createSelector(
  [getVisibleCanvases, getTexts],
  (canvases, allTexts) => {
    if (!canvases) return [];
    if (!canvases.length) return [];
    console.log("-- plaintext.getTextsForVisibleCanvases", canvases[0]);
    const canvasId = canvases[0].id;
    // return [{
    //   text: {
    //     lines: [ { text: 'TBD' } ],
    //   },
    //   canvasId: canvasId,
    //   source: 'https://quod.lib.umich.edu/somewhere',
    //   color: 'black',
    //   isFetching: false,
    // }];
    // return [];
    const texts = canvases.map((canvas) => allTexts[canvas.id]);
    if (texts.every((t) => t === undefined)) {
      return [];
    }
    console.log("-- plaintext.getTextsForVisibleCanvases.texts", texts);
    return texts;
  }
);

// /** Selector to get text display options for a given window */
// export const getWindowTextOverlayOptions = createSelector(
//   [getWindowConfig, getTheme],
//   ({ textOverlay }, { typography: { fontFamily } }) => ({
//     fontFamily,
//     ...defaultConfig,
//     ...(textOverlay ?? {}),
//   })
// );
