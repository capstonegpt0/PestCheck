import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pestcheck.app',
  appName: 'PestCheck',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow connections to Render backend
    allowNavigation: [
      'pestcheck.onrender.com',
      'https://pestcheck.onrender.com',
      'https://*.onrender.com'
    ],
    cleartext: true // Allow HTTP for local development
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#10b981",
      showSpinner: true,
      spinnerColor: "#ffffff"
    },
    StatusBar: {
      style: 'light',
      backgroundColor: "#10b981"
    },
    Camera: {
      permissions: ['camera', 'photos']
    },
    Geolocation: {
      permissions: ['location']
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // Set this when building release APK
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    }
  },
  ios: {
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: true
  }
};

export default config;