import React, { Component, lazy, Suspense, Fragment } from 'react';
import { compose } from 'redux';
import withStyles from '@material-ui/core/styles/withStyles';

import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import WindowCanvasNavigationControls from 'mirador/dist/es/src/containers/WindowCanvasNavigationControls';
const OSDViewer = lazy(() => import('mirador/dist/es/src//containers/OpenSeadragonViewer'));

import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import KeyboardArrowLeftIcon from '@material-ui/icons/KeyboardArrowLeft';

import SpeakerNotesIcon from '@material-ui/icons/SpeakerNotes';
import SpeakerNotesOffIcon from '@material-ui/icons/SpeakerNotesOff';

// Styles
const styles = (theme) => ({
  windowViewer: {},
  wrap: {
    // display: 'flex',
    flex: 1,
    display: 'grid',
    // gap: '1rem',
  },
  'image-text': {
    'grid-template-columns': '6fr 4fr',
  },
  'image': {
    'grid-template-columns': '1fr 0',
  },
  'text': {
    'grid-template-columns': '0 1fr',
  },
  // open: {
  //   'grid-template-columns': '6fr min-content 4fr',
  // },
  // closed:  {
  //   'grid-template-columns': '1fr min-content 0',
  // },
  viewer: {
    position: 'relative',
    display: 'flex',
    flex: 1,
    '&[data-visible="false"]': {
      visibility: 'hidden',
    }
  },
  container: {
    'font-family': 'var(--font-base-family), "Roboto", "Helvetica", "Arial", sans-serif',
    'z-index': 1,
    flex: '0 0 auto',
    'padding-left': '0.5rem',
    'background-color': '#ffffff',
    // padding: '0.75rem',
    'box-sizing': 'border-box',
    // 'max-width': '50%',
    height: '100%',
    'overflow-y': 'auto',
    'scroll-behavior': 'smooth',
    'border-left': `1px solid rgba(0,0,0,0.25)`,
    display: ({ textsAvailable, textVisible }) => (textsAvailable && textVisible ? null : 'none'),
  },
  'ocrText': {
    'padding': '1rem',
    'white-space': 'pre-line',
  },
});

class PlainTextViewer extends Component {
  /** Register refs that allow us to directly access the actual render components */
  constructor(props) {
    super(props);

    this.renderRefs = [React.createRef(), React.createRef()];
    this.containerRef = React.createRef();

    this.lineRefs = [];
    this.state = {};

    this.osdRef = null;

    this.isOpen = null; // initially

    this.containerRef = React.createRef(); 

    console.log("-- plaintext", props);

  }

    /** Register OpenSeadragon callback on initial mount */
  componentDidMount() {
    const { enabled, viewer, imageVisible, textVisible, updatePlainTextOptions } = this.props;
    this.ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const contentBoxSize = entry.contentBoxSize[0];
      if ( contentBoxSize.inlineSize < 700 ) {
        this.containerRef.current.dataset.viewport = 'sm';
        // if ( this.isOpen == null ) { this.isOpen = false; }
      } else {
        this.containerRef.current.dataset.viewport = 'lg';
        // if ( this.isOpen == null ) { this.isOpen = true; }
      }
      this.lastWidth = contentBoxSize.inlineSize;

      if ( this.isOpen == null ) {
        this.isOpen = this.containerRef.current.dataset.isOpen = this.containerRef.current.clientWidth >= 700;
      }

      if ( this.containerRef.current.clientWidth < 700 && imageVisible && textVisible ) {
        updatePlainTextOptions({ imageVisible: imageVisible, textVisible: false });
      }

      console.log("-- plaintext.componentDidMount", this.containerRef.current.clientWidth, this.containerRef.current.clientWidth >= 700);
      this.forceUpdate();
    })
    // this.ro.observe(this.containerRef.current);
    console.log("-- plaintext.componentDidMount", this.props, this.containerRef, this.containerRef.current.clientWidth, imageVisible, textVisible);
    if ( this.containerRef.current.clientWidth == 0 ) { return; }
    if ( this.containerRef.current.clientWidth < 700 && imageVisible && textVisible ) {
      updatePlainTextOptions({ imageVisible: true, textVisible: false });
    }
  }

  componentWillUnmount() {
    if ( this.ro ) {
      this.ro.disconnect();
    }
  }

  componentDidUpdate(prevProps) {
    const { imageVisible, textVisible, updatePlainTextOptions } = this.props;
    console.log("-- plaintext.componentDidUpdate", prevProps, this.props, this.containerRef, this.containerRef.current.clientWidth, imageVisible, textVisible);
    if ( this.containerRef.current.clientWidth < 700 && imageVisible && textVisible ) {
      if ( prevProps.imageVisible && prevProps.textVisible ) {
        updatePlainTextOptions({ imageVisible: imageVisible, textVisible: false });
      } else if ( imageVisible && ! prevProps.textVisible && textVisible ) {
        updatePlainTextOptions({ imageVisible: false, textVisible: true });
      }
    }
  }

  /** Update container dimensions and page scale/offset every time the OSD viewport changes. */
  registerOsdCallback() {
    const { viewer } = this.props;
    console.log("-- plaintext: componentDidMount", viewer);
    viewer.addHandler('update-viewport', this.onUpdateViewport.bind(this));
  }

  /** OpenSeadragon viewport update callback */
  onUpdateViewport() {
    // Do nothing if the overlay is not currently rendered
    if (!this.shouldRender) {
      return;
    }

    const { viewer, canvasWorld } = this.props;
    console.log("-- plaintext.onUpdateViewer", viewer, canvasWorld);
  }

  shouldRender() {
    return true;
  }

  /**
   * Renders things
   */
  render() {
    const {
      windowId,
      canvasId,
      classes,
      correction,
      skipEmptyLines,
      pageTexts,
      textsAvailable,
      textsFetching,
      doHighlightLine,
      t,
      imageVisible,
      textVisible,
    } = this.props;

    console.log("-- plaintext.render", textsFetching, textsAvailable, this.isOpen, `imageVisible=${imageVisible}`, `textVisible=${textVisible}`);

    const { hasError } = this.state;

    let panelClass = 'image-text';
    if ( imageVisible && ! textVisible ) { panelClass = 'image'; }
    else if ( ! imageVisible && textVisible ) { panelClass = 'text'; }

    if (hasError) {
      return <></>;
    }

    // this.osdRef = React.createRef();

    return (
      <Suspense fallback={<div />}>
        <div className={`ocr-wrap ${classes.wrap} ${classes[panelClass]}`} ref={this.containerRef}>
          <div className={classes.viewer} data-visible={String(imageVisible)}>
            <OSDViewer windowId={windowId}>
              <WindowCanvasNavigationControls windowId={windowId} />
            </OSDViewer>
          </div>
          <div key="ocr-container" className={`ocr-container ${classes.container}`} data-visible={String(textVisible)}>
            <div className={`${classes.ocrText}`}>
            {textsAvailable &&
              !textsFetching &&
              pageTexts?.map((page) =>
                <div key="1" dangerouslySetInnerHTML={{__html: page.lines[0].text}}></div>
                // page?.lines?.map((line, index) => {
                //   const showLine = true;
                //   return (
                //     showLine && [
                //       <span ref={(ref) => {
                //           this.lineRefs[index] = ref;
                //           return true;
                //         }}
                //         key={`line_${index}`}>{line.text}</span>,
                //         <br key={`br_${index}`}/>
                //     ]
                //   );
                // })
              )}
            </div>
          </div>
        </div>
      </Suspense>
    );
  }  

}

PlainTextViewer.propTypes = {
  canvasId: PropTypes.string,
  canvasIndex: PropTypes.number,
  classes: PropTypes.object,
  color: PropTypes.string,
  correction: PropTypes.object,
  skipEmptyLines: PropTypes.bool,
  doHighlightLine: PropTypes.func,
  doSetCanvas: PropTypes.func,
  highlightedLine: PropTypes.object,
  manifestId: PropTypes.string,
  manifestTitle: PropTypes.string,
  manifestMetadata: PropTypes.array,
  opacity: PropTypes.number,
  pageTexts: PropTypes.array,
  // t: PropTypes.func.isRequired,
  textsAvailable: PropTypes.bool,
  textsFetching: PropTypes.bool,
  visible: PropTypes.bool,
  windowId: PropTypes.string.isRequired,
  viewConfig: PropTypes.object,
  viewer: PropTypes.object,
  dialogOpen: PropTypes.bool,
  updatePlainTextOptions: PropTypes.func,
};

PlainTextViewer.defaultProps = {
  enabled: true,
  open: true,
  viewer: undefined,
  viewConfig: {},
  imageVisible: true,
  textVisiible: true,
  updatePlainTextOptions: () => {},
};

const enhance = compose(withStyles(styles));

export default enhance(PlainTextViewer);
