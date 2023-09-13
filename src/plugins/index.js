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

import { getTextsForVisibleCanvases, getWindowTextOverlayOptions } from './state/selectors';
import PlainTextViewer from './PlainTextViewer';
import { textsReducer } from './state/reducers';
import textSaga from './state/sagas';

export default [
  {
    component: PlainTextViewer,
    target: 'WindowViewer',
    mode: 'wrap',
    mapDispatchToProps: (dispatch, { windowId }) => ({
      doSetCanvas: (canvasId) => dispatch(setCanvas(windowId, canvasId)),
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
      visible: true,
      windowId,
    }),
    reducers: {
      texts: textsReducer,
    },
    saga: textSaga,
  }
];