(async function initProtectedPage() {
  const config = window.RESUME_STUDIO_CONFIG || {};
  const supabaseUrl = config.supabaseUrl;
  const supabaseAnonKey = config.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    window.location.href = 'login.html';
    return;
  }

  const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await client.auth.getSession();

  if (!data.session) {
    window.location.href = 'login.html';
    return;
  }

  const emailElement = document.getElementById('session-email');
  const statusElement = document.getElementById('profile-status');
  const adminPanelElement = document.getElementById('admin-panel');
  const adminStatsElement = document.getElementById('admin-stats');
  const adminUserListElement = document.getElementById('admin-user-list');
  emailElement.textContent = `Signed in as ${data.session.user.email}.`;

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', data.session.user.id)
    .single();

  if (profileError) {
    setStatus(`Unable to load profile: ${profileError.message}`, 'error');
  } else if (!profile?.is_active) {
    await client.auth.signOut();
    window.location.href = 'login.html?reason=inactive';
    return;
  } else {
    setStatus('Profile status: active.');
  }

  if (profile?.role === 'admin') {
    adminPanelElement.hidden = false;
    await loadAdminData();
  }

  document.getElementById('signout-button').addEventListener('click', async () => {
    await client.auth.signOut();
    window.location.href = 'login.html';
  });

  async function loadAdminData() {
    const { data: statsRows, error: statsError } = await client.rpc('get_admin_platform_stats');
    if (statsError) {
      adminStatsElement.textContent = '';
      setStatus(`Unable to load platform stats: ${statsError.message}`, 'error');
    } else {
      const stats = statsRows?.[0];
      if (stats) {
        adminStatsElement.innerHTML = `
          <p><strong>Total users:</strong> ${stats.total_users}</p>
          <p><strong>Active users:</strong> ${stats.active_users}</p>
          <p><strong>Total resumes:</strong> ${stats.total_resumes}</p>
          <p><strong>Active public links:</strong> ${stats.total_public_links}</p>
          <p><strong>Total public views:</strong> ${stats.total_public_views}</p>
        `;
      }
    }

    const { data: users, error: usersError } = await client.rpc('get_admin_user_overview');
    if (usersError) {
      adminUserListElement.innerHTML = '';
      setStatus(usersError.message, 'error');
      return;
    }

    adminUserListElement.innerHTML = '';
    users.forEach((user) => {
      const row = document.createElement('li');
      row.className = 'admin-user-row';
      const safeEmail = String(user.email || '');
      row.innerHTML = `
        <div>
          <p class="admin-user-row__email">${escapeHtml(safeEmail || 'unknown')}</p>
          <p class="admin-user-row__meta">Role: ${escapeHtml(user.role)} · Resumes: ${user.resume_count} · Links: ${user.public_link_count}</p>
        </div>
        <div class="admin-user-row__actions">
          <button type="button" class="btn btn--ghost" data-action="toggle" data-user="${user.id}" data-active="${String(user.is_active)}">
            ${user.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button type="button" class="btn btn--ghost" data-action="reset" data-email="${encodeURIComponent(safeEmail)}">
            Send reset link
          </button>
        </div>
      `;
      adminUserListElement.appendChild(row);
    });

    adminUserListElement.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', async () => {
        const action = button.dataset.action;
        if (action === 'toggle') {
          const targetUserId = button.dataset.user;
          const currentlyActive = button.dataset.active === 'true';
          const { error } = await client.rpc('set_user_active', {
            target_user_id: targetUserId,
            target_is_active: !currentlyActive
          });
          if (error) {
            setStatus(error.message, 'error');
            return;
          }
          setStatus('User status updated.');
          await loadAdminData();
          return;
        }

        if (action === 'reset') {
          const email = decodeURIComponent(button.dataset.email || '');
          const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: config.passwordResetRedirectUrl || `${window.location.origin}/login.html`
          });
          if (error) {
            setStatus(error.message, 'error');
            return;
          }
          setStatus(`Reset link sent to ${email}.`);
        }
      });
    });
  }

  function setStatus(message, variant = 'success') {
    window.ResumeStatusToast?.show(message, variant);
    if (!statusElement) return;
    statusElement.textContent = '';
    statusElement.classList.remove('is-error');
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
})();
