(async function initMasterResumeEditor() {
  const config = window.RESUME_STUDIO_CONFIG || {};
  const statusEl = document.getElementById('editor-status');
  const formEl = document.getElementById('resume-editor-form');
  const yamlPreviewEl = document.getElementById('yaml-preview');
  const signOutButton = document.getElementById('signout-button');

  const KNOWN_KEYS = [
    'brand_initials',
    'name',
    'role',
    'summary',
    'contact',
    'qr_codes',
    'skills',
    'tech_stack',
    'languages',
    'interests',
    'experience',
    'education',
    'courses'
  ];

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

  const DEFAULT_TEMPLATE = {
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

  if (!window.jsyaml) {
    setStatus('YAML library not loaded. Check scripts/js-yaml.min.js.', true);
    return;
  }

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

  const draftKey = `resume-studio:master-resume-draft:v2:${session.user.id}`;

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

  const { data: resumeRows, error: resumeError } = await client
    .from('resumes')
    .select('id, title, locale, data, template_yaml, content_yaml')
    .eq('user_id', session.user.id)
    .limit(1);

  if (resumeError) {
    setStatus(resumeError.message, true);
    return;
  }

  const currentResumeRow = resumeRows?.[0] || null;
  if (!currentResumeRow?.id) {
    setStatus('Master resume row not found. Apply latest Supabase migrations first.', true);
    return;
  }

  const templateYamlText = normalizeText(currentResumeRow.template_yaml) || dumpYaml(DEFAULT_TEMPLATE);
  const templateData = normalizeResumeData(parseYamlObject(templateYamlText, DEFAULT_TEMPLATE));
  const parsedContentYaml = parseYamlObject(currentResumeRow.content_yaml, null);
  const rawSourceData = parsedContentYaml || currentResumeRow.data || templateData;
  const sourceData = normalizeResumeData(rawSourceData);
  const preservedFields = extractPreservedFields(rawSourceData);

  bindRepeaterButtons();
  bindEditorEvents();

  const draft = loadDraft(draftKey);
  if (draft && typeof draft === 'object') {
    fillForm(normalizeResumeData(draft.payload || templateData), draft.locale || currentResumeRow.locale || 'en');
    setStatus('Draft restored from your browser. Template source: database.');
  } else {
    fillForm(sourceData, currentResumeRow.locale || 'en');
    setStatus('Template loaded from database.');
  }

  updateYamlPreview();

  document.getElementById('save-draft-button').addEventListener('click', () => {
    const payload = buildResumePayload(preservedFields);
    const locale = getValue('locale') || currentResumeRow.locale || 'en';
    localStorage.setItem(draftKey, JSON.stringify({ payload, locale }));
    setStatus('Draft saved in this browser.');
  });

  document.getElementById('reset-template-button').addEventListener('click', () => {
    fillForm(templateData, currentResumeRow.locale || 'en');
    updateYamlPreview();
    setStatus('Form reset to template loaded from database.');
  });

  document.getElementById('publish-button').addEventListener('click', async () => {
    const payload = buildResumePayload(preservedFields);
    const locale = getValue('locale') || 'en';
    const contentYaml = dumpYaml(payload);

    setStatus('Publishing...');

    const { error } = await client
      .from('resumes')
      .update({
        title: payload.name ? `${payload.name} - Master resume` : 'Master resume',
        locale,
        data: payload,
        content_yaml: contentYaml
      })
      .eq('id', currentResumeRow.id)
      .eq('user_id', session.user.id);

    if (error) {
      setStatus(error.message, true);
      return;
    }

    localStorage.removeItem(draftKey);
    updateYamlPreview();
    setStatus('Master resume published successfully.');
  });

  signOutButton.addEventListener('click', async () => {
    await client.auth.signOut();
    window.location.href = 'login.html';
  });

  function bindRepeaterButtons() {
    Object.entries(REPEATER_CONFIGS).forEach(([sectionId, sectionConfig]) => {
      const addButton = document.getElementById(sectionConfig.addButtonId);
      addButton?.addEventListener('click', () => {
        appendRepeaterRow(sectionId, {});
        updateYamlPreview();
      });
    });
  }

  function bindEditorEvents() {
    formEl.addEventListener('input', () => {
      updateYamlPreview();
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
      updateYamlPreview();
    });
  }

  function fillForm(data, locale) {
    setValue('brand-initials', data.brand_initials || '');
    setValue('full-name', data.name || '');
    setValue('role', data.role || '');
    setValue('summary', data.summary || '');
    setValue('tech-stack', normalizeStringArray(data.tech_stack).join('\n'));
    setValue('interests', normalizeStringArray(data.interests).join('\n'));
    setValue('locale', locale || 'en');

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

  function buildResumePayload(preservedFields) {
    const payload = {
      brand_initials: getValue('brand-initials'),
      name: getValue('full-name'),
      role: getValue('role'),
      summary: getValue('summary'),
      contact: collectRepeaterRows('contact'),
      qr_codes: collectRepeaterRows('qr_codes'),
      skills: collectRepeaterRows('skills'),
      tech_stack: parseLineList(getValue('tech-stack')),
      languages: collectRepeaterRows('languages'),
      interests: parseLineList(getValue('interests')),
      experience: collectRepeaterRows('experience'),
      education: collectRepeaterRows('education'),
      courses: collectRepeaterRows('courses')
    };

    return { ...payload, ...preservedFields };
  }

  function collectRepeaterRows(sectionId) {
    const sectionConfig = REPEATER_CONFIGS[sectionId];
    const rowsContainer = sectionConfig ? document.getElementById(sectionConfig.rowsId) : null;
    if (!rowsContainer || !sectionConfig) {
      return [];
    }

    const rows = Array.from(rowsContainer.querySelectorAll('.repeater-row'));
    const result = rows
      .map((rowEl) => {
        const item = {};

        sectionConfig.fields.forEach((field) => {
          const input = rowEl.querySelector(`[data-field="${field.key}"]`);
          const raw = String(input?.value || '').trim();
          if (!raw) {
            return;
          }

          if (field.key === 'highlights') {
            const values = parseLineList(raw);
            if (values.length > 0) {
              item[field.key] = values;
            }
            return;
          }

          if (field.type === 'number') {
            const numeric = Number.parseInt(raw, 10);
            if (Number.isFinite(numeric)) {
              item[field.key] = numeric;
            }
            return;
          }

          item[field.key] = raw;
        });

        return item;
      })
      .filter((item) => Object.keys(item).length > 0);

    return result;
  }

  function updateYamlPreview() {
    const payload = buildResumePayload(preservedFields);
    yamlPreviewEl.textContent = dumpYaml(payload);
  }

  function parseYamlObject(yamlText, fallback) {
    const source = normalizeText(yamlText);
    if (!source) return fallback;
    try {
      const parsed = window.jsyaml.load(source);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (error) {
      console.warn('Unable to parse YAML from database.', error);
      return fallback;
    }
  }

  function dumpYaml(value) {
    return window.jsyaml.dump(value, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    });
  }

  function normalizeResumeData(source) {
    const data = source && typeof source === 'object' ? source : {};
    return {
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

  function extractPreservedFields(source) {
    if (!source || typeof source !== 'object') return {};
    const preserved = {};

    Object.keys(source).forEach((key) => {
      if (!KNOWN_KEYS.includes(key)) {
        preserved[key] = source[key];
      }
    });

    return preserved;
  }

  function normalizeObjectArray(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({ ...item }));
  }

  function normalizeStringArray(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  function parseLineList(value) {
    return String(value || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function loadDraft(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getValue(id) {
    return String(document.getElementById(id)?.value || '').trim();
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.value = value || '';
  }

  function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
  }
})();
