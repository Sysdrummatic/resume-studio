(function initEditorPreviewRenderer() {
  const DEFAULT_LABELS = {
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
  };

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type !== 'resume-preview:update') return;
    renderPreview(data.payload || {}, data.labels || DEFAULT_LABELS);
  });

  renderPreview({}, DEFAULT_LABELS);

  function renderPreview(payload, labels) {
    const safe = normalizePayload(payload);

    setText('summary-heading', labels.summary_heading || DEFAULT_LABELS.summary_heading);
    setText('github-activity-heading', labels.github_activity_heading || DEFAULT_LABELS.github_activity_heading);
    setText('experience-heading', labels.experience_heading || DEFAULT_LABELS.experience_heading);
    setText('education-heading', labels.education_heading || DEFAULT_LABELS.education_heading);
    setText('courses-heading', labels.courses_heading || DEFAULT_LABELS.courses_heading);
    setText('personal-info-heading', labels.personal_info_heading || DEFAULT_LABELS.personal_info_heading);
    setText('skills-heading', labels.skills_heading || DEFAULT_LABELS.skills_heading);
    setText('tech-stack-heading', labels.tech_stack_heading || DEFAULT_LABELS.tech_stack_heading);
    setText('languages-heading', labels.languages_heading || DEFAULT_LABELS.languages_heading);
    setText('interests-heading', labels.interests_heading || DEFAULT_LABELS.interests_heading);

    setText('brand-initials', safe.brand_initials || '');
    setText('name', safe.name || '');
    setText('role', safe.role || '');
    setText('summary', safe.summary || '');

    renderTimeline('experience-list', safe.experience, {
      headingKey: 'company',
      subheadingKey: 'role',
      highlightKey: 'highlights'
    });

    renderTimeline('education-list', safe.education, {
      headingKey: 'school',
      detailKey: 'detail'
    });

    renderTimeline('courses-list', safe.courses, {
      headingKey: 'name',
      customPeriod: (course) => (course.year ? String(course.year) : '')
    });

    renderContactList('contact-list', safe.contact);
    renderQrList('qr-list', safe.qr_codes);
    renderMeters('skills-list', safe.skills, {});
    renderMeters('languages-list', safe.languages, { showLevelText: true });
    renderPills('tech-stack', safe.tech_stack);
    renderPills('interests-list', safe.interests);
    renderGithubActivity(safe.github_activity);

    toggleSectionVisibility('summary', Boolean(safe.summary));
    toggleSectionVisibility('experience', safe.experience.length > 0);
    toggleSectionVisibility('education', safe.education.length > 0);
    toggleSectionVisibility('courses', safe.courses.length > 0);
    toggleSectionVisibility('skills', safe.skills.length > 0);
    toggleSectionVisibility('tech-stack', safe.tech_stack.length > 0);
    toggleSectionVisibility('languages', safe.languages.length > 0);
    toggleSectionVisibility('interests', safe.interests.length > 0);
    toggleSectionVisibility('personal-info', safe.contact.length > 0 || safe.qr_codes.length > 0);
  }

  function normalizePayload(payload) {
    const data = payload && typeof payload === 'object' ? payload : {};
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
      courses: normalizeObjectArray(data.courses),
      github_activity: data.github_activity && typeof data.github_activity === 'object' ? data.github_activity : null
    };
  }

  function normalizeObjectArray(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item === 'object');
  }

  function normalizeStringArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function setText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    }
  }

  function toggleSectionVisibility(sectionId, visible) {
    const section = document.querySelector(`[data-section="${sectionId}"]`);
    if (section) {
      section.hidden = !visible;
    }
  }

  function renderTimeline(containerId, items, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    items.forEach((item) => {
      const wrapper = document.createElement('article');
      wrapper.className = 'timeline-item';

      const period = document.createElement('div');
      period.className = 'timeline-item__period';
      period.textContent = formatPeriod(item.period, options.customPeriod, item);
      wrapper.appendChild(period);

      const content = document.createElement('div');
      content.className = 'timeline-item__content';

      const heading = document.createElement('h3');
      heading.textContent = item[options.headingKey] || '';
      content.appendChild(heading);

      if (options.subheadingKey && item[options.subheadingKey]) {
        const subheading = document.createElement('p');
        subheading.className = 'timeline-item__subheading';
        subheading.textContent = item[options.subheadingKey];
        content.appendChild(subheading);
      }

      if (options.highlightKey && Array.isArray(item[options.highlightKey])) {
        const list = document.createElement('ul');
        list.className = 'item-list';
        item[options.highlightKey].forEach((highlight) => {
          const listItem = document.createElement('li');
          listItem.textContent = highlight;
          list.appendChild(listItem);
        });
        content.appendChild(list);
      }

      if (options.detailKey && item[options.detailKey]) {
        const detailParagraph = document.createElement('p');
        detailParagraph.className = 'timeline-item__detail';
        detailParagraph.textContent = item[options.detailKey];
        content.appendChild(detailParagraph);
      }

      wrapper.appendChild(content);
      container.appendChild(wrapper);
    });
  }

  function renderContactList(containerId, contacts) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    contacts.forEach((item) => {
      const term = document.createElement('dt');
      term.textContent = item.label || '';
      const definition = document.createElement('dd');

      const value = formatContactValue(item.value || '');
      if (item.link) {
        const link = document.createElement('a');
        link.href = item.link;
        link.innerHTML = value;
        if (item.link.startsWith('http')) {
          link.target = '_blank';
          link.rel = 'noreferrer noopener';
        }
        definition.appendChild(link);
      } else {
        definition.innerHTML = value;
      }

      container.appendChild(term);
      container.appendChild(definition);
    });
  }

  function renderQrList(containerId, codes) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    codes.forEach((code) => {
      const figure = document.createElement('figure');
      figure.className = 'qr-card';

      const img = document.createElement('img');
      img.src = code.image || '';
      img.alt = code.label || 'QR code';
      const baseSize = typeof code.size === 'number' ? code.size : Number.parseInt(code.size, 10) || 140;
      const constrainedSize = Math.min(Math.max(baseSize, 60), 200);
      img.style.width = `${constrainedSize}px`;
      img.style.height = `${constrainedSize}px`;
      img.style.margin = '0 auto';

      const caption = document.createElement('figcaption');
      caption.textContent = code.label || '';

      figure.appendChild(img);
      figure.appendChild(caption);
      container.appendChild(figure);
    });
  }

  function renderMeters(containerId, items, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const steps = 5;
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'meter-item';

      const label = document.createElement('div');
      label.className = 'meter-item__label';
      const title = document.createElement('span');
      title.textContent = item.name || '';
      label.appendChild(title);

      if (options.showLevelText && item.level_text) {
        const note = document.createElement('span');
        note.className = 'meter-item__note';
        note.textContent = item.level_text;
        label.appendChild(note);
      }

      const meter = document.createElement('div');
      meter.className = 'meter';
      const level = typeof item.level === 'number' ? item.level : Number.parseInt(item.level, 10) || 0;

      for (let index = 0; index < steps; index += 1) {
        const dot = document.createElement('span');
        dot.className = 'meter__dot';
        if (index < level) {
          dot.classList.add('meter__dot--active');
        }
        meter.appendChild(dot);
      }

      row.appendChild(label);
      row.appendChild(meter);
      container.appendChild(row);
    });
  }

  function renderPills(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    items.forEach((item) => {
      const pill = document.createElement('li');
      pill.textContent = item;
      container.appendChild(pill);
    });
  }

  function renderGithubActivity(activity) {
    const card = document.getElementById('github-activity-card');
    if (!card) return;
    if (!activity || !activity.image) {
      card.hidden = true;
      return;
    }

    card.hidden = false;
    const heading = card.querySelector('h2');
    if (activity.label && heading) {
      heading.textContent = activity.label;
    }

    const image = document.getElementById('github-activity-image');
    image.src = activity.image;
    image.alt = activity.label || 'GitHub activity heatmap';

    const link = document.getElementById('github-activity-link');
    if (activity.profile) {
      link.href = activity.profile;
      link.style.pointerEvents = '';
      link.style.cursor = '';
    } else {
      link.removeAttribute('href');
      link.style.pointerEvents = 'none';
      link.style.cursor = 'default';
    }
  }

  function formatPeriod(periodText, customFormatter, item) {
    if (typeof customFormatter === 'function') {
      const customValue = customFormatter(item);
      return customValue || '';
    }
    if (!periodText) return '';
    const parts = String(periodText)
      .split('–')
      .map((part) => part.trim());
    if (parts.length <= 1) return parts[0];
    return `${parts[0]}\n${parts.slice(1).join(' – ')}`;
  }

  function formatContactValue(value) {
    if (!value) return '';
    let formatted = value;
    if (value.includes('@')) {
      formatted = value.replace('@', '@<wbr>');
    } else if (value.toLowerCase().includes('linkedin.com/in/')) {
      formatted = value.replace('in/', 'in/<wbr>');
    }
    return formatted;
  }
})();
