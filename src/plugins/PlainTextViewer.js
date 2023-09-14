import React, { Component, lazy, Suspense } from 'react';
import { compose } from 'redux';
import withStyles from '@material-ui/core/styles/withStyles';

import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import WindowCanvasNavigationControls from 'mirador/dist/es/src/containers/WindowCanvasNavigationControls';
const OSDViewer = lazy(() => import('mirador/dist/es/src//containers/OpenSeadragonViewer'));

import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import KeyboardArrowLeftIcon from '@material-ui/icons/KeyboardArrowLeft';

// Styles
const styles = (theme) => ({
  windowViewer: {},
  wrap: {
    // display: 'flex',
    flex: 1,
    display: 'grid',
    // gap: '1rem',
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
    display: ({ textsAvailable, visible }) => (textsAvailable && visible ? null : 'none'),
  },
  divider: {
    background: '#eee',
    color: '#fff',
    position: 'relative',
    width: '1rem',
    margin: '0',
  },
  toggle: {
    // background: '#000',
    // color: '#fff',
    // padding: '0.25rem',
    // transform: 'rotate(-90deg)',
    'font-size': '0.75rem',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translateX(-50%)',
    'z-index': 101,
    'background': '#fff',
    'border-width': 1,
    'box-shadow': '0 .5rem 1rem #00000026!important',
    'padding': '0.375rem 0.75rem',
    margin: '0',
    display: 'flex',
    'justify-content': 'center',
    'align-items': 'center',
    'border-radius': '50%',
    width: '2.5rem',
    height: '2.5rem',
  },
  'toggle-closed': {
    'margin-left': '-1rem',
  },
  paragraph: {
    margin: '0.25em 0',
  },
  // lineWrap: {
  //   position: 'relative',
  //   width: '100%',
  //   transition: 'background-color 0.3s ease',
  //   '&:hover': {
  //     'background-color': ({ color, opacity }) =>
  //       alpha(color, opacity - 0.15 > 0 ? opacity - 0.15 : 0),
  //   },
  // },
  button: {
    appearance: 'none',
    border: 0,
    display: 'block',
    cursor: 'pointer',
    fontSize: '15.4px',
    padding: '0.5em 2em 0.5em 0.5em',
    lineHeight: '1.2',
    'background-color': 'transparent',
  },
  line: {
    width: '100%',
    'text-align': 'left',
  },
  // isHighlighted: {
  //   'background-color': ({ color, opacity }) => alpha(color, opacity),
  //   '&:hover': {
  //     'background-color': ({ color, opacity }) => alpha(color, opacity),
  //   },
  // },
  correction: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: '24px',
    padding: '0.2em 0.25em',
    display: 'none',
    color: theme.palette.primary.main,
    transition: 'color 0.3s ease',
    '&, &:hover': {
      background: 'transparent',
    },
    '&:hover': {
      color: theme.palette.primary.dark
    }
  },
  correctionIcon: {
    fontSize: '1em',
    lineHeight: 0,
    padding: 0,
  },
  showCorrection: {
    display: 'block',
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
    const { enabled, viewer } = this.props;
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

      console.log("-- plaintext.componentDidMount", this.containerRef.current.clientWidth, this.containerRef.current.clientWidth >= 700);
      this.forceUpdate();
    })
    this.ro.observe(this.containerRef.current);
  }

  componentWillUnmount() {
    if ( this.ro ) {
      this.ro.disconnect();
    }
  }

  componentDidUpdate(prevProps) {
    console.log("-- plaintext.componentDidUpdate", prevProps, this.props, this.containerRef);
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
    } = this.props;

    console.log("-- plaintext.render", textsFetching, textsAvailable, this.isOpen);

    const { hasError } = this.state;

    if (hasError) {
      return <></>;
    }

    // this.osdRef = React.createRef();

    return (
      <Suspense fallback={<div />}>
        <div className={`ocr-wrap ${classes.wrap} ${classes[this.isOpen ? 'open' : 'closed']}`} ref={this.containerRef}>
          <div className={classes.viewer}>
            <OSDViewer windowId={windowId}>
              <WindowCanvasNavigationControls windowId={windowId} />
            </OSDViewer>
          </div>
          <div className={`ocr-divider ${classes.divider}`}>
            <button className={`ocr-toggle ${classes.toggle} ${!this.isOpen && classes['toggle-closed']}`} onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              this.isOpen = !this.isOpen;
              this.containerRef.current.dataset.isOpen = this.isOpen;
              console.log("-- plaintext.isOpen", this.isOpen, this.containerRef.current.dataset.isOpen);
              this.forceUpdate();
            }}>
              {this.isOpen ? <KeyboardArrowRightIcon /> : <KeyboardArrowLeftIcon />}
            </button>
          </div>
          <div key="ocr-container" className={`ocr-container ${classes.container}`}>
            <div style={{ padding: '1rem' }}>
            {textsAvailable &&
              !textsFetching &&
              pageTexts?.map((page) =>
                page?.lines?.map((line, index) => {
                  const showLine = true;
                  return (
                    showLine && [
                      <span ref={(ref) => {
                          this.lineRefs[index] = ref;
                          return true;
                        }}
                        key={`line_${index}`}>{line.text}</span>,
                        <br key={`br_${index}`}/>
                    ]
                  );
                })
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
};

PlainTextViewer.defaultProps = {
  enabled: true,
  open: true,
  viewer: undefined,
  viewConfig: {},
};

const enhance = compose(withStyles(styles));

export default enhance(PlainTextViewer);
