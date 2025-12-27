async function loadResume() {
  try {
    const response = await fetch('data/resume.yaml');
    if (!response.ok) {
      throw new Error('Unable to load resume data');
    }
    const yamlText = await response.text();
    const data = jsyaml.load(yamlText);
    renderResume(data);
  } catch (error) {
    showError(error);
  }
}

function renderResume(data) {
  setText('brand-initials', data.brand_initials ?? 'LM');
  setText('name', data.name ?? '');
  setText('role', data.role ?? '');
  setText('summary', (data.summary || '').trim());

  renderTimeline('experience-list', data.experience || [], {
    headingKey: 'company',
    subheadingKey: 'role',
    highlightKey: 'highlights',
  });

  renderTimeline('education-list', data.education || [], {
    headingKey: 'school',
    detailKey: 'detail',
  });

  renderTimeline('courses-list', data.courses || [], {
    headingKey: 'name',
    customPeriod: (course) => (course.year ? String(course.year) : ''),
  });
  renderContactList('contact-list', data.contact || []);
  renderQrList('qr-list', data.qr_codes || []);
  renderMeters('skills-list', data.skills || []);
  renderMeters('languages-list', data.languages || [], { showLevelText: true });
  renderPills('tech-stack', data.tech_stack || []);
  renderGithubActivity(data.github_activity);
  renderPills('interests-list', data.interests || []);
}

function setText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
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
    term.textContent = item.label;
    const definition = document.createElement('dd');
    const formattedValue = formatContactValue(item.value || '', item.label || '');
    if (item.link) {
      const link = document.createElement('a');
      link.href = item.link;
      link.innerHTML = formattedValue;
      if (item.link.startsWith('http')) {
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
      }
      definition.appendChild(link);
    } else {
      definition.innerHTML = formattedValue;
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
    img.src = code.image;
    img.alt = code.label;
    const baseSize = typeof code.size === 'number' ? code.size : 140;
    const constrainedSize = Math.min(Math.max(baseSize, 60), 200);
    img.style.width = `${constrainedSize}px`;
    img.style.height = `${constrainedSize}px`;
    img.style.margin = '0 auto';
    const caption = document.createElement('figcaption');
    caption.textContent = code.label;
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
    title.textContent = item.name;
    label.appendChild(title);

    if (options.showLevelText && item.level_text) {
      const note = document.createElement('span');
      note.className = 'meter-item__note';
      note.textContent = item.level_text;
      label.appendChild(note);
    }

    const meter = document.createElement('div');
    meter.className = 'meter';
    for (let i = 0; i < steps; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'meter__dot';
      if (i < (item.level || 0)) {
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

function formatPeriod(periodText, customFormatter, item) {
  if (typeof customFormatter === 'function') {
    const customValue = customFormatter(item);
    return customValue || '';
  }
  if (!periodText) return '';
  const parts = String(periodText).split('–').map((part) => part.trim());
  if (parts.length <= 1) return parts[0];
  return `${parts[0]}\n${parts.slice(1).join(' – ')}`;
}

function formatContactValue(value, label) {
  if (!value) return '';
  let formatted = value;
  if (value.includes('@')) {
    formatted = value.replace('@', '@<wbr>');
  } else if (value.toLowerCase().includes('linkedin.com/in/')) {
    formatted = value.replace('in/', 'in/<wbr>');
  }
  return formatted;
}

function renderGithubActivity(activity) {
  const card = document.getElementById('github-activity-card');
  if (!card) return;

  if (!activity || !activity.image) {
    card.style.display = 'none';
    return;
  }

  card.style.display = '';
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

function showError(error) {
  console.error(error);
  const resume = document.querySelector('.resume');
  if (!resume) return;
  const errorBanner = document.createElement('div');
  errorBanner.className = 'error-banner';
  errorBanner.textContent = `Something went wrong while loading the resume. ${error.message}`;
  resume.appendChild(errorBanner);
}

function initNavbarBehaviour() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  let lastScrollY = window.scrollY;
  const threshold = 20;

  function onScroll() {
    const currentScroll = window.scrollY;
    if (currentScroll > threshold) {
      hero.classList.add('hero--scrolled');
    } else {
      hero.classList.remove('hero--scrolled');
    }
    lastScrollY = Math.max(currentScroll, 0);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  loadResume();
  initNavbarBehaviour();
});
