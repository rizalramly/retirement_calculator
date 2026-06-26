import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.retirementcalculatormy',
  appName: 'Retirement Calculator for Malaysian',
  // Vite outputs the static web build here; Capacitor copies it into the native app.
  webDir: 'dist',
};

export default config;
