import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ImageIcon from '@material-ui/icons/Image';
import DescriptionIcon from '@material-ui/icons/Description';

import { compose } from 'redux';
import withStyles from '@material-ui/core/styles/withStyles';

import MenuItem from '@material-ui/core/MenuItem';
import { MiradorMenuButton } from 'mirador/dist/es/src/components/MiradorMenuButton';
import { updateWindow } from 'mirador/dist/es/src/state/actions';

import {
  getCanvasIndex,
  getCurrentCanvas,
  getWindowConfig,
  getContainerId,
  getManifestTitle,
  getManifestMetadata,
} from 'mirador/dist/es/src/state/selectors';
import { receiveText, receiveTextFailure } from './state/actions';

const downloadDialogReducer = (state = {}, action) => {
  console.log("-- toolbar", state, action);
  if (action.type === 'OPEN_WINDOW_DIALOG') {
    return {
      ...state,
      [action.windowId]: {
        openDialog: action.dialogType,
      },
    };
  }

  if (action.type === 'CLOSE_WINDOW_DIALOG') {
    return {
      ...state,
      [action.windowId]: {
        openDialog: null,
      },
    };
  }
  return state;
};

// let imageVisible = true;
// let textVisible = true;

// Styles
const styles = (theme) => ({
  toolbar: {
    display: 'flex',
    'align-items': 'center',
    margin: '0.25rem 0',
    padding: '0.125rem',
    // border: '1px solid var(--color-neutral-300)',
    'border-radius': '0.25rem',
  },
  toggle: {
    'border-radius': '8px',
    'font-size': '1rem',
    'width': '5.3rem',
    '&:first-child': {
      'border-top-right-radius': 0,
      'border-bottom-right-radius': 0,
      'margin-right': '-1px',
    },
    '&:last-child': {
      'border-top-left-radius': 0,
      'border-bottom-left-radius': 0,
    },
    '& + &': {
      'border-left': '1px solid var(--color-neutral-300)',
    },
    '&:hover': {
      'z-index': 101,
    }
  },
  toggleX: {
    width: '5.3rem',
    'font-size': '1rem',
    padding: '0.5rem 0.5rem',
    'border-radius': 0,
    display: 'inline-flex',
    gap: '0.125rem',
    '& + &': {
      'xx-border-left': '1px solid var(--color-neutral-300)',
    },
  },
  'buttonGhost': {
    border: 'solid 1px var(--color-neutral-500)',
    'border-radius': '4px',
    color: 'var(--color-neutral-500)',
    background: 'white',
    padding: '0.5em 1em',
    'text-decoration': 'none',
  },
  'active': {
    'background': 'var(--color-neutral-500)',
    'color': 'var(--color-neutral-100)',
    '&:hover': {
      background: 'var(--color-neutral-400)',
      color: 'var(--color-neutral-100)',
    }
  },
});

const mapDispatchToProps = (dispatch, { windowId }) => ({
  updatePlainTextOptions: (plainText) => {
    console.log("-- plaintext.toolbar updatePlainTextOptions", windowId, plainText);
    return dispatch(updateWindow(windowId, { plainText }))
  },
  updatePlainTextDisabled: (plainText) => {
    console.log("-- plaintext.toolbar.updatePlainTextDisabled", windowId, plainText);
  }
});

class PlainTextViewerToolbar extends Component {
  openDialogAndCloseMenu() {
    const { handleClose, updatePlainTextOptions } = this.props;

    openDownloadDialog();
    handleClose();
  }

  render() {
    const {
      classes,
      updatePlainTextOptions,
      imageVisible,
      textVisible,
      textDisabled,
    } = this.props;
    console.log("-- plaintext.toggleTextButton.render", textVisible, textDisabled);
    return (
      <React.Fragment>
        <div className={`${classes.toolbar}`} id="wtf">
          <MiradorMenuButton
            containerId={`plaintextToolbar`}
            aria-label={`${imageVisible ? 'Hide' : 'Show'} Image`}
            onClick={() => {
              // updateWindowTextOverlayOptions({
              //   ...windowTextOverlayOptions,
              //   visible: !visible,
              // });
              // imageVisible = ! imageVisible;
              updatePlainTextOptions({ imageVisible: ! imageVisible, textVisible: textVisible });
              this.forceUpdate();
              console.log("-- gibberish image", imageVisible);
            }}
            disabled={false}
            aria-pressed={imageVisible}
            data-visible={imageVisible}
            className={`button ${classes.buttonGhost} ${classes.toggle} ${imageVisible ? classes.active : {}}`}
            // style={{ styles.toggle }}
          >
            <ImageIcon /> <span>Image</span>
          </MiradorMenuButton>
          <MiradorMenuButton
            containerId={`plaintextToolbar`}
            aria-label={`${textVisible ? 'Hide' : 'Show'} Text`}
            onClick={() => {
              // updateWindowTextOverlayOptions({
              //   ...windowTextOverlayOptions,
              //   visible: !visible,
              // });
              // textVisible = ! textVisible;
              updatePlainTextOptions({ imageVisible: imageVisible, textVisible: ! textVisible });
              this.forceUpdate();

              console.log("-- gibberish image", textVisible);
            }}
            disabled={textDisabled === true}
            aria-pressed={true}
            data-visible={textVisible}
            className={`button ${classes.buttonGhost} ${classes.toggle} ${textVisible ? classes.active : {}}`}
          >
            <DescriptionIcon /> <span>Text</span>
          </MiradorMenuButton>
        </div>
        {/* <MenuItem onClick={() => this.openDialogAndCloseMenu()}>
          <ListItemIcon>
            <DownloadIcon />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ variant: 'body1' }}>
            Download
          </ListItemText>
        </MenuItem> */}
      </React.Fragment>
    );
  }
}

PlainTextViewerToolbar.propTypes = {
  handleClose: PropTypes.func,
  updatePlainTextOptions: PropTypes.func,
  textDisabled: PropTypes.bool,
  classes: PropTypes.object,
};

PlainTextViewerToolbar.defaultProps = {
  handleClose: () => {},
  updatePlainTextOptions: () => {},
};

const enhance = compose(withStyles(styles));

export default {
  target: 'WindowTopBarPluginArea',
  mode: 'add',
  name: 'PlainTextViewerToolbarPlugin',
  component: enhance(PlainTextViewerToolbar),
  mapDispatchToProps,
  mapStateToProps: (state, { windowId }) => {
    const { imageToolsEnabled = true, plainText } = getWindowConfig(state, { windowId });
    let textDisabled = false;
    console.log("-- plaintext.PlainTextViewerToolbar.mapStateToProps", windowId, getContainerId(state));
    return {
      imageToolsEnabled,
      textDisabled,
      ...(plainText ?? { imageVisible: true, textVisible: receiveTextFailure })
    };
  },
};
