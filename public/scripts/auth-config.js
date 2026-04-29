(function initLegacyAuthConfig() {
  const existingConfig = window.RESUME_STUDIO_CONFIG;
  if (existingConfig?.supabaseUrl && existingConfig?.supabaseAnonKey) {
    return;
  }

  const host = window.location.hostname.toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const isNetlifyHost = host.endsWith('.netlify.app');
  const isPreviewHost =
    isNetlifyHost && (host.includes('deploy-preview') || host.includes('--'));

  const runtimeEnv = window.RESUME_STUDIO_AUTH_ENV || {};
  const environment = isLocalHost ? 'development' : isPreviewHost ? 'preview' : 'production';

  const environmentConfig = runtimeEnv[environment] || {};
  const fallbackConfig = runtimeEnv.default || {};

  window.RESUME_STUDIO_CONFIG = {
    supabaseUrl: environmentConfig.supabaseUrl || fallbackConfig.supabaseUrl || '',
    supabaseAnonKey: environmentConfig.supabaseAnonKey || fallbackConfig.supabaseAnonKey || '',
    appRedirectUrl: `${window.location.origin}/dashboard.html`,
    emailVerificationRedirectUrl: `${window.location.origin}/login.html`,
    passwordResetRedirectUrl: `${window.location.origin}/login.html`,
    appEnvironment: environment
  };
})();
