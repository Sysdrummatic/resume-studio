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
    setStatus('Supabase config missing. Update scripts/auth-config.js first.', true);
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
        const target = tab.dataset.tab;
        tabs.forEach((item) => {
          const active = item === tab;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        panels.forEach((panel) => {
          panel.hidden = panel.dataset.panel !== target;
        });
        showResendVerification(false);
      });
    });
  }

  function bindForms(client, appConfig) {
    document.getElementById('signin-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = normalizeEmail(form.get('email'));
      const password = String(form.get('password') || '');

      pendingVerificationEmail = email;
      showResendVerification(false);
      setStatus('Signing in...');

      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        handleSignInError(error, email);
        return;
      }

      const {
        data: { user }
      } = await client.auth.getUser();

      if (user?.id) {
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
    });

    document.getElementById('signup-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = normalizeEmail(form.get('email'));
      const password = String(form.get('password') || '');

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
    });

    document.getElementById('reset-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = normalizeEmail(form.get('email'));

      setStatus('Sending reset link...');
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: appConfig.passwordResetRedirectUrl || `${window.location.origin}/login.html`
      });

      if (error) {
        setStatus(error.message, true);
        return;
      }

      setStatus('Password reset email sent.');
    });

    resendVerificationButton?.addEventListener('click', async () => {
      const fallbackEmail = normalizeEmail(document.getElementById('signin-email')?.value);
      const email = pendingVerificationEmail || fallbackEmail;
      if (!email) {
        setStatus('Provide email in the sign-in form first.', true);
        return;
      }

      setStatus('Sending verification email...');
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
