(async function initPublicResumePage() {
  const config = window.RESUME_STUDIO_CONFIG || {};
  const statusEl = document.getElementById('public-status');
  const contentEl = document.getElementById('public-content');
  const robotsMetaEl = document.getElementById('robots-meta');
  const slug = resolveSlugFromPath();

  if (!slug) {
    setError('Missing public link slug.');
    return;
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    setError('Supabase config missing. Update scripts/auth-config.js.');
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data, error } = await client.rpc('get_public_resume_by_slug', { input_slug: slug });

  if (error) {
    setError(error.message);
    return;
  }

  const resume = Array.isArray(data) ? data[0] : null;
  if (!resume) {
    setError('Resume not found or link is inactive.');
    return;
  }

  robotsMetaEl.setAttribute('content', resume.allow_indexing ? 'index,follow' : 'noindex,nofollow');

  const { error: viewError } = await client.rpc('increment_public_link_view', { input_slug: slug });
  if (viewError) {
    console.warn('Unable to increment view count.', viewError.message);
  }

  renderResume(resume);

  function renderResume(resumeRow) {
    const resumeData = resumeRow.data || {};
    const personal = resumeData.personal || {};
    const experience = normalizeArray(resumeData.experience);
    const education = normalizeArray(resumeData.education);
    const skills = normalizeArray(resumeData.skills);

    contentEl.hidden = false;
    statusEl.textContent = '';
    contentEl.innerHTML = `
      <h2>${escapeHtml(personal.name || resumeRow.title || 'Resume')}</h2>
      ${personal.headline ? `<p>${escapeHtml(personal.headline)}</p>` : ''}
      ${resumeData.summary ? `<p>${escapeHtml(resumeData.summary)}</p>` : ''}
      ${renderListSection('Experience', experience)}
      ${renderListSection('Education', education)}
      ${renderListSection('Skills', skills)}
    `;
  }

  function renderListSection(title, items) {
    if (!items.length) return '';
    const htmlItems = items
      .map((item) => {
        if (typeof item === 'string') {
          return `<li>${escapeHtml(item)}</li>`;
        }
        return `<li>${escapeHtml(item.title || item.name || JSON.stringify(item))}</li>`;
      })
      .join('');
    return `<section><h3>${title}</h3><ul>${htmlItems}</ul></section>`;
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function resolveSlugFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart !== 'index.html' && parts[0] === 'r') {
      return lastPart;
    }
    return new URLSearchParams(window.location.search).get('slug');
  }

  function setError(message) {
    statusEl.textContent = message;
    statusEl.classList.add('is-error');
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
