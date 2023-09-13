import Mirador from 'mirador/dist/es/src/index';
import { miradorImageToolsPlugin } from 'mirador-image-tools';
import plainTextViewerPlugin from './plugins';
import * as effects from 'redux-saga/effects';
const ReduxSaga = { effects: effects };

const $viewer = document.querySelector('#viewer');
// const manifestId = $viewer.dataset.manifestId;
const canvasIndex = $viewer.dataset.canvasIndex;
const provider = $viewer.dataset.provider;
const mode = $viewer.dataset.mode;
const hasOcr = $viewer.dataset.hasOcr == 'true';

const allowFullscreen = $viewer.dataset.allowFullscreen != null ? 
  $viewer.dataset.allowFullscreen == true : 
  true;

let manifests = DLXS.mirador_config.manifests;
// manifests[manifestId] = {
//   provider: provider
// };

let windows = [];
let windowDefaultParams = {
  imageToolsEnabled: true,
  imageToolsOpen: false
};

DLXS.mirador_config.windows.forEach((window) => {
  windows.push(Object.assign({}, windowDefaultParams, window));
});

const allowTopMenuButton = mode != 'single';
const allowPanelsCanvas = mode != 'single';
const thumbnailNavigation = { defaultPosition: 'far-bottom' };
if (mode == 'single') {
  thumbnailNavigation.defaultPosition = 'off';
}

let isFramed = (!(window.parent == window));
let numWindows = windows.length;
let hideWindowTitle = (( numWindows == 1 ) && isFramed);

let initialized = 0;

if ( isFramed ) {
  // communicate the window config 
  window.top.postMessage({ 
    event: 'configureManifests', 
    manifestList: JSON.stringify(windows.map((v) => v.manifestId))
  }, '*');
}

function* handleCanvasChange(event) {

  const canvasId = event.canvasId;
  const windowId = event.windowId;
  const state = viewer.store.getState();
  const manifestId = state.windows[windowId].manifestId;
  const canvas = state.manifests[manifestId].json.sequences[0].canvases.find((canvas) => {
    return canvas['@id'] == canvasId;
  })

  const resourceId = canvas.images[0].resource['@id'];
  const identifier = (resourceId.split('/')).pop();

  // console.log("-- handleCanvasChange", windowId, state);
  if (isFramed && DLXS.mirador_config.windows.length > 1) {
    // TODO - answer whether we'll ever update metadata for this kind of presentation, and how
    // for multi-window workspaces, send the updateDownload event because we do not send updateMetadata
    window.top.postMessage({ 
      event: 'updateDownloadLinks', 
      identifier: identifier, 
      label: canvas.label, 
      resourceId: resourceId,
      manifestId: manifestId
    }, '*');
    return;
  }

  console.log(identifier, window.top != window);
  if (isFramed) {
    // ignore the initial canvasChange event because the page already is displaying
    // the metadata for this canvas
    if (initialized == DLXS.mirador_config.windows.length) {
      window.top.postMessage({ event: 'updateMetadata', identifier: identifier, label: canvas.label }, '*');
    } else {
      initialized += 1;
    }
  }
  return event;
};

function* canvasSaga() {
  yield ReduxSaga.effects.all([
    ReduxSaga.effects.takeEvery('mirador/SET_CANVAS', handleCanvasChange)
  ])
}

const plugins = [
  {
    component: () => { },
    saga: canvasSaga
  },
  [
    ...miradorImageToolsPlugin
  ]
]

if ( hasOcr ) {
  plugins.push(...plainTextViewerPlugin); 
}

const viewer = Mirador.viewer({
  id: 'viewer',
  manifests: manifests,
  // windows: [
  //   {
  //     imageToolsEnabled: true,
  //     imageToolsOpen: false,
  //     canvasIndex: canvasIndex,
  //     manifestId: manifestId,
  //   }
  // ],
  windows: windows,
  window: {
    allowClose: false,
    allowFullscreen: allowFullscreen,
    allowTopMenuButton: allowTopMenuButton,
    allowWindowSideBar: (mode != 'single'),
    allowMaximize: false,
    defaultSideBarPanel: 'canvas',
    panels: {
      info: false,
      attribution: false,
      canvas: allowPanelsCanvas,
      annotations: false,
      search: false,
      rights: true
    },
    hideWindowTitle: hideWindowTitle,
    textOverlay: {
      enabled: true,
      visible: true,
    }
  },
  workspace: {
    showZoomControls: true,
    type: windows.length == 1 ? 'single' : 'mosaic'
  },
  workspaceControlPanel: false,
  thumbnailNavigation: thumbnailNavigation,

  osdConfig: {
    gestureSettingsMouse: {
      scrollToZoom: false,
      clickToZoom: false,
      dblClickToZoom: true,
      flickEnabled: true,
      pinchRotate: true
    }
  },

  selectedTheme: 'light',

  themes: {
    light: {
      typography: {
        fontFamily: 'var(--font-base-family)'
      }
    }
  },

  hideWindowTitle: true,

  EOT: true

}, plugins)

window.viewer = viewer;
