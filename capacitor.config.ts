import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biometrx.app',
  appName: 'BioMetRx',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0a100a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      backgroundColor: '#0a100a',
      style: 'DARK'
    }
  }
};

export default config;
