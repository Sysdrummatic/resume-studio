# Pomiar widoczności AI — stan przed mergem PR #239 (zestaw B)

**Data pomiaru:** 2026-10-18
**Model / narzędzie:** Gemini (odpowiedzi mają cytowane źródła, np. `opencivera.com`)
**Warunki testu:** _do uzupełnienia: zalogowany/niezalogowany, wyszukiwanie włączone/wyłączone, jedna próba na prompt_
**Powiązane:** [zestaw A (ChatGPT)](ai-visibility-baseline-2026-10-18.md), [analiza widoczności AI](ai-visibility-audit-2026-10-13.md), [checklista PR #239](../guides/test-scenarios/SEO_PRE_MERGE_CHECKLIST_PR239.md)

## Podsumowanie

| # | Prompt | Wzmianka o OpenCiVera | Opis poprawny | Uwagi |
|---|---|---|---|---|
| 1 | Best free CV builder | Nie | — | FlowCV, OpenResume, Google Docs, Canva; cytowane źródła zewnętrzne |
| 2 | What is OpenCiVera? | Tak | Tak | Odpowiedź cytuje `opencivera.com` przy każdym akapicie z cechami produktu |
| 3 | What is a LiveCV? | Nie | **Nie** | Definicja ogólna ("video resume"); marka nie pojawia się w ogóle |
| 4 | CV as a public link / online CV page | Nie | — | Notion, LinkedIn, Canva, About.me, GitHub Pages, JSON Resume |
| 5 | Resume builder with one master CV and multiple versions | Nie | — | Poradnik krok po kroku, bez żadnego narzędzia |
| 6 | Open-source CV in YAML / CV as code | Nie | — | JSON Resume, Reactive Resume, skrypty własne |
| 7 | Kreator CV online za darmo | Nie | — | Canva, Europass, Pracuj.pl / InterviewMe / RocketCV |

**Wynik: 1 z 7 promptów z wzmianką (prompt 2, zapytanie o markę po nazwie).** W 6 pozostałych marka się nie pojawia.

## Uwagi

- Zapytany wprost o OpenCiVera, model opisuje produkt poprawnie i opiera się na `opencivera.com`: używa nazw "Experience Base" i "LiveCV", opisuje linki, eksport PDF/YAML/TXT, historię wersji i wersje językowe. Treść landingu jest więc czytana i dobrze przekazywana.
- Przy zapytaniach o kategorię (prompty 1, 4–7) marka nie jest polecana, nawet przy prompcie 5, który dokładnie opisuje jej propozycję (jedno główne CV, wiele wersji).
- **Prompt 3 jest błędny merytorycznie**: "LiveCV" model opisuje jako wideo-CV i interaktywne CV z nagraniem, bez związku z OpenCiVera. To realizacja ryzyka z audytu (kolizja nazwy). Warto sprawdzić po mergu, czy `llms.txt` i dane strukturalne zmieniają tę odpowiedź.
- ChatGPT (zestaw A) miał 4 z 7 wzmianek, Gemini (ten zestaw) 1 z 7. Różnica pokazuje, że wynik zależy mocno od narzędzia, więc porównuj tylko pomiary z tego samego narzędzia i w tych samych warunkach.
- Do porównania po mergu: ten sam model, tryb i prompty, każdy 3 razy.

## Zapis rozmowy

Znaczniki źródeł (np. `ResuFit`, `Enhancv`) wklejone przez interfejs pominięto, z wyjątkiem promptu 2, gdzie cytowanie `opencivera.com` jest przedmiotem pomiaru. W prompcie 1 model podał też odnośnik do `www.getyourcv.net`.

### 1. Best free CV builder

When looking for a truly free CV or resume builder, the biggest trap to watch out for is platforms that let you build a resume for free, but then hit you with a surprise paywall or subscription when you try to download the PDF.

The best options that allow you to build and download your CV for free without hidden fees include:

**1. FlowCV**
Best for: Design control, modern layouts, and professional formatting.
Why it's great: Your first resume and cover letter are completely free forever, with unlimited PDF downloads, access to all templates, and no watermarks. It gives you incredible customization control without locking your download at the end.
The Catch: Only the first resume is free (additional resumes require a paid plan), and advanced AI features are behind a pro tier.

**2. OpenResume**
Best for: Complete privacy and ATS (Applicant Tracking System) optimization.
Why it's great: It is a 100% free, open-source tool. You don't even need to create an account because your data stays right in your browser. It's designed to pass automated screening software used by companies.
The Catch: It offers limited template variety (focused on a clean, single layout) and doesn't have AI writing tools.

**3. Google Docs**
Best for: Maximum simplicity, reliability, and real-time editing.
Why it's great: Google Docs has a gallery of built-in resume templates. They are completely free, have no watermarks, work on any device, and export instantly to PDF. Because they use plain text formatting, they easily pass through ATS software.
The Catch: There are no resume-specific helper features or automated AI writing assistants; you have to format and write everything yourself.

**4. Canva**
Best for: Creative fields (design, media, arts) where a visual flare matters.
Why it's great: Canva offers hundreds of free, beautifully designed resume templates. You can export your finished design as a PDF for free.
The Catch: Highly visual, multi-column designs can sometimes confuse automated corporate ATS bots, so they are best used when you are emailing a CV directly to a hiring manager.

**Quick Tip Before You Choose**
If you are applying to large companies that use automated software to scan applications, pick a simple, single-column layout (like OpenResume or a clean Google Docs template). If you are applying directly to smaller businesses or creative roles, something like FlowCV or Canva will help your design stand out.

What kind of job or industry are you building this CV for?

### 2. What is OpenCiVera?

OpenCiVera is an online career and resume-building platform designed to help professionals manage their work history and create targeted resumes (referred to as "LiveCVs"). _[źródło: opencivera.com]_

Instead of maintaining multiple completely separate resume files for different types of jobs, OpenCiVera works using a two-step approach:

- **The Experience Base:** You maintain a single, private master repository of all your professional experience, skills, education, projects, and courses. _[źródło: opencivera.com]_
- **Targeted LiveCVs:** From that master database, you can select specific pieces of information to generate tailored, public-facing "LiveCVs" customized for specific job applications or roles. _[źródło: opencivera.com]_

**Key Features**

- **Custom Shareable Links:** Each LiveCV can be published under its own unique web link so recruiters or colleagues can view it directly in a browser. _[źródło: opencivera.com]_
- **Export Options:** You can download your CVs in multiple formats, including PDF, YAML, or TXT. _[źródło: opencivera.com]_
- **Version History:** The platform tracks publication history, allowing you to restore or review previous versions of your CV. _[źródło: opencivera.com]_
- **Privacy & Localization:** Data remains private in your base, and the platform supports maintaining separate language versions of your career profile. _[źródło: opencivera.com]_

### 3. What is a LiveCV?

A LiveCV (sometimes called an interactive resume or video resume) is a modern, dynamic alternative to the traditional static paper or PDF resume. Instead of just listing your work history on a flat page, a LiveCV brings your professional profile to life using digital tools.

**Key Features of a LiveCV**

- **Video Introduction:** Many LiveCVs feature a short video clip where you introduce yourself, explain your background, and highlight your personality.
- **Interactive Links:** They often include clickable links to your online portfolio, GitHub, LinkedIn profile, or specific projects you have worked on.
- **Multimedia Elements:** You can embed graphics, certificates, project demos, or testimonials directly into the layout.
- **Real-Time Updates:** Because it lives online (via a dedicated website or platform), you can update your skills and experiences instantly without having to re-send new PDF files.

**Why Do People Use It?**

- **Stand Out:** It helps job seekers catch a recruiter's attention in competitive industries like tech, design, marketing, and media.
- **Showcase Soft Skills:** A video or interactive format immediately demonstrates your communication skills, confidence, and creativity.
- **Accessibility:** Employers can view your complete professional story on any device with a single web link.

Would you like to know how to create one or what sections to include?

### 4. CV as a public link / online CV page

Creating an online CV or public link is a fantastic way to showcase your experience, projects, and skills to potential employers, universities, or scholarship committees. It makes it easy to share via email, LinkedIn, or a QR code.

Here is a guide on how to build and publish your own CV online, ranging from no-code platforms to developer-friendly options.

**1. No-Code & Platform Builders (Easiest & Fastest)**

If you don't know how to code (or just want something set up in 10 minutes), these platforms let you create sleek, professional profile pages or CVs for free.

- **Notion**
  - How it works: Create a page with your resume, add formatting, images, and links.
  - To publish: Click Share in the top right corner and toggle on Share to web. You can copy the public link. (Tip: Use tools like Super.so or Fruition later if you want to turn your Notion page into a custom-domain website).
- **LinkedIn**
  - How it works: While not a traditional downloadable CV, your LinkedIn profile serves as a living, public online resume.
  - To share: You can share your profile link or export your profile as a PDF directly.
- **Canva**
  - How it works: Choose a modern resume template, fill in your details, and design it visually.
  - To publish: Click Share, select More, and choose Website. You can publish it as a scrolling website with a free Canva domain.
- **About.me**
  - How it works: A simple, clean landing page focused entirely on you, your bio, your skills, and links to your social media or portfolio.

**2. Developer & Markdown Options (For Tech & Design Portfolios)**

If you are into tech, programming, or want something lightweight that you can version-control, you can host your CV using code.

- **GitHub Pages (HTML/CSS or Markdown)**
  - How it works: Create a simple one-page website using HTML/CSS or write your CV in Markdown (README.md) inside a public GitHub repository.
  - To publish: Enable GitHub Pages in your repository settings. Your CV will instantly be live at `https://yourusername.github.io/repository-name`.
- **JSON Resume**
  - How it works: Write your resume data in a standard JSON format, and use open-source themes to generate a public web version automatically.

**3. Best Practices for an Online CV**

- **Keep Privacy in Mind:** Since this link will be public, do not include sensitive personal information like your home address, phone number, or date of birth. Instead, use a professional email address and your LinkedIn/GitHub profiles.
- **Make it Mobile-Friendly:** A lot of recruiters or admissions officers might open your link on their phones. Test how it looks on a mobile device.
- **Use a Clean URL:** If possible, customize the URL so it looks professional (e.g., notion.so/yourname-cv instead of a long string of random characters).

Would you like help writing the content for your CV, or are you looking for advice on a specific platform to build it on?

### 5. Resume builder with one master CV and multiple versions

Building a resume using a master CV and targeted versions is the absolute best way to job hunt. It keeps you organized while allowing you to tailor your experience to different types of jobs (like retail, tech, creative roles, or volunteering).

Here is a step-by-step guide on how to set up this system, what to include, and how to manage your versions effectively.

**Phase 1: Build Your Master CV**

Your master CV is your "brain dump." It lives in one document and contains everything you have ever done. You will never send this version directly to an employer; instead, you will copy and paste from it.

Include the following sections in your master CV:

- **Contact Information:** Name, email, phone number, and LinkedIn or portfolio link (if you have one).
- **Education:** School name, expected graduation year, GPA (if strong), and relevant coursework.
- **Work Experience:** List every job, internship, or major project. Under each, write down 3–5 bullet points starting with action verbs (e.g., managed, organized, created, led). Include numbers where possible (e.g., "Managed inventory for 50+ items weekly").
- **Extracurriculars & Leadership:** Clubs, sports teams, student government, or volunteer work.
- **Skills:** Hard skills (software, languages, coding, equipment operation) and soft skills (communication, teamwork, time management).
- **Awards & Certifications:** Honor roll, employee of the month, CPR certification, online courses, etc.

**Phase 2: Create Tailored Versions**

When you find a job you want to apply for, look at the job description and pick out the 3 most important skills or requirements they are asking for. Then, create a copy of your master CV and edit it down:

- **Keep it to One Page:** For high school and college students, a resume should never exceed one page.
- **Highlight Relevant Experience:** Move the experience or skills that match the job description to the top. For example, if you are applying for a tutoring job, put your peer tutoring or volunteering experience right under your education section, rather than a past job working at a restaurant.
- **Use Keywords:** Match the exact phrasing from the job posting where appropriate (e.g., if they ask for "customer service," use those exact words in your bullet points).

**Phase 3: Organization & File Naming**

To keep your versions straight and avoid sending the wrong file to the wrong employer, use a clear file-naming system:

```
[YourName]_[JobTitle]_[CompanyName]_[Year].pdf
Example: AlexSmith_Cashier_Target_2026.pdf
```

**Pro Tip:** Always save and send your final tailored versions as PDFs unless the application specifically asks for a Word document. PDFs ensure your formatting stays neat and doesn't shift around when the hiring manager opens it.

Would you like help writing the bullet points for a specific job, extracurricular activity, or project to add to your master CV?

### 6. Open-source CV in YAML / CV as code

Managing your resume as code using YAML is a fantastic way to keep your professional history structured, version-controlled (via Git), and easy to render into beautiful PDFs or HTML pages using automated templates.

**Popular Tools & Engines**

Here are the most popular open-source projects and tools that let you build your CV using YAML:

- **JSON Resume (resume-cli):** While the core schema is JSON, many developers write their data in YAML and convert it, or use YAML-based extensions. It has a massive ecosystem of themes.
- **Reactive Resume:** A popular, open-source, and free resume builder that allows you to manage data cleanly and export into various PDF layouts. It supports structured data formats.
- **Pandemic / Python/Go CLI parsers:** Many developers write simple Python or Node.js scripts that read a `resume.yaml` file and feed it into Jinja2 templates or LaTeX engines to generate professional PDFs.
- **GitHub Actions CI/CD Pipelines:** A common workflow is storing your `resume.yaml` in a GitHub repository and using an automated Action to compile a fresh PDF release every time you push an update.

**Example YAML Structure**

A standard structure for a YAML-based CV typically separates your information into logical blocks:

```yaml
basics:
  name: "Jane Doe"
  label: "Senior Software Engineer"
  email: "jane.doe@example.com"
  phone: "+1-555-555-5555"
  url: "https://janedoe.dev"
  summary: "Passionate software engineer with 5+ years of experience building scalable web applications."
  location:
    city: "San Francisco"
    countryCode: "US"

work:
  - company: "Tech Corp"
    position: "Software Engineer"
    startDate: "2022-01-01"
    endDate: "Present"
    summary: "Leading backend development for core microservices."
    highlights:
      - "Reduced API latency by 40% through query optimization."
      - "Mentored junior developers and established code review standards."

education:
  - institution: "University of Technology"
    area: "Computer Science"
    studyType: "B.S."
    startDate: "2018-09-01"
    endDate: "2022-05-31"

skills:
  - name: "Languages"
    keywords:
      - "Python"
      - "TypeScript"
      - "Go"
  - name: "Tools & Frameworks"
    keywords:
      - "Docker"
      - "Kubernetes"
      - "React"
```

**Why Use CV as Code?**

- **Version Control:** Track every change you make using Git, allowing you to roll back or experiment with different descriptions easily.
- **Separation of Content and Style:** Never fiddle with margins or spacing in a word processor again. Focus purely on the content, and let a template handle the styling.
- **Multiple Formats:** Easily generate a plain-text version for applicant tracking systems (ATS), a PDF for recruiters, and a web page for your portfolio from the exact same source file.

Would you like help setting up a specific template or writing a script to convert a YAML resume into a PDF?

### 7. "Kreator CV online za darmo"

Szukasz darmowego kreatora CV online? Oto kilka popularnych i sprawdzonych narzędzi, które pomogą Ci szybko i łatwo stworzyć profesjonalny życiorys, nawet jeśli robisz to po raz pierwszy:

- **Canva** – Oferuje setki nowoczesnych i estetycznych szablonów CV. Wystarczy założyć darmowe konto, wybrać wzór i uzupełnić go własnymi danymi.
- **Europass** – Oficjalny, darmowy kreator Unii Europejskiej. Idealny, jeśli aplikujesz do pracy lub na praktyki w kraju lub za granicą, zwłaszcza w instytucjach publicznych czy na europejskich projektach.
- **Pracuj.pl / InterviewMe / RocketCV** – Popularne polskie serwisy rekrutacyjne i kreatory, które często oferują darmowe wersje lub podstawowe szablony do pobrania w formacie PDF po zarejestrowaniu.

**Wskazówki do Twojego pierwszego CV:**

- **Bądź zwięzły:** Staraj się zmieścić całe CV na jednej stronie formatu A4.
- **Dopasuj do ogłoszenia:** Wpisz w sekcji doświadczenia lub umiejętności te cechy i zajęcia (np. wolontariat, samorząd uczniowski, projekty szkolne), które pasują do stanowiska, na które aplikujesz.
- **Sprawdź błędy:** Poproś kogoś dorosłego lub znajomego o przeczytanie gotowego dokumentu, aby upewnić się, że nie ma w nim literówek.

Czy potrzebujesz pomysłu na to, co wpisać w sekcji o umiejętnościach lub edukacji?
