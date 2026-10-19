import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';
import { Style } from '@capacitor/status-bar';

const config: CapacitorConfig = {
  appId: 'br.com.formaturismo.TecladoLab',
  appName: 'Teclado Lab',
  webDir: 'www',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: Style.Light,
      backgroundColor: '#FFE234',
    },
    Keyboard: {
      resize: KeyboardResize.None,
      resizeOnFullScreen: false,
    },
  },
};

export default config;
