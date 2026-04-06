(async function initMasterResumeEditor() {
  const config = window.RESUME_STUDIO_CONFIG || {};
  const statusEl = document.getElementById('editor-status');
  const steps = Array.from(document.querySelectorAll('.editor-step'));
  const reviewOutput = document.getElementById('review-output');
  const draftKey = 'resume-studio:master-resume-draft:v1';

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    setStatus('Supabase config missing. Update scripts/auth-config.js first.', true);
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, is_active')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile?.is_active) {
    await client.auth.signOut();
    window.location.href = 'login.html?reason=inactive';
    return;
  }

  let currentStep = 0;
  let currentResumeRow = null;

  const { data: resumeRows, error: resumeError } = await client
    .from('resumes')
    .select('id, title, data, locale')
    .eq('user_id', session.user.id)
    .limit(1);

  if (resumeError) {
    setStatus(resumeError.message, true);
    return;
  }

  currentResumeRow = resumeRows?.[0] || null;
  const draftData = loadDraft();
  const initialData = draftData || (currentResumeRow?.data ?? {});
  fillForm(initialData);
  renderStep();
  setStatus(draftData ? 'Draft restored from your browser.' : 'Master resume loaded.');

  document.getElementById('next-button').addEventListener('click', () => {
    if (currentStep < steps.length - 1) {
      currentStep += 1;
      renderStep();
    }
  });

  document.getElementById('back-button').addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep -= 1;
      renderStep();
    }
  });

  document.getElementById('save-draft-button').addEventListener('click', () => {
    const payload = collectPayload();
    localStorage.setItem(draftKey, JSON.stringify(payload));
    setStatus('Draft saved in this browser.');
  });

  document.getElementById('publish-button').addEventListener('click', async () => {
    const payload = collectPayload();
    setStatus('Publishing...');

    if (!currentResumeRow?.id) {
      setStatus('Master resume row not found. Run Phase C completion migration first.', true);
      return;
    }

    const { error } = await client
      .from('resumes')
      .update({
        title: payload.personal.name ? `${payload.personal.name} - Master resume` : 'Master resume',
        data: payload,
        locale: 'en'
      })
      .eq('id', currentResumeRow.id)
      .eq('user_id', session.user.id);

    if (error) {
      setStatus(error.message, true);
      return;
    }

    localStorage.removeItem(draftKey);
    setStatus('Master resume published successfully.');
  });

  document.getElementById('signout-button').addEventListener('click', async () => {
    await client.auth.signOut();
    window.location.href = 'login.html';
  });

  function renderStep() {
    steps.forEach((stepEl, index) => {
      stepEl.hidden = index !== currentStep;
    });

    if (currentStep === steps.length - 1) {
      reviewOutput.textContent = JSON.stringify(collectPayload(), null, 2);
    }
  }

  function collectPayload() {
    const experienceText = value('experience');
    const skillsText = value('skills');

    return {
      personal: {
        name: value('full-name'),
        headline: value('headline'),
        email: value('email'),
        location: value('location')
      },
      summary: value('summary'),
      experience: experienceText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ title: line })),
      skills: skillsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    };
  }

  function fillForm(data) {
    const personal = data.personal || {};
    setValue('full-name', personal.name || '');
    setValue('headline', personal.headline || '');
    setValue('email', personal.email || '');
    setValue('location', personal.location || '');
    setValue('summary', data.summary || '');
    setValue('experience', normalizeExperience(data.experience));
    setValue('skills', Array.isArray(data.skills) ? data.skills.join(', ') : '');
  }

  function normalizeExperience(value) {
    if (!Array.isArray(value)) return '';
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        return item.title || item.role || '';
      })
      .filter(Boolean)
      .join('\n');
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function value(id) {
    return String(document.getElementById(id)?.value || '').trim();
  }

  function setValue(id, nextValue) {
    const input = document.getElementById(id);
    if (input) {
      input.value = nextValue;
    }
  }

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
  }
})();
