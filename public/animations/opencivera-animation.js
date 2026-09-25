"use strict";

(() => {
  const records = [
    {
      id: "northline",
      section: "experience",
      color: "indigo",
      type: "Experience",
      title: "Senior Product Designer",
      meta: "Northline · 2023 — Present",
      body: "Lead product design, partner with engineering and mentor two designers.",
      pl: {
        title: "Starszy projektant produktu",
        meta: "Northline · 2023 — obecnie",
        body: "Prowadzę projektowanie produktów, współpracuję z programistami i wspieram dwoje projektantów."
      }
    },
    {
      id: "forma",
      section: "experience",
      color: "indigo",
      type: "Experience",
      title: "Product Designer",
      meta: "Forma Studio · 2020 — 2023",
      body: "Delivered UX research, interactive prototypes and a shared design system.",
      pl: {
        title: "Projektant produktu",
        meta: "Forma Studio · 2020 — 2023",
        body: "Prowadziłem badania UX, tworzyłem interaktywne prototypy i wspólny system projektowy."
      }
    },
    {
      id: "consulting",
      section: "experience",
      color: "indigo",
      type: "Experience",
      title: "Independent Consultant",
      meta: "Freelance · 2019 — 2020",
      body: "Ran discovery workshops and turned customer needs into product direction.",
      pl: {
        title: "Niezależny konsultant",
        meta: "Własna działalność · 2019 — 2020",
        body: "Prowadziłem warsztaty odkrywania potrzeb i przekładałem je na kierunek rozwoju produktów."
      }
    },
    {
      id: "junior",
      section: "experience",
      color: "indigo",
      type: "Experience",
      title: "Junior UX Designer",
      meta: "Studio North · 2017 — 2019",
      body: "Mapped user journeys, designed wireframes and supported usability testing.",
      pl: {
        title: "Młodszy projektant UX",
        meta: "Studio North · 2017 — 2019",
        body: "Mapowałem ścieżki użytkowników, projektowałem makiety i wspierałem testy użyteczności."
      }
    },
    {
      id: "systems",
      section: "skills",
      color: "teal",
      type: "Skill",
      title: "Design systems",
      meta: "Reusable components",
      pl: { title: "Systemy projektowe", meta: "Komponenty wielokrotnego użytku" }
    },
    {
      id: "research",
      section: "skills",
      color: "teal",
      type: "Skill",
      title: "UX research",
      meta: "Interviews & usability",
      pl: { title: "Badania UX", meta: "Wywiady i użyteczność" }
    },
    {
      id: "prototype",
      section: "skills",
      color: "teal",
      type: "Skill",
      title: "Prototyping",
      meta: "Interactive product flows",
      pl: { title: "Prototypowanie", meta: "Interaktywne ścieżki produktu" }
    },
    {
      id: "leadership",
      section: "skills",
      color: "teal",
      type: "Skill",
      title: "Team mentoring",
      meta: "Supporting two designers",
      pl: { title: "Mentoring zespołu", meta: "Wsparcie dwojga projektantów" }
    },
    {
      id: "workshops",
      section: "skills",
      color: "teal",
      type: "Skill",
      title: "Workshop facilitation",
      meta: "Discovery & alignment",
      pl: { title: "Prowadzenie warsztatów", meta: "Odkrywanie potrzeb i uzgadnianie celów" }
    },
    {
      id: "strategy",
      section: "skills",
      color: "teal",
      type: "Skill",
      title: "Product strategy",
      meta: "From insight to direction",
      pl: { title: "Strategia produktu", meta: "Od wniosków do kierunku rozwoju" }
    },
    {
      id: "english",
      section: "languages",
      color: "amber",
      type: "Language",
      title: "English",
      meta: "Fluent · C1",
      pl: { title: "Angielski", meta: "Biegły · C1" }
    },
    {
      id: "polish",
      section: "languages",
      color: "amber",
      type: "Language",
      title: "Polish",
      meta: "Native",
      pl: { title: "Polski", meta: "Ojczysty" }
    },
    {
      id: "education",
      section: "education",
      color: "blue",
      type: "Education",
      title: "BA Communication Design",
      meta: "Berlin · 2016 — 2019",
      pl: { title: "Licencjat — komunikacja wizualna", meta: "Berlin · 2016 — 2019" }
    },
    {
      id: "photography",
      section: "interests",
      color: "coral",
      type: "Interest",
      title: "Photography",
      meta: "Street & architecture",
      pl: { title: "Fotografia", meta: "Ulica i architektura" }
    },
    {
      id: "accessibility",
      section: "interests",
      color: "coral",
      type: "Interest",
      title: "Inclusive design",
      meta: "Digital access for everyone",
      pl: { title: "Projektowanie włączające", meta: "Cyfrowa dostępność dla wszystkich" }
    },
    {
      id: "atlas",
      section: "projects",
      color: "violet",
      type: "Project",
      title: "Atlas design system",
      meta: "Northline · 2024 — 2025",
      body: "Unified components and accessibility guidance across three product teams.",
      pl: {
        title: "System projektowy Atlas",
        meta: "Northline · 2024 — 2025",
        body: "Ujednoliciłem komponenty i wytyczne dostępności dla trzech zespołów produktowych."
      }
    }
  ];
  const roles = [
    {
      name: "Product Designer",
      color: "teal",
      slug: "product-designer",
      summary: "Research-led product designer building clear, accessible experiences.",
      jobs: ["northline", "forma"],
      skills: ["research", "prototype", "systems"],
      languages: ["english", "polish"],
      more: ["accessibility"],
      pl: {
        name: "Projektant produktu",
        summary:
          "Projektuję przejrzyste, dostępne produkty cyfrowe, opierając decyzje na badaniach użytkowników."
      }
    },
    {
      name: "Design Lead",
      color: "indigo",
      slug: "design-lead",
      summary: "Design leader connecting people, product strategy and scalable systems.",
      jobs: ["northline"],
      skills: ["leadership", "strategy", "systems"],
      languages: ["english", "polish"],
      more: ["atlas"],
      pl: {
        name: "Lider zespołu projektowego",
        summary: "Łączę ludzi, strategię produktu i skalowalne systemy projektowe."
      }
    },
    {
      name: "Product Consultant",
      color: "amber",
      slug: "product-consultant",
      summary: "Independent partner for discovery, facilitation and product direction.",
      jobs: ["consulting"],
      skills: ["workshops", "research", "strategy"],
      languages: ["english", "polish"],
      more: ["education"],
      pl: {
        name: "Konsultant produktowy",
        summary:
          "Wspieram odkrywanie potrzeb, prowadzenie warsztatów i wyznaczanie kierunku rozwoju produktów."
      }
    }
  ];

  const $ = (id) => document.getElementById(id);
  const locale = document.documentElement.lang;
  const embedded = document.documentElement.dataset.embedded === "true";
  const copy = {
    en: {
      base: "Experience Base",
      cvs: "Your CVs",
      private: "Private career record",
      profession: "Product designer",
      highlights: "Additional highlights",
      description:
        "Experiences appear over time, then fill a private Experience Base. Selected information from that base creates three CVs for different roles. All profile data is fictional.",
      interaction: "Click or press Space to pause or resume the animation.",
      preview: "Animation preview",
      pause: "Pause",
      play: "Play",
      replay: "Replay",
      progress: "Animation progress",
      motionOff: "Motion disabled",
      sections: {
        experience: "Experience",
        projects: "Projects",
        education: "Education",
        skills: "Skills",
        languages: "Languages",
        interests: "Interests"
      },
      steps: ["Collect", "Build your base", "Complete base", "Create CVs", "Three roles"],
      scenes: [
        [
          "01 / COLLECT",
          "Your experience grows over time.",
          "Jobs, projects, education and skills become part of your career."
        ],
        [
          "02 / EXPERIENCE BASE",
          "Bring your experience into one place.",
          "Each item goes into its section of your private Experience Base."
        ],
        [
          "03 / COMPLETE BASE",
          "Your experience, organised.",
          "Keep the full record. Choose what goes into each CV."
        ],
        [
          "04 / TAILORED CVS",
          "Choose what matters for the role.",
          "Each CV contains a different selection from the same Experience Base."
        ],
        [
          "05 / THREE ROLES",
          "One Experience Base. Three different CVs.",
          "Product Designer, Design Lead, Product Consultant."
        ]
      ]
    },
    pl: {
      base: "Baza doświadczeń",
      cvs: "Twoje CV",
      private: "Prywatna historia zawodowa",
      profession: "Projektant produktu",
      highlights: "Dodatkowe atuty",
      description:
        "Doświadczenia pojawiają się z czasem, a następnie wypełniają prywatną Bazę doświadczeń. Wybrane informacje z bazy tworzą trzy CV na różne stanowiska. Wszystkie dane profilu są fikcyjne.",
      interaction: "Kliknij lub naciśnij spację, aby zatrzymać albo wznowić animację.",
      preview: "Podgląd animacji",
      pause: "Zatrzymaj animację",
      play: "Odtwórz",
      replay: "Od początku",
      progress: "Postęp animacji",
      motionOff: "Ruch wyłączony",
      sections: {
        experience: "Doświadczenie",
        projects: "Projekty",
        education: "Edukacja",
        skills: "Umiejętności",
        languages: "Języki",
        interests: "Zainteresowania"
      },
      steps: ["Zbierz", "Uzupełnij bazę", "Pełna baza", "Utwórz CV", "Trzy role"],
      scenes: [
        [
          "01 / ZBIERANIE",
          "Doświadczenia przybywa z czasem.",
          "Praca, projekty, nauka i umiejętności tworzą Twoją historię."
        ],
        [
          "02 / BAZA DOŚWIADCZEŃ",
          "Zbierz doświadczenia w jednym miejscu.",
          "Każdy element trafia do swojej sekcji w prywatnej Bazie doświadczeń."
        ],
        [
          "03 / PEŁNA BAZA",
          "Twoje doświadczenie, uporządkowane.",
          "Zachowujesz pełną historię. Wybierasz, co trafi do każdego CV."
        ],
        [
          "04 / DOPASOWANE CV",
          "Wybierz to, co pasuje do stanowiska.",
          "Każde CV zawiera inny wybór treści z tej samej Bazy doświadczeń."
        ],
        [
          "05 / TRZY ROLE",
          "Jedna Baza doświadczeń. Trzy różne CV.",
          "Projektant produktu, lider zespołu, konsultant produktowy."
        ]
      ]
    }
  }[locale];
  const timing = {
    collectStart: 0.5,
    collectStep: 0.62,
    moveStart: 10.8,
    moveEnd: 12.5,
    templateStart: 12,
    templateEnd: 13.2,
    fillStart: 14,
    fillStep: 0.78,
    flightDuration: 0.64,
    zoomStart: 27,
    zoomEnd: 29,
    baseLeft: 30,
    firstCV: 31,
    secondCV: 34.5,
    thirdCV: 37.5,
    cvDuration: 1.8,
    duration: 42
  };
  const stageTimes = [0, timing.moveStart, timing.zoomStart, timing.baseLeft, 39.5];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const viewport = $("viewport");
  const master = $("master");
  const seek = $("seek");
  const pause = $("pause");
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const mix = (a, b, p) => a + (b - a) * p;
  const ease = (n) => 1 - Math.pow(1 - clamp(n), 4);
  const progress = (time, start, end) => ease((time - start) / (end - start));
  const blend = (a, b, p) => ({ x: mix(a.x, b.x, p), y: mix(a.y, b.y, p), s: mix(a.s, b.s, p) });
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  const valueFor = (record) => (locale === "pl" ? record.pl : record);
  const byId = (id) => records.find((record) => record.id === id);
  let time = 0;
  let paused = false;
  let visible = false;
  let frame = 0;
  let lastFrame = 0;
  let resizeFrame = 0;
  let layout;
  let fillOrder = [];
  let lastStage = -1;

  // Shuffle presentation once, never the source records or a frame in progress.
  const collected = [...records];
  for (let i = collected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [collected[i], collected[j]] = [collected[j], collected[i]];
  }
  collected.forEach((record, index) => {
    record.collectIndex = index;
  });
  $("base-label").textContent = copy.base;
  $("base-group").querySelector("text").textContent = copy.base;
  $("cv-group").querySelector("text").textContent = copy.cvs;
  $("private-label").textContent = copy.private;
  $("profession").textContent = copy.profession;
  $("preview-label").textContent = copy.preview;
  $("description").textContent = copy.description + (embedded ? " " + copy.interaction : "");
  viewport.setAttribute("aria-label", copy.base);
  if (embedded) viewport.title = copy.interaction;
  $("restart").setAttribute("aria-label", copy.replay);
  $("progress-label").textContent = copy.progress;
  seek.max = String(timing.duration);
  document.title = "OpenCiVera · " + copy.base;
  document.querySelector('meta[name="description"]').content = copy.description;
  for (const section of [
    "experience",
    "projects",
    "education",
    "skills",
    "languages",
    "interests"
  ]) {
    const element = document.createElement("section");
    element.className = "cv-section";
    element.innerHTML = "<h3>" + copy.sections[section] + '</h3><div id="' + section + '"></div>';
    $(
      ["experience", "projects", "education"].includes(section) ? "main-sections" : "side-sections"
    ).append(element);
  }
  for (const record of records) {
    const value = valueFor(record);
    const tile = document.createElement("div");
    tile.className = "tile " + record.color;
    tile.dataset.record = record.id;
    tile.innerHTML =
      "<small>" +
      copy.sections[record.section] +
      "</small><strong>" +
      escape(value.title) +
      "</strong><span>" +
      escape(value.meta) +
      "</span>";
    $("tiles").append(tile);
    const entry = document.createElement("div");
    entry.className = "entry " + record.color;
    entry.dataset.record = record.id;
    entry.innerHTML =
      '<div class="entry-content"><strong>' +
      escape(value.title) +
      "</strong><small>" +
      escape(value.meta) +
      "</small>" +
      (value.body ? "<p>" + escape(value.body) + "</p>" : "") +
      "</div>";
    $(record.section).append(entry);
    const fly = tile.cloneNode(true);
    $("flights").append(fly);
    Object.assign(record, { tile, entry, fly });
  }
  function pills(ids) {
    return ids
      .map((id) => {
        const record = byId(id);
        const value = valueFor(record);
        return (
          '<span class="pill ' +
          record.color +
          '" data-record="' +
          id +
          '">' +
          escape(value.title) +
          (record.section === "languages" ? " · " + escape(value.meta) : "") +
          "</span>"
        );
      })
      .join("");
  }
  roles.forEach((role, index) => {
    const value = valueFor(role);
    const wrap = document.createElement("article");
    wrap.className = "output-wrap " + role.color;
    wrap.dataset.role = role.slug;
    const jobs = role.jobs
      .map((id) => {
        const record = byId(id);
        const value = valueFor(record);
        return (
          '<div class="snippet ' +
          record.color +
          '" data-record="' +
          id +
          '"><b>' +
          escape(value.title) +
          "</b><span>" +
          escape(value.meta) +
          "</span><p>" +
          escape(value.body) +
          "</p></div>"
        );
      })
      .join("");
    wrap.innerHTML =
      '<div class="role-label"><span>' +
      escape(value.name) +
      "</span><span>CV / 0" +
      (index + 1) +
      '</span></div><div class="paper output"><h3>Alex Harper</h3><div class="role">' +
      escape(value.name) +
      '</div><p class="summary">' +
      escape(value.summary) +
      "</p><h4>" +
      copy.sections.experience +
      "</h4>" +
      jobs +
      "<h4>" +
      copy.sections.skills +
      '</h4><div class="pills">' +
      pills(role.skills) +
      "</div><h4>" +
      copy.sections.languages +
      '</h4><div class="pills">' +
      pills(role.languages) +
      "</div><h4>" +
      copy.highlights +
      '</h4><div class="pills">' +
      pills(role.more) +
      '</div><div class="paper-footer">OpenCiVera<span>CV / 0' +
      (index + 1) +
      "</span></div></div>";
    $("outputs").append(wrap);
    role.wrap = wrap;
    role.start = [timing.firstCV, timing.secondCV, timing.thirdCV][index];
  });
  copy.steps.forEach((label, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.time = String(stageTimes[index] + (index === 0 ? 2 : 1));
    $("steps").append(button);
  });

  function place(element, position, opacity = 1) {
    element.style.transform =
      "translate3d(" +
      position.x.toFixed(2) +
      "px," +
      position.y.toFixed(2) +
      "px,0) scale(" +
      position.s.toFixed(4) +
      ")";
    element.style.opacity = String(opacity);
  }
  function localBox(element) {
    let x = 0;
    let y = 0;
    for (let node = element; node && node !== master; node = node.offsetParent) {
      x += node.offsetLeft;
      y += node.offsetTop;
    }
    return { x, y, w: element.offsetWidth, h: element.offsetHeight };
  }
  function measure() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    const captionHeight = document.querySelector(".scene-caption").offsetHeight;
    const usable = h - captionHeight - 120;
    const mobile = w < 768;
    records.forEach((record) => {
      record.target = localBox(record.entry);
    });
    fillOrder = [...records].sort((a, b) => a.target.y - b.target.y || a.target.x - b.target.x);
    fillOrder.forEach((record, index) => {
      record.start = timing.fillStart + index * timing.fillStep;
    });
    const baseHeight = master.offsetHeight;
    const wholeScale = Math.min(1, usable / baseHeight, (w - 48) / 440);
    const fillScale = Math.min(0.98, mobile ? (w - 122) / 440 : (w - 390) / 440);
    const outputHeight = Math.max(...roles.map((role) => role.wrap.offsetHeight));
    const outputScale = Math.min(
      1,
      usable / outputHeight,
      mobile ? (w - 72) / 310 : (w / 2 - 254) / 465
    );
    const labelWidths = ["base-group", "cv-group"].map((id) =>
      $(id).querySelector("text").getComputedTextLength()
    );
    layout = {
      w,
      h,
      usable,
      mobile,
      baseHeight,
      fillScale,
      wholeScale,
      outputHeight,
      outputScale,
      labelWidths
    };
    $("stage").style.clipPath = "inset(56px 0 " + (captionHeight + 8) + "px)";
    render();
  }
  function collectionPosition(record, at) {
    const s = Math.min(1.12, (layout.w - 48) / 280);
    const index = record.collectIndex;
    const current = clamp((at - timing.collectStart) / timing.collectStep, 0, records.length - 1);
    const cameraY = Math.max(0, current * 120 * s - layout.usable * 0.35);
    return {
      x: (layout.w - 280 * s) / 2,
      y: 70 + layout.usable * 0.18 + index * 120 * s - cameraY,
      s
    };
  }
  function queuePosition(record) {
    const columns = layout.mobile ? 1 : 2;
    const rows = Math.ceil(records.length / columns);
    const s = Math.min(
      0.58,
      (layout.usable - 12) / (rows * 116),
      (layout.mobile ? 86 : layout.w * 0.28) / (columns * 292)
    );
    return {
      x: 18 + (record.collectIndex % columns) * 292 * s,
      y: 70 + Math.floor(record.collectIndex / columns) * 116 * s,
      s
    };
  }
  function basePosition(at) {
    const { w, usable, fillScale, wholeScale, baseHeight, outputScale } = layout;
    const row = clamp((at - timing.fillStart) / timing.fillStep, 0, records.length - 1);
    const i = Math.floor(row);
    const first = fillOrder[i].target;
    const next = fillOrder[Math.min(i + 1, records.length - 1)].target;
    const targetY = mix(first.y + first.h / 2, next.y + next.h / 2, progress(row - i, 0, 1));
    const fill = {
      x: w / 2 + (layout.mobile ? 43 : 70) - 220 * fillScale,
      y: at < timing.fillStart ? 88 : Math.min(88, 88 + usable * 0.64 - targetY * fillScale),
      s: fillScale
    };
    const whole = {
      x: w / 2 - 220 * wholeScale,
      y: 88 + (usable - baseHeight * wholeScale) / 2,
      s: wholeScale
    };
    const zoomed = blend(fill, whole, progress(at, timing.zoomStart, timing.zoomEnd));
    if (layout.mobile) {
      const compactScale = Math.min(wholeScale, (usable * 0.25) / baseHeight);
      return blend(
        zoomed,
        { x: (w - 440 * compactScale) / 2, y: 88, s: compactScale },
        progress(at, timing.baseLeft, timing.firstCV)
      );
    }
    const spacing = 310 * outputScale + 24;
    const left = {
      ...whole,
      x: Math.min(
        w / 2 - spacing - 220 * wholeScale,
        w / 2 - 155 * outputScale - 72 - 440 * wholeScale
      )
    };
    const base = blend(zoomed, left, progress(at, timing.baseLeft, timing.firstCV));
    const shift = progress(at, 34, 35.5);
    const finalScale = Math.min(wholeScale, (w / 2 - spacing - 155 * outputScale - 92) / 440);
    const finalBase = {
      x: 20,
      y: 88 + (usable - baseHeight * finalScale) / 2,
      s: finalScale
    };
    return blend(base, finalBase, shift);
  }
  function renderRecords(at, base) {
    let arrived = 0;
    const move = progress(at, timing.moveStart, timing.moveEnd);
    for (const record of records) {
      const done = at >= record.start + timing.flightDuration;
      const flying = at >= record.start && !done;
      const origin = blend(
        collectionPosition(record, Math.min(at, timing.moveStart)),
        queuePosition(record),
        move
      );
      const appear = progress(
        at,
        timing.collectStart + record.collectIndex * timing.collectStep,
        timing.collectStart + record.collectIndex * timing.collectStep + 0.5
      );
      place(
        record.tile,
        { ...origin, y: origin.y + (1 - appear) * 20 },
        done || flying ? 0 : appear
      );
      record.entry.classList.toggle("filled", done);
      if (done) arrived++;
      if (flying) {
        const target = record.target;
        const destination = {
          x: base.x + target.x * base.s,
          y: base.y + target.y * base.s,
          s: (target.w * base.s) / 280
        };
        const p = progress(at, record.start, record.start + timing.flightDuration);
        place(record.fly, blend(origin, destination, p), 1 - progress(p, 0.94, 1));
      } else {
        record.fly.style.opacity = "0";
      }
    }
    master.classList.toggle("started", at >= timing.fillStart);
    $("count").textContent = arrived + " / " + records.length;
  }
  function renderOutputs(at, base) {
    const { w, usable, outputScale, outputHeight } = layout;
    const initialScale = layout.mobile
      ? Math.min(outputScale, (usable * 0.75 - 76) / outputHeight)
      : outputScale;
    const finalScale = layout.mobile
      ? Math.min(initialScale, (w - 80) / (310 * (motion.matches ? 3 : 2.2)))
      : initialScale;
    const s = mix(initialScale, finalScale, progress(at, timing.thirdCV, 39.5));
    const spacing = 310 * s + 24;
    const shift = progress(at, 34, 35.5);
    const destinations = [];
    roles.forEach((role, index) => {
      const center = index === 0 ? w / 2 - spacing * shift : w / 2 + (index - 1) * spacing;
      const destination = {
        x: center - 155 * s,
        y: layout.mobile ? 88 + usable * 0.25 + 76 : 88 + (usable - outputHeight * s) / 2,
        s
      };
      destinations.push({ x: destination.x, y: destination.y, w: 310 * s, h: outputHeight * s });
      const origin = { x: base.x + 220 * base.s - 155 * s, y: base.y + 20, s: s * 0.9 };
      const p = progress(at, role.start, role.start + timing.cvDuration);
      place(role.wrap, blend(origin, destination, p), progress(at, role.start, role.start + 0.3));
      role.wrap.style.zIndex = String(index + 1);
    });
    return destinations;
  }
  function drawGroup(id, box, labelWidth, opacity) {
    const width = Math.max(box.w + 24, labelWidth + 32);
    const x = Math.max(12, box.x + box.w / 2 - width / 2);
    const right = Math.min(layout.w - 12, box.x + box.w / 2 + width / 2);
    const y = box.y - 16;
    const bottom = box.y + box.h + 12;
    const center = (x + right) / 2;
    const gap = labelWidth / 2 + 8;
    const group = $(id);
    group.style.opacity = String(opacity);
    const outline = [
      `M ${center - gap} ${y} H ${x + 10}`,
      `Q ${x} ${y} ${x} ${y + 10} V ${bottom - 10}`,
      `Q ${x} ${bottom} ${x + 10} ${bottom} H ${right - 10}`,
      `Q ${right} ${bottom} ${right} ${bottom - 10} V ${y + 10}`,
      `Q ${right} ${y} ${right - 10} ${y} H ${center + gap}`
    ].join(" ");
    group.querySelector("path").setAttribute("d", outline);
    const label = group.querySelector("text");
    label.setAttribute("x", String(center));
    label.setAttribute("y", String(y));
    return { x, y, right, bottom, center };
  }
  function renderGroups(at, base, destinations) {
    const top = Math.max(88, base.y);
    const bottom = Math.min(88 + layout.usable, base.y + layout.baseHeight * base.s);
    master.style.clipPath =
      "inset(" +
      Math.max(0, (top - base.y) / base.s) +
      "px 0 " +
      Math.max(0, (base.y + layout.baseHeight * base.s - bottom) / base.s) +
      "px)";
    const baseBox = drawGroup(
      "base-group",
      { x: base.x, y: top, w: 440 * base.s, h: bottom - top },
      layout.labelWidths[0],
      progress(at, timing.templateStart, timing.templateEnd)
    );
    const box = { ...destinations[0] };
    destinations.slice(1).forEach((destination, index) => {
      const p = progress(at, roles[index + 1].start, roles[index + 1].start + timing.cvDuration);
      box.w = mix(box.w, destination.x + destination.w - box.x, p);
    });
    const reveal = progress(at, timing.firstCV - 0.6, timing.firstCV - 0.1);
    const cvBox = drawGroup("cv-group", box, layout.labelWidths[1], reveal);
    const arrow = $("group-arrow");
    arrow.style.opacity = String(reveal);
    if (layout.mobile) {
      arrow.setAttribute(
        "d",
        "M " + baseBox.center + " " + (baseBox.bottom + 4) + " V " + (cvBox.y - 12)
      );
    } else {
      const startX = baseBox.right + 5;
      const endX = cvBox.x - 6;
      const startY = (baseBox.y + baseBox.bottom) / 2;
      const endY = (cvBox.y + cvBox.bottom) / 2;
      const middle = (startX + endX) / 2;
      arrow.setAttribute(
        "d",
        `M ${startX} ${startY} C ${middle} ${startY} ${middle} ${endY} ${endX} ${endY}`
      );
    }
  }
  function renderCaption(stage) {
    if (stage === lastStage) return;
    lastStage = stage;
    const [kicker, title, detail] = copy.scenes[stage];
    $("scene-stage").textContent = kicker;
    $("caption-kicker").textContent = copy.steps[stage];
    $("caption-title").textContent = title;
    $("caption-detail").textContent = detail;
    $("status").textContent = title;
    [...$("steps").children].forEach((button, index) =>
      button.setAttribute("aria-pressed", String(index === stage))
    );
    scheduleMeasure();
  }
  function render() {
    if (!layout) return;
    const stage = motion.matches
      ? 4
      : Math.max(
          0,
          stageTimes.findLastIndex((start) => time >= start)
        );
    renderCaption(stage);
    const at = motion.matches ? timing.duration : time;
    const base = basePosition(at);
    place(master, base, progress(at, timing.templateStart, timing.templateEnd));
    master.style.zIndex = "4";
    renderRecords(at, base);
    const destinations = renderOutputs(at, base);
    renderGroups(at, base, destinations);
    seek.value = String(time);
  }
  function canPlay() {
    return !paused && !motion.matches && !document.hidden && visible && time < timing.duration;
  }
  function tick(now) {
    frame = 0;
    if (!canPlay()) {
      lastFrame = 0;
      return;
    }
    if (lastFrame) time = Math.min(timing.duration, time + Math.min((now - lastFrame) / 1000, 0.1));
    lastFrame = now;
    render();
    if (time >= timing.duration) {
      paused = true;
      sync();
    } else frame = requestAnimationFrame(tick);
  }
  function sync() {
    pause.textContent = motion.matches ? copy.motionOff : paused ? copy.play : copy.pause;
    if (embedded) {
      viewport.setAttribute("role", motion.matches ? "img" : "button");
      viewport.tabIndex = motion.matches ? -1 : 0;
      viewport.setAttribute(
        "aria-label",
        copy.base + (motion.matches ? "" : ": " + pause.textContent)
      );
    }
    pause.disabled = motion.matches;
    $("restart").disabled = motion.matches;
    seek.disabled = motion.matches;
    [...$("steps").children].forEach((button) => {
      button.disabled = motion.matches;
    });
    if (canPlay()) {
      if (!frame) {
        lastFrame = 0;
        frame = requestAnimationFrame(tick);
      }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
    }
    render();
  }
  function togglePlayback() {
    if (motion.matches) return;
    if (time >= timing.duration) time = 0;
    paused = !paused;
    sync();
  }
  function scheduleMeasure() {
    if (!resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        measure();
      });
  }
  pause.addEventListener("click", togglePlayback);
  $("restart").addEventListener("click", () => {
    time = 0;
    paused = false;
    sync();
  });
  seek.addEventListener("input", () => {
    time = clamp(Number(seek.value), 0, timing.duration);
    paused = true;
    sync();
  });
  $("steps").addEventListener("click", (event) => {
    const button = event.target.closest("[data-time]");
    if (!button || motion.matches) return;
    time = Number(button.dataset.time);
    paused = true;
    sync();
  });
  if (embedded) {
    viewport.addEventListener("click", togglePlayback);
    viewport.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.code !== "Space" && event.code !== "Enter") return;
      event.preventDefault();
      togglePlayback();
    });
  }
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener("change", () => {
    time = 0;
    paused = false;
    measure();
    sync();
  });
  new ResizeObserver(scheduleMeasure).observe(viewport);
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0.15 }
  ).observe(viewport);
  document.fonts.ready.then(scheduleMeasure);
  measure();
  sync();
})();
