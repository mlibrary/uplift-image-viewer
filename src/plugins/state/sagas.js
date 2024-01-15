/* eslint-disable no-underscore-dangle */
import uniq from 'lodash/uniq';
import { all, call, put, select, take, takeEvery, race } from 'redux-saga/effects';
// import fetch from 'isomorphic-unfetch';

import ActionTypes from 'mirador/dist/es/src/state/actions/action-types';
import { receiveAnnotation, updateConfig } from 'mirador/dist/es/src/state/actions';
import {
  getCanvases,
  getWindowConfig,
  getVisibleCanvases,
  selectInfoResponse,
} from 'mirador/dist/es/src/state/selectors';
import MiradorCanvas from 'mirador/dist/es/src/lib/MiradorCanvas';

import {
  PluginActionTypes,
  requestText,
  receiveText,
  receiveTextFailure,
  discoveredText,
  requestColors,
  receiveColors,
} from './actions';
import { getTexts, getTextsForVisibleCanvases } from './selectors';
// import translations from '../locales';
import { parseIiifAnnotations, parseOcr } from '../lib/ocrFormats';
import { getPageColors } from '../lib/color';

const charFragmentPattern = /^(.+)#char=(\d+),(\d+)$/;

/** Check if an annotation has external resources that need to be loaded */
function hasExternalResource(anno) {
  return (
    anno.resource?.chars === undefined &&
    anno.body?.value === undefined &&
    Object.keys(anno.resource).length === 1 &&
    anno.resource['@id'] !== undefined
  );
}

/** Checks if a given resource points to an ALTO OCR document */
const isAlto = (resource) =>
  resource &&
  (resource.format === 'application/xml+alto' ||
    resource.format === 'application/alto+xml' ||
    (resource.profile && resource.profile.startsWith('http://www.loc.gov/standards/alto/')));

/** Checks if a given resource points to an hOCR document */
const isHocr = (resource) =>
  resource &&
  (resource.format === 'text/vnd.hocr+html' ||
    (resource.profile &&
      (resource.profile === 'https://github.com/kba/hocr-spec/blob/master/hocr-spec.md' ||
        resource.profile.startsWith('http://kba.cloud/hocr-spec/') ||
        resource.profile.startsWith('http://kba.github.io/hocr-spec/'))));

/** Wrapper around fetch() that returns the content as text */
export async function fetchOcrMarkup(url) {
  try {
    const resp = await fetch(url, { credentials: 'include' })
      .catch(err => {
        console.log("-- fetch error:", url, err.response.data);
        return '';
      })
    if ( resp.status != 200 ) { return ''; }
    return resp.text();
  } catch(error) {
    return '';
  }
}

const getPageTextUrl = function(canvasId, q1) {
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
  if ( q1 ) {
    requestUrl.searchParams.set('q1', q1);
  }
  return requestUrl.toString();
}

/** Saga for discovering external OCR on visible canvases and requesting it if not yet loaded */
export function* discoverExternalOcr({ visibleCanvases: visibleCanvasIds, windowId }) {
  console.log(":: sagas.discoverExternalOcr", visibleCanvasIds, windowId);
  const { enabled, selectable, visible, q1 } = (yield select(getWindowConfig, { windowId }))
    .textOverlay ?? { enabled: false, q1: null };
  if (!enabled) {
    return;
  }
  const canvases = yield select(getCanvases, { windowId });
  const visibleCanvases = (canvases || []).filter((c) => visibleCanvasIds.includes(c.id));
  const texts = yield select(getTexts);
  console.log(":: sagas.discoverExternalOcr", enabled, visibleCanvasIds, windowId, visibleCanvases, q1);

  for (const canvas of visibleCanvases) {
    console.log(":: sagas.discoverExternalOcr.canvasId", canvas.id);
    const { width, height } = canvas.__jsonld;    
    const ocrSource = getPageTextUrl(canvas.id, q1);
    const alreadyHasText = texts[canvas.id]?.source == ocrSource;
    if ( alreadyHasText ) {
      continue;
    }
    if ( visible ) {
      yield put(requestText(canvas.id, ocrSource, { height, width })); 
    } else {
      yield put(discoveredText(canvas.id, ocrSource)); 
    }
    
    // const { width, height } = canvas.__jsonld;
    // const seeAlso = (Array.isArray(canvas.__jsonld.seeAlso)
    //   ? canvas.__jsonld.seeAlso
    //   : [canvas.__jsonld.seeAlso]
    // ).filter((res) => isAlto(res) || isHocr(res))[0];
    // if (seeAlso !== undefined) {
    //   const ocrSource = seeAlso['@id'];
    //   const alreadyHasText = texts[canvas.id]?.source === ocrSource;
    //   if (alreadyHasText) {
    //     // eslint-disable-next-line no-continue
    //     continue;
    //   }
    //   if (selectable || visible) {
    //     yield put(requestText(canvas.id, ocrSource, { height, width }));
    //   } else {
    //     yield put(discoveredText(canvas.id, ocrSource));
    //   }
    //   // Get the IIIF Image Service from the canvas to determine text/background colors
    //   // NOTE: We don't do this in the `fetchColors` saga, since it's kind of a pain to get
    //   // a canvas object from an id, and we have one already here, so it's just simpler.
    //   const miradorCanvas = new MiradorCanvas(canvas);
    //   const image = miradorCanvas.iiifImageResources[0];
    //   const infoId = image?.getServices()[0].id;
    //   if (!infoId) {
    //     return;
    //   }
    //   yield put(requestColors(canvas.id, infoId));
    // }
  }

  return;


  // FIXME: This should be doable with the `all` saga combinator, but it doesn't
  // seem to do anything :-/
  for (const canvas of visibleCanvases) {
    const { width, height } = canvas.__jsonld;
    const seeAlso = (Array.isArray(canvas.__jsonld.seeAlso)
      ? canvas.__jsonld.seeAlso
      : [canvas.__jsonld.seeAlso]
    ).filter((res) => isAlto(res) || isHocr(res))[0];
    if (seeAlso !== undefined) {
      const ocrSource = seeAlso['@id'];
      const alreadyHasText = texts[canvas.id]?.source === ocrSource;
      if (alreadyHasText) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (selectable || visible) {
        yield put(requestText(canvas.id, ocrSource, { height, width }));
      } else {
        yield put(discoveredText(canvas.id, ocrSource));
      }
      // Get the IIIF Image Service from the canvas to determine text/background colors
      // NOTE: We don't do this in the `fetchColors` saga, since it's kind of a pain to get
      // a canvas object from an id, and we have one already here, so it's just simpler.
      const miradorCanvas = new MiradorCanvas(canvas);
      const image = miradorCanvas.iiifImageResources[0];
      const infoId = image?.getServices()[0].id;
      if (!infoId) {
        return;
      }
      yield put(requestColors(canvas.id, infoId));
    }
  }
}

/** Saga for fetching OCR and parsing it */
export function* fetchAndProcessOcr({ targetId, textUri, canvasSize }) {
  try {
    const text = yield call(fetchOcrMarkup, textUri);
    const parsedText = yield call(parseOcr, text, canvasSize);
    console.log(":: plaintext.sagas.fetchAndProcessOcr.parsed", parsedText);
    yield put(receiveText(targetId, textUri, 'ocr', parsedText));
  } catch (error) {
    yield put(receiveTextFailure(targetId, textUri, error));
  }
}

/** Fetch external annotation resource JSON */
export async function fetchAnnotationResource(url) {
  const resp = await fetch(url);
  return resp.json();
}

/** Saga for fetching external annotation resources */
export function* fetchExternalAnnotationResources({ targetId, annotationId, annotationJson }) {
  if (!annotationJson.resources.some(hasExternalResource)) {
    return;
  }
  const resourceUris = uniq(
    annotationJson.resources.map((anno) => anno.resource['@id'].split('#')[0])
  );
  const contents = yield all(resourceUris.map((uri) => call(fetchAnnotationResource, uri)));
  const contentMap = Object.fromEntries(contents.map((c) => [c.id ?? c['@id'], c]));
  const completedAnnos = annotationJson.resources.map((anno) => {
    if (!hasExternalResource(anno)) {
      return anno;
    }
    const match = anno.resource['@id'].match(charFragmentPattern);
    if (!match) {
      return { ...anno, resource: contentMap[anno.resource['@id']] ?? anno.resource };
    }
    const wholeResource = contentMap[match[1]];
    const startIdx = Number.parseInt(match[2], 10);
    const endIdx = Number.parseInt(match[3], 10);
    const partialContent = wholeResource.value.substring(startIdx, endIdx);
    return { ...anno, resource: { ...anno.resource, value: partialContent } };
  });
  yield put(
    receiveAnnotation(targetId, annotationId, { ...annotationJson, resources: completedAnnos })
  );
}

/** Saga for processing texts from IIIF annotations */
export function* processTextsFromAnnotations({ targetId, annotationId, annotationJson }) {
  // Check if the annotation contains "content as text" resources that
  // we can extract text with coordinates from
  const contentAsTextAnnos = annotationJson.resources.filter(
    (anno) =>
      anno.motivation === 'supplementing' || // IIIF 3.0
      anno.resource['@type']?.toLowerCase() === 'cnt:contentastext' || // IIIF 2.0
      ['Line', 'Word'].indexOf(anno.dcType) >= 0 // Europeana IIIF 2.0
  );

  if (contentAsTextAnnos.length > 0) {
    const parsed = yield call(parseIiifAnnotations, contentAsTextAnnos);
    yield put(receiveText(targetId, annotationId, 'annos', parsed));
  }
}

/** Saga for requesting texts when display or selection is newly enabled */
export function* onConfigChange({ payload, id: windowId }) {
  const { enabled, selectable, visible } = payload.textOverlay ?? {};
  if (!enabled || (!selectable && !visible)) {
    return;
  }
  const texts = yield select(getTextsForVisibleCanvases, { windowId });
  // Check if any of the texts need fetching
  const needFetching = texts.filter(
    ({ sourceType, text }) => sourceType === 'ocr' && text === undefined
  );
  // Check if we need to discover external OCR
  const needsDiscovery =
    texts.length === 0 || texts.filter(({ sourceType } = {}) => sourceType === 'annos').length > 0;
  if (needFetching.length === 0 && !needsDiscovery) {
    return;
  }
  const visibleCanvases = yield select(getVisibleCanvases, { windowId });
  yield all(
    needFetching.map(({ canvasId, source }) => {
      const { width, height } = visibleCanvases.find((c) => c.id === canvasId).__jsonld;
      return put(requestText(canvasId, source, { height, width }));
    })
  );
  if (needsDiscovery) {
    const canvasIds = visibleCanvases.map((c) => c.id);
    yield call(discoverExternalOcr, { visibleCanvases: canvasIds, windowId });
  }
}

// /** Inject translation keys for this plugin into thte config */
// export function* injectTranslations() {
//   yield put(
//     updateConfig({
//       translations,
//     })
//   );
// }

/** Load image data for image */
export async function loadImageData(imgUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height).data);
    };
    img.onerror = reject;
    img.src = imgUrl;
  });
}

/** Try to determine text and background color for the target */
export function* fetchColors({ targetId, infoId }) {
  const infoResp = yield select(selectInfoResponse, { infoId });
  let serviceId = infoResp?.id;
  if (!serviceId) {
    const { success: infoSuccess, failure: infoFailure } = yield race({
      success: take((a) => a.type === ActionTypes.RECEIVE_INFO_RESPONSE && a.infoId === infoId),
      failure: take(
        (a) => a.type === ActionTypes.RECEIVE_INFO_RESPONSE_FAILURE && a.infoId === infoId
      ),
    });
    if (infoFailure) {
      return;
    }
    serviceId = infoSuccess.infoJson?.['@id'];
  }
  try {
    // FIXME: This assumes a Level 2 endpoint, we should probably use one of the sizes listed
    //        explicitely in the info response instead.
    const imgUrl = `${serviceId}/full/200,/0/default.jpg`;
    const imgData = yield call(loadImageData, imgUrl);
    const { textColor, bgColor } = yield call(getPageColors, imgData);
    yield put(receiveColors(targetId, textColor, bgColor));
  } catch (error) {
    console.error(error);
    // NOP
  }
}

/** Root saga for the plugin */
export default function* textSaga() {
  yield all([
    // takeEvery(ActionTypes.IMPORT_CONFIG, injectTranslations),
    takeEvery(ActionTypes.RECEIVE_ANNOTATION, fetchExternalAnnotationResources),
    takeEvery(ActionTypes.RECEIVE_ANNOTATION, processTextsFromAnnotations),
    takeEvery(ActionTypes.SET_CANVAS, discoverExternalOcr),
    takeEvery(ActionTypes.UPDATE_WINDOW, onConfigChange),
    takeEvery(PluginActionTypes.REQUEST_TEXT, fetchAndProcessOcr),
    takeEvery(PluginActionTypes.REQUEST_COLORS, fetchColors),
  ]);
}
