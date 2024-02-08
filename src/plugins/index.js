import {
  getCanvasIndex,
  getCurrentCanvas,
  getWindowConfig,
  getContainerId,
  getManifestUrl,
  getManifestTitle,
  getManifestMetadata,
  getViewer,
} from 'mirador/dist/es/src/state/selectors';
import { updateWindow } from 'mirador/dist/es/src/state/actions';

import { getTextsForVisibleCanvases, getPlainTextOptions } from './state/selectors';
import PlainTextViewer from './PlainTextViewer';
import plainTextViewerToolbarPlugin from './PlainTextViewerToolbar';
import { textsReducer } from './state/reducers';
import textSaga from './state/sagas';

plainTextViewerToolbarPlugin.mapStateToProps = (state, { windowId }) => {
  const { imageToolsEnabled = true, plainText } = getWindowConfig(state, { windowId });
  let textDisabled = false;
  console.log("-- ALTERNATE plaintext.PlainTextViewerToolbar.mapStateToProps", windowId, getContainerId(state));
  return {
    imageToolsEnabled,
    textDisabled: (getTextsForVisibleCanvases(state, { windowId }).map((canvasText) => {
      if (canvasText === undefined || canvasText.isFetching) {
        return true;
      }
      console.log("-- plaintext.PlainTextViewerToolbar.textDisabled", canvasText, canvasText.text.lines && canvasText.text.lines[0] === undefined);
      return ( canvasText.text.lines && canvasText.text.lines[0] === undefined );
    }))[0],
    ...(plainText ?? { imageVisible: true, textVisible: true })
  };
};

export default [
  {
    component: PlainTextViewer,
    target: 'WindowViewer',
    mode: 'wrap',
    mapDispatchToProps: (dispatch, { windowId }) => ({
      doSetCanvas: (canvasId) => dispatch(setCanvas(windowId, canvasId)),
      updatePlainTextOptions: (plainText) => {
        console.log("-- plaintext.toolbar updatePlainTextOptions.index", windowId, plainText);
        return dispatch(updateWindow(windowId, { plainText }))
      },
    }),
    mapStateToProps: (state, { id, manifestId, windowId }) => ({
      pageTexts: getTextsForVisibleCanvases(state, { windowId }).map((canvasText) => {
        if (canvasText === undefined || canvasText.isFetching) {
          return undefined;
        }
        return {
          ...canvasText.text,
          canvasId: canvasText.canvasId,
          source: canvasText.source,
          color: canvasText.color,
        };
      }),
      // pageTexts: [ { lines: [ { text: 'TBD' } ] } ],
      manifestId: getManifestUrl(state, { windowId }),
      manifestMetadata: getManifestMetadata(state, { companionWindowId: id, manifestId, windowId }),
      manifestTitle: getManifestTitle(state, { windowId }),
      textsAvailable: getTextsForVisibleCanvases(state, { windowId }).length > 0,
      textsFetching: getTextsForVisibleCanvases(state, { windowId }).some((t) => t?.isFetching),
      canvasId: (getCurrentCanvas(state, { windowId }) || {}).id,
      canvasIndex: getCanvasIndex(state, { windowId }),
      viewConfig: getViewer(state, { windowId }) || {},
      windowId,
      ...getPlainTextOptions(state, { windowId }),
    }),
    reducers: {
      texts: textsReducer,
    },
    saga: textSaga,
  },
  plainTextViewerToolbarPlugin,
];