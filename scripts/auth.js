(function initAuthPage() {
  const statusEl = document.getElementById('auth-status');
  const tabs = Array.from(document.querySelectorAll('.auth-tab'));
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  const resendVerificationButton = document.getElementById('resend-verification-button');

  let pendingVerificationEmail = '';

  const config = window.RESUME_STUDIO_CONFIG || {};
  const supabaseUrl = config.supabaseUrl;
  const supabaseAnonKey = config.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    const environment = config.appEnvironment || 'unknown';
    setStatus(`Supabase config missing for "${environment}" environment. Update scripts/auth-config.js first.`, true);
    toggleFormAvailability(true);
    return;
  }

  const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = parseHashParams(window.location.hash);

  if (searchParams.get('reason') === 'inactive') {
    setStatus('Your account is inactive. Contact support or an administrator.', true);
  } else if (searchParams.get('verified') === '1' || hashParams.get('type') === 'signup') {
    setStatus('Email verification completed. You can sign in now.');
  }

  setupTabs();
  bindForms(supabaseClient, config);

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) {
      window.location.href = 'dashboard.html';
    }
  });

  function setupTabs() {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        activateTab(tab);
      });

      tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
          return;
        }

        event.preventDefault();
        const currentIndex = tabs.indexOf(tab);
        let nextIndex = currentIndex;

        if (event.key === 'ArrowRight') {
          nextIndex = (currentIndex + 1) % tabs.length;
        } else if (event.key === 'ArrowLeft') {
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = tabs.length - 1;
        }

        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex]);
      });
    });
  }

  function bindForms(client, appConfig) {
    document.getElementById('signin-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      setFormBusy(event.currentTarget, true);
      const form = new FormData(event.currentTarget);
      const email = normalizeEmail(form.get('email'));
      const password = String(form.get('password') || '');

      pendingVerificationEmail = email;
      showResendVerification(false);
      setStatus('Signing in...');

      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          handleSignInError(error, email);
          return;
        }

        const {
          data: { user }
        } = await client.auth.getUser();

        if (user?.id) {
          if (!user.email_confirmed_at) {
            await client.auth.signOut();
            setStatus('Email verification is required before sign in.', true);
            showResendVerification(Boolean(email));
            return;
          }

          const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('is_active')
            .eq('id', user.id)
            .single();

          if (profileError) {
            setStatus(profileError.message, true);
            await client.auth.signOut();
            return;
          }

          if (!profile.is_active) {
            await client.auth.signOut();
            setStatus('Your account is inactive. Contact support.', true);
            return;
          }
        }

        showResendVerification(false);
        pendingVerificationEmail = '';
        setStatus('Signed in. Redirecting...');
        window.location.href = 'dashboard.html';
      } finally {
        setFormBusy(event.currentTarget, false);
      }
    });

    document.getElementById('signup-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      setFormBusy(event.currentTarget, true);
      const form = new FormData(event.currentTarget);
      const email = normalizeEmail(form.get('email'));
      const password = String(form.get('password') || '');

      try {
        setStatus('Validating email domain...');
        const disposable = await isDisposableEmail(email);
        if (disposable) {
          setStatus('Disposable email addresses are blocked. Please use a permanent address.', true);
          return;
        }

        setStatus('Creating account...');
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getEmailVerificationRedirectUrl(appConfig)
          }
        });

        if (error) {
          setStatus(error.message, true);
          return;
        }

        pendingVerificationEmail = email;
        setStatus('Account created. Verify your email before signing in.');
      } finally {
        setFormBusy(event.currentTarget, false);
      }
    });

    document.getElementById('reset-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      setFormBusy(event.currentTarget, true);
      const form = new FormData(event.currentTarget);
      const email = normalizeEmail(form.get('email'));

      try {
        setStatus('Sending reset link...');
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: appConfig.passwordResetRedirectUrl || `${window.location.origin}/login.html`
        });

        if (error) {
          setStatus(error.message, true);
          return;
        }

        setStatus('Password reset email sent.');
      } finally {
        setFormBusy(event.currentTarget, false);
      }
    });

    resendVerificationButton?.addEventListener('click', async () => {
      const fallbackEmail = normalizeEmail(document.getElementById('signin-email')?.value);
      const email = pendingVerificationEmail || fallbackEmail;
      if (!email) {
        setStatus('Provide email in the sign-in form first.', true);
        return;
      }

      setStatus('Sending verification email...');
      setButtonBusy(resendVerificationButton, true);

      try {
        const { error } = await client.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: getEmailVerificationRedirectUrl(appConfig)
          }
        });

        if (error) {
          setStatus(error.message, true);
          return;
        }

        setStatus('Verification email sent. Confirm it, then sign in again.');
        showResendVerification(false);
      } finally {
        setButtonBusy(resendVerificationButton, false);
      }
    });
  }

  function handleSignInError(error, email) {
    const message = String(error?.message || 'Unable to sign in.');
    if (isInvalidCredentialsMessage(message)) {
      setStatus('Invalid login credentials. Confirm email and verify password, then try again.', true);
      if (email) {
        showResendVerification(true);
      }
      return;
    }

    setStatus(message, true);
  }

  function isInvalidCredentialsMessage(message) {
    return /invalid login credentials/i.test(message);
  }

  function getEmailVerificationRedirectUrl(appConfig) {
    return (
      appConfig.emailVerificationRedirectUrl ||
      appConfig.passwordResetRedirectUrl ||
      `${window.location.origin}/login.html`
    );
  }

  async function isDisposableEmail(email) {
    try {
      const response = await fetch(`https://www.disify.com/api/email/${encodeURIComponent(email)}`);
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      return Boolean(data.disposable);
    } catch (error) {
      return false;
    }
  }

  function parseHashParams(hashValue) {
    const normalized = String(hashValue || '').replace(/^#/, '');
    return new URLSearchParams(normalized);
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function activateTab(activeTab) {
    const target = activeTab.dataset.tab;
    tabs.forEach((tab) => {
      const isActive = tab === activeTab;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isVisible = panel.dataset.panel === target;
      panel.hidden = !isVisible;
      if (isVisible) {
        const firstField = panel.querySelector('input, textarea, select, button');
        firstField?.focus({ preventScroll: true });
      }
    });

    showResendVerification(false);
  }

  function setFormBusy(form, isBusy) {
    if (!form) return;
    form.setAttribute('aria-busy', String(isBusy));
    form.querySelectorAll('input, button, textarea, select').forEach((element) => {
      element.disabled = isBusy;
    });
  }

  function setButtonBusy(button, isBusy) {
    if (!button) return;
    button.disabled = isBusy;
    button.setAttribute('aria-busy', String(isBusy));
  }

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
  }

  function showResendVerification(visible) {
    if (!resendVerificationButton) return;
    resendVerificationButton.hidden = !visible;
  }

  function toggleFormAvailability(disabled) {
    document.querySelectorAll('input, button[type="submit"]').forEach((element) => {
      element.disabled = disabled;
    });
  }
})();
