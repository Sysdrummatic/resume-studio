(async function initMasterResumeEditor() {
  const config = window.RESUME_STUDIO_CONFIG || {};
  const statusEl = document.getElementById('editor-status');
  const formEl = document.getElementById('resume-editor-form');
  const previewFrame = document.getElementById('resume-live-preview');
  const draftKeyBase = 'resume-studio:master-resume-draft:v2';

  const REPEATER_CONFIGS = {
    contact: {
      rowsId: 'contact-rows',
      addButtonId: 'contact-add-button',
      fields: [
        { key: 'label', label: 'Label' },
        { key: 'value', label: 'Value' },
        { key: 'link', label: 'Link (optional)' }
      ]
    },
    experience: {
      rowsId: 'experience-rows',
      addButtonId: 'experience-add-button',
      fields: [
        { key: 'period', label: 'Period' },
        { key: 'company', label: 'Company' },
        { key: 'role', label: 'Role' },
        { key: 'highlights', label: 'Highlights (one per line)', multiline: true }
      ]
    },
    education: {
      rowsId: 'education-rows',
      addButtonId: 'education-add-button',
      fields: [
        { key: 'period', label: 'Period' },
        { key: 'school', label: 'School' },
        { key: 'detail', label: 'Detail', multiline: true }
      ]
    },
    courses: {
      rowsId: 'courses-rows',
      addButtonId: 'courses-add-button',
      fields: [
        { key: 'year', label: 'Year', type: 'number' },
        { key: 'name', label: 'Course name' }
      ]
    },
    skills: {
      rowsId: 'skills-rows',
      addButtonId: 'skills-add-button',
      fields: [
        { key: 'name', label: 'Skill' },
        { key: 'level', label: 'Level (1-5)', type: 'number' }
      ]
    },
    languages: {
      rowsId: 'languages-rows',
      addButtonId: 'languages-add-button',
      fields: [
        { key: 'name', label: 'Language' },
        { key: 'level_text', label: 'Level text' },
        { key: 'level', label: 'Level (1-5)', type: 'number' }
      ]
    },
    qr_codes: {
      rowsId: 'qr-codes-rows',
      addButtonId: 'qr-codes-add-button',
      fields: [
        { key: 'label', label: 'Label' },
        { key: 'image', label: 'Image path or URL' },
        { key: 'size', label: 'Size', type: 'number' }
      ]
    }
  };

  const EMPTY_RESUME = {
    brand_initials: '',
    name: '',
    role: '',
    summary: '',
    contact: [],
    qr_codes: [],
    skills: [],
    tech_stack: [],
    languages: [],
    interests: [],
    experience: [],
    education: [],
    courses: []
  };

  const PREVIEW_LABELS = {
    en: {
      summary_heading: 'Summary',
      github_activity_heading: 'GitHub Activity',
      experience_heading: 'Experience',
      education_heading: 'Education',
      courses_heading: 'Courses',
      personal_info_heading: 'Personal Info',
      skills_heading: 'Skills',
      tech_stack_heading: 'Tech stack',
      languages_heading: 'Languages',
      interests_heading: 'Interests'
    },
    pl: {
      summary_heading: 'Podsumowanie',
      github_activity_heading: 'Aktywnosc GitHub',
      experience_heading: 'Doswiadczenie',
      education_heading: 'Edukacja',
      courses_heading: 'Kursy',
      personal_info_heading: 'Dane osobowe',
      skills_heading: 'Umiejetnosci',
      tech_stack_heading: 'Stack technologiczny',
      languages_heading: 'Jezyki',
      interests_heading: 'Zainteresowania'
    }
  };

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

  const draftKey = `${draftKeyBase}:${session.user.id}`;
  let currentResumeRow = null;
  let previewReady = false;

  bindRepeaterButtons();
  bindFormEvents();

  previewFrame?.addEventListener('load', () => {
    previewReady = true;
    syncPreview();
  });

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
  const draft = loadDraft(draftKey);

  if (draft && typeof draft === 'object') {
    fillForm(normalizeResumeData(draft.payload), draft.locale || currentResumeRow?.locale || 'en');
    setStatus('Draft restored from your browser.');
  } else {
    fillForm(normalizeResumeData(currentResumeRow?.data || EMPTY_RESUME), currentResumeRow?.locale || 'en');
    setStatus('Master resume loaded.');
  }

  syncPreview();

  document.getElementById('save-draft-button').addEventListener('click', () => {
    const payload = collectPayload();
    const locale = value('locale') || 'en';
    localStorage.setItem(draftKey, JSON.stringify({ payload, locale }));
    setStatus('Draft saved in this browser.');
  });

  document.getElementById('clear-form-button').addEventListener('click', () => {
    fillForm(EMPTY_RESUME, value('locale') || 'en');
    syncPreview();
    setStatus('Form cleared.', 'error');
  });

  document.getElementById('publish-button').addEventListener('click', async () => {
    const payload = collectPayload();
    const locale = value('locale') || 'en';

    if (!currentResumeRow?.id) {
      setStatus('Master resume row not found. Run Phase C completion migration first.', true);
      return;
    }

    setStatus('Publishing...');

    const { error } = await client
      .from('resumes')
      .update({
        title: payload.name ? `${payload.name} - Master resume` : 'Master resume',
        data: payload,
        locale
      })
      .eq('id', currentResumeRow.id)
      .eq('user_id', session.user.id);

    if (error) {
      setStatus(error.message, true);
      return;
    }

    localStorage.removeItem(draftKey);
    setStatus('Master resume published successfully.');
    syncPreview();
  });

  document.getElementById('signout-button').addEventListener('click', async () => {
    await client.auth.signOut();
    window.location.href = 'login.html';
  });

  function bindRepeaterButtons() {
    Object.entries(REPEATER_CONFIGS).forEach(([sectionId, sectionConfig]) => {
      const addButton = document.getElementById(sectionConfig.addButtonId);
      addButton?.addEventListener('click', () => {
        appendRepeaterRow(sectionId, {});
        syncPreview();
      });
    });
  }

  function bindFormEvents() {
    formEl.addEventListener('input', () => {
      syncPreview();
    });

    formEl.addEventListener('change', () => {
      syncPreview();
    });

    formEl.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-row]');
      if (!removeButton) return;
      const row = removeButton.closest('.repeater-row');
      if (!row) return;

      const sectionId = removeButton.getAttribute('data-remove-row');
      row.remove();

      const sectionConfig = REPEATER_CONFIGS[sectionId];
      const rowsContainer = sectionConfig ? document.getElementById(sectionConfig.rowsId) : null;
      if (rowsContainer && rowsContainer.children.length === 0) {
        appendRepeaterRow(sectionId, {});
      }

      syncPreview();
    });
  }

  function fillForm(data, localeCode) {
    setValue('brand-initials', data.brand_initials || '');
    setValue('full-name', data.name || '');
    setValue('role', data.role || '');
    setValue('summary', data.summary || '');
    setValue('tech-stack', normalizeStringArray(data.tech_stack).join('\n'));
    setValue('interests', normalizeStringArray(data.interests).join('\n'));
    setValue('locale', localeCode || 'en');

    renderRepeater('contact', normalizeObjectArray(data.contact));
    renderRepeater('experience', normalizeObjectArray(data.experience));
    renderRepeater('education', normalizeObjectArray(data.education));
    renderRepeater('courses', normalizeObjectArray(data.courses));
    renderRepeater('skills', normalizeObjectArray(data.skills));
    renderRepeater('languages', normalizeObjectArray(data.languages));
    renderRepeater('qr_codes', normalizeObjectArray(data.qr_codes));
  }

  function renderRepeater(sectionId, rows) {
    const sectionConfig = REPEATER_CONFIGS[sectionId];
    const rowsContainer = sectionConfig ? document.getElementById(sectionConfig.rowsId) : null;
    if (!rowsContainer || !sectionConfig) return;

    rowsContainer.innerHTML = '';
    const normalizedRows = rows.length > 0 ? rows : [{}];
    normalizedRows.forEach((row) => appendRepeaterRow(sectionId, row));
  }

  function appendRepeaterRow(sectionId, values) {
    const sectionConfig = REPEATER_CONFIGS[sectionId];
    const rowsContainer = sectionConfig ? document.getElementById(sectionConfig.rowsId) : null;
    if (!rowsContainer || !sectionConfig) return;

    const rowEl = document.createElement('article');
    rowEl.className = 'repeater-row';

    const gridEl = document.createElement('div');
    gridEl.className = 'repeater-row__grid';

    sectionConfig.fields.forEach((field) => {
      const labelEl = document.createElement('label');
      labelEl.textContent = field.label;

      let inputEl;
      if (field.multiline) {
        inputEl = document.createElement('textarea');
        inputEl.rows = 4;
        labelEl.style.gridColumn = '1 / -1';
      } else {
        inputEl = document.createElement('input');
        inputEl.type = field.type || 'text';
      }

      inputEl.setAttribute('data-field', field.key);

      const rawValue = values?.[field.key];
      if (field.key === 'highlights' && Array.isArray(rawValue)) {
        inputEl.value = rawValue.map((item) => String(item || '').trim()).filter(Boolean).join('\n');
      } else if (rawValue === null || rawValue === undefined) {
        inputEl.value = '';
      } else {
        inputEl.value = String(rawValue);
      }

      labelEl.appendChild(inputEl);
      gridEl.appendChild(labelEl);
    });

    const actionsEl = document.createElement('div');
    actionsEl.className = 'repeater-row__actions';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn--ghost';
    removeButton.textContent = 'Remove';
    removeButton.setAttribute('data-remove-row', sectionId);

    actionsEl.appendChild(removeButton);
    rowEl.appendChild(gridEl);
    rowEl.appendChild(actionsEl);
    rowsContainer.appendChild(rowEl);
  }

  function collectPayload() {
    return {
      brand_initials: value('brand-initials'),
      name: value('full-name'),
      role: value('role'),
      summary: value('summary'),
      contact: collectRepeaterRows('contact'),
      qr_codes: collectRepeaterRows('qr_codes'),
      skills: collectRepeaterRows('skills'),
      tech_stack: parseLineList(value('tech-stack')),
      languages: collectRepeaterRows('languages'),
      interests: parseLineList(value('interests')),
      experience: collectRepeaterRows('experience'),
      education: collectRepeaterRows('education'),
      courses: collectRepeaterRows('courses')
    };
  }

  function collectRepeaterRows(sectionId) {
    const sectionConfig = REPEATER_CONFIGS[sectionId];
    const rowsContainer = sectionConfig ? document.getElementById(sectionConfig.rowsId) : null;
    if (!rowsContainer || !sectionConfig) return [];

    return Array.from(rowsContainer.querySelectorAll('.repeater-row'))
      .map((rowEl) => {
        const item = {};

        sectionConfig.fields.forEach((field) => {
          const input = rowEl.querySelector(`[data-field="${field.key}"]`);
          const raw = String(input?.value || '').trim();
          if (!raw) return;

          if (field.key === 'highlights') {
            const list = parseLineList(raw);
            if (list.length > 0) {
              item.highlights = list;
            }
            return;
          }

          if (field.type === 'number') {
            const parsed = Number.parseInt(raw, 10);
            if (Number.isFinite(parsed)) {
              item[field.key] = parsed;
            }
            return;
          }

          item[field.key] = raw;
        });

        return item;
      })
      .filter((item) => Object.keys(item).length > 0);
  }

  function syncPreview() {
    if (!previewReady || !previewFrame?.contentWindow) return;

    const payload = collectPayload();
    const locale = value('locale') || 'en';
    const labels = PREVIEW_LABELS[locale] || PREVIEW_LABELS.en;

    previewFrame.contentWindow.postMessage(
      {
        type: 'resume-preview:update',
        payload,
        labels
      },
      window.location.origin
    );
  }

  function normalizeResumeData(source) {
    const data = source && typeof source === 'object' ? source : {};

    if (data.personal && typeof data.personal === 'object') {
      const mapped = {
        ...EMPTY_RESUME,
        name: data.personal.name || '',
        role: data.personal.headline || data.role || '',
        summary: data.summary || '',
        experience: normalizeLegacyExperience(data.experience),
        skills: normalizeLegacySkills(data.skills)
      };

      if (data.personal.email) {
        mapped.contact.push({ label: 'Email', value: data.personal.email, link: `mailto:${data.personal.email}` });
      }
      if (data.personal.location) {
        mapped.contact.push({ label: 'Location', value: data.personal.location });
      }

      return mapped;
    }

    return {
      ...EMPTY_RESUME,
      brand_initials: normalizeText(data.brand_initials),
      name: normalizeText(data.name),
      role: normalizeText(data.role),
      summary: normalizeText(data.summary),
      contact: normalizeObjectArray(data.contact),
      qr_codes: normalizeObjectArray(data.qr_codes),
      skills: normalizeObjectArray(data.skills),
      tech_stack: normalizeStringArray(data.tech_stack),
      languages: normalizeObjectArray(data.languages),
      interests: normalizeStringArray(data.interests),
      experience: normalizeObjectArray(data.experience),
      education: normalizeObjectArray(data.education),
      courses: normalizeObjectArray(data.courses)
    };
  }

  function normalizeLegacyExperience(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return { company: item, role: '', period: '', highlights: [] };
        }
        return {
          company: item.company || '',
          role: item.role || item.title || '',
          period: item.period || '',
          highlights: Array.isArray(item.highlights) ? item.highlights : []
        };
      })
      .filter((item) => item.company || item.role || item.period || item.highlights.length > 0);
  }

  function normalizeLegacySkills(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return { name: item, level: 3 };
        }
        return {
          name: item.name || '',
          level: typeof item.level === 'number' ? item.level : Number.parseInt(item.level, 10) || 3
        };
      })
      .filter((item) => item.name);
  }

  function normalizeObjectArray(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({ ...item }));
  }

  function normalizeStringArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  function parseLineList(value) {
    return String(value || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function loadDraft(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
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
      input.value = nextValue || '';
    }
  }

  function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function setStatus(message, variant = 'success') {
    const normalizedVariant = variant === true ? 'error' : variant;
    window.ResumeStatusToast?.show(message, normalizedVariant);
    if (!statusEl) return;
    statusEl.textContent = '';
    statusEl.classList.remove('is-error');
  }
})();
