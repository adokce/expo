/**
 * @flow
 */

import Constants from 'expo-constants';
import React from 'react';
import { AppState, Clipboard, View } from 'react-native';

import Environment from '../utils/Environment';

import QRCodeButton from './QRCodeButton';
import OpenFromClipboardButton from './OpenFromClipboardButton';

const CLIPBOARD_POLL_INTERVAL = 2000;

function clipboardMightBeOpenable(str: string): boolean {
  if (!str) {
    return false;
  }

  // @username/experience
  if (str.match(/^@\w+\/\w+/)) {
    return true;
  } else if (str.startsWith('exp://')) {
    return true;
  } else if (str.startsWith('https://expo.io') || str.startsWith('https://exp.host')) {
    return true;
  }

  return false;
}

type Props = {
  pollForUpdates: boolean,
};

type State = {
  clipboardContents: string,
  displayOpenClipboardButton: boolean,
};

export default class ProjectTools extends React.Component {
  props: Props;
  state: State = {
    clipboardContents: '',
    displayOpenClipboardButton: false,
  };

  _clipboardUpdateInterval: ?number = null;

  componentDidMount() {
    this._startPollingClipboard();
    this._fetchClipboardContentsAsync();
    AppState.addEventListener('change', this._maybeResumePollingFromAppState);
  }

  componentDidUpdate(_prevProps: Props) {
    this._maybeUpdatePollingState(this.props);
  }

  componentWillUnmount() {
    this._stopPollingClipboard();

    AppState.removeEventListener('change', this._maybeResumePollingFromAppState);
  }

  render() {
    const { clipboardContents, displayOpenClipboardButton } = this.state;
    const shouldDisplayQRCodeButton = Constants.isDevice && !Environment.IsIOSRestrictedBuild;

    return (
      <View>
        {shouldDisplayQRCodeButton && <QRCodeButton last={!displayOpenClipboardButton} />}
        <OpenFromClipboardButton
          clipboardContents={clipboardContents}
          isValid={displayOpenClipboardButton}
        />
      </View>
    );
  }

  _fetchClipboardContentsAsync = async (): Promise<void> => {
    let clipboardContents = await Clipboard.getString();

    if (clipboardContents !== this.state.clipboardContents) {
      requestAnimationFrame(() => {
        this.setState({
          clipboardContents,
          displayOpenClipboardButton: clipboardMightBeOpenable(clipboardContents),
        });
      });
    }
  };

  _maybeResumePollingFromAppState = (nextAppState: string): void => {
    if (this.props.pollForUpdates) {
      if (nextAppState === 'active') {
        this._startPollingClipboard();
      } else {
        this._stopPollingClipboard();
      }
    }
  };

  _maybeUpdatePollingState = (props: Props): void => {
    if (props.pollForUpdates && !this._clipboardUpdateInterval) {
      this._startPollingClipboard();
    } else {
      if (!props.pollForUpdates && this._clipboardUpdateInterval) {
        this._stopPollingClipboard();
      }
    }
  };

  _startPollingClipboard = (): void => {
    this._clipboardUpdateInterval = setInterval(
      this._fetchClipboardContentsAsync,
      CLIPBOARD_POLL_INTERVAL
    );
  };

  _stopPollingClipboard = (): void => {
    if (this._clipboardUpdateInterval) {
      clearInterval(this._clipboardUpdateInterval);
      this._clipboardUpdateInterval = null;
    }
  };
}
