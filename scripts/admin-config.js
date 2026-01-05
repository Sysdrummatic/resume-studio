(function () {
  const ENV_PATH = 'data/private/user.env';
  const EVENT_NAME = 'admin-env-ready';

  function parseEnv(content) {
    if (typeof content !== 'string') {
      return {};
    }
    const result = {};
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (key) {
        result[key] = value;
      }
    });
    return result;
  }

  function normalize(value) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return null;
  }

  function emit(password) {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { password } }));
    } catch (eventError) {
      console.error('Unable to dispatch admin env event.', eventError);
    }
  }

  async function loadPassword() {
    try {
      const response = await fetch(ENV_PATH, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Unexpected response (${response.status}) while loading ${ENV_PATH}`);
      }
      const text = await response.text();
      const env = parseEnv(text);
      return normalize(env.ADMIN_PASSWORD);
    } catch (error) {
      console.warn(`User env file unavailable (${ENV_PATH}). Admin login disabled.`, error);
      return null;
    }
  }

  async function bootstrap() {
    const password = await loadPassword();
    window.ADMIN_PASSWORD = password;
    emit(password);
    return password;
  }

  const envPromise = bootstrap().catch((error) => {
    console.error('Unexpected error while loading admin environment.', error);
    emit(null);
    window.ADMIN_PASSWORD = null;
    return null;
  });

  window.adminEnvPromise = envPromise;
  window.__adminEnvPromise = envPromise;
})();
