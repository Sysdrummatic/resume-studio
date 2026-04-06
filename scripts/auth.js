(function initAuthPage() {
  const statusEl = document.getElementById('auth-status');
  const tabs = Array.from(document.querySelectorAll('.auth-tab'));
  const panels = Array.from(document.querySelectorAll('[data-panel]'));

  const config = window.RESUME_STUDIO_CONFIG || {};
  const supabaseUrl = config.supabaseUrl;
  const supabaseAnonKey = config.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    setStatus('Supabase config missing. Update scripts/auth-config.js first.', true);
    toggleFormAvailability(true);
    return;
  }

  const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  const inactiveReason = new URLSearchParams(window.location.search).get('reason');
  if (inactiveReason === 'inactive') {
    setStatus('Your account is inactive. Contact support or an administrator.', true);
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
      });
    });
  }

  function bindForms(client, appConfig) {
    document.getElementById('signin-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = String(form.get('email') || '').trim();
      const password = String(form.get('password') || '');

      setStatus('Signing in...');
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus(error.message, true);
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

      setStatus('Signed in. Redirecting...');
      window.location.href = 'dashboard.html';
    });

    document.getElementById('signup-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = String(form.get('email') || '').trim();
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
          emailRedirectTo: appConfig.appRedirectUrl || `${window.location.origin}/dashboard.html`
        }
      });

      if (error) {
        setStatus(error.message, true);
        return;
      }

      setStatus('Account created. Verify your email before signing in.');
    });

    document.getElementById('reset-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = String(form.get('email') || '').trim();

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

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
  }

  function toggleFormAvailability(disabled) {
    document.querySelectorAll('input, button[type="submit"]').forEach((element) => {
      element.disabled = disabled;
    });
  }
})();
