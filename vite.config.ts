
import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  /**
   * Prioritize the user-provided key, falling back to environment variables.
   * This ensures the application is immediately operational as requested.
   */
  const apiKey = "AIzaSyD95hipvcvYjmZ4OMH1RVbMgYQ_Vhtdkq0" || env.API_KEY || env.VITE_API_KEY || "";
  
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    server: {
      port: 5173,
      strictPort: true,
      open: true
    }
  };
});
