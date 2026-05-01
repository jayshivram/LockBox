import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lockbox.app',
  appName: 'LockBox',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    PrivacyScreen: {
      enable: true,
      imageName: 'Default',
    },
  },
};

export default config;
