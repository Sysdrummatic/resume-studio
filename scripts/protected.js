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
  emailElement.textContent = `Signed in as ${data.session.user.email}.`;

  document.getElementById('signout-button').addEventListener('click', async () => {
    await client.auth.signOut();
    window.location.href = 'login.html';
  });
})();
