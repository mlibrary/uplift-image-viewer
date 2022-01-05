import Mirador from 'mirador/dist/es/src/index';
import { miradorImageToolsPlugin } from 'mirador-image-tools';
import ReduxSaga from 'redux-saga';

const $viewer = document.querySelector('#viewer');
const manifestId = $viewer.dataset.manifestId;
const canvasIndex = $viewer.dataset.canvasIndex;
const provider = $viewer.dataset.provider;
const mode = $viewer.dataset.mode;

let manifests = {};
manifests[manifestId] = {
  provider: provider
};

const allowTopMenuButton = mode != 'single';
const allowPanelsCanvas = mode != 'single';
const thumbnailNavigation = { defaultPosition: 'far-bottom' };
if (mode == 'single') {
  thumbnailNavigation.defaultPosition = 'off';
}

let initialized = false;

function* handleCanvasChange(event) {
  const canvasId = event.canvasId;
  const windowId = event.windowId;
  const state = viewer.store.getState();
  const manifestId = state.windows[windowId].manifestId;
  const canvas = state.manifests[manifestId].json.sequences[0].canvases.find((canvas) => {
    return canvas['@id'] == canvasId;
  })
  const identifier = (canvas.images[0].resource['@id'].split('/')).pop();

  console.log(identifier, window.top != window);
  if (window.top != window) {
    if (initialized) {
      window.top.postMessage({ event: 'canvasChange', identifier: identifier, label: canvas.label }, '*');
    } else {
      initialized = true;
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

const viewer = Mirador.viewer({
  id: 'viewer',
  manifests: manifests,
  windows: [
    {
      imageToolsEnabled: true,
      imageToolsOpen: false,
      canvasIndex: canvasIndex,
      manifestId: manifestId,
    }
  ],
  window: {
    allowClose: false,
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
    hideWindowTitle: (!(window.parent == window))
  },
  workspace: {
    showZoomControls: true,
    type: 'single'
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
