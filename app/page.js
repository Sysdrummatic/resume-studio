'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import yaml from 'js-yaml';
import {
  FileText, Plus, Eye, Trash2, LogOut, User, Shield, Globe,
  ChevronRight, Briefcase, GraduationCap, Languages, Star, Mail,
  Phone, MapPin, Calendar, Edit, Users, ArrowLeft,
  CheckCircle, AlertCircle, Code, Zap, Lock, Search
} from 'lucide-react';

// ======================== TRANSLATIONS ========================
const translations = {
  pl: {
    heroTitle1: 'CV, które traktujesz',
    heroTitle2: 'jak kod.',
    heroTitle3: 'Nie formularz.',
    heroSub: 'Twórz profesjonalne CV w formacie YAML, zarządzaj wersjami i publikuj z pełną kontrolą. Nowoczesne narzędzie dla profesjonalistów.',
    heroEyebrow: 'kreator CV · YAML · zarządzanie rolami',
    getStarted: 'Utwórz swoje CV →',
    seeHow: 'Zobacz jak to działa',
    statYaml: 'YAML',
    statYamlLabel: 'Otwarte formaty',
    statPreview: 'Live',
    statPreviewLabel: 'Podgląd w czasie rzeczywistym',
    statExport: 'PDF & Web',
    statExportLabel: 'Eksport jednym kliknięciem',
    statRoles: '4 role',
    statRolesLabel: 'System uprawnień',
    sectionHow: '// jak to działa',
    howTitle: 'Piszesz strukturę.\nMy generujemy resztę.',
    howSub: 'Jeden plik YAML. Pełna kontrola nad danymi. Zero zależności od platformy.',
    sectionFeatures: '// funkcje',
    featuresTitle: 'Wszystko, czego\npotrzebujesz.',
    featuresSub: 'Jeden standard, dziesiątki możliwości.',
    featureCreator: 'Kreator CV',
    featureCreatorDesc: 'Intuicyjny formularz strukturyzujący dane w format YAML. Podgląd na żywo.',
    featurePreview: 'Podgląd na żywo',
    featurePreviewDesc: 'Oglądaj swoje CV z nałożonymi stylami CSS w czasie rzeczywistym.',
    featureRoles: 'System ról',
    featureRolesDesc: 'Admin, Manager, Rekruter, Użytkownik — granularne uprawnienia.',
    featureVersion: 'Version control',
    featureVersionDesc: 'Każda zmiana w CV jest zapisana. Edytuj i aktualizuj bez straty danych.',
    featureExport: 'Eksport YAML',
    featureExportDesc: 'Twoje CV w czystym formacie YAML — przenośne i czytelne.',
    featureMultilang: 'Wielojęzyczność',
    featureMultilangDesc: 'Obsługa polskiego, niemieckiego i angielskiego. Zmień język jednym kliknięciem.',
    sectionWho: '// dla kogo',
    whoTitle: 'Jeden standard.\nDwa światy.',
    personaUserTag: 'użytkownik indywidualny',
    personaUserTitle: 'Profesjonalista,\nktóry wie czego chce.',
    personaUserDesc: 'Dla każdego kto chce mieć CV pod kontrolą.',
    personaUserList: ['Twórz CV w edytorze z podglądem', 'Strukturyzuj dane w formacie YAML', 'Edytuj i aktualizuj w dowolnym momencie', 'Podglądaj gotowe CV ze stylami'],
    personaRecTag: 'rekruter / HR',
    personaRecTitle: 'Rekruter, który\nprzestał parsować PDFy.',
    personaRecDesc: 'Dostęp do ustrukturyzowanych CV. Przeglądaj profile kandydatów.',
    personaRecList: ['Przeglądaj wszystkie CV w systemie', 'Standaryzowane pola — zero interpretacji', 'Szybki dostęp do danych kandydatów', 'Filtruj i szukaj talentów'],
    login: 'Zaloguj się',
    register: 'Zarejestruj się',
    email: 'Email',
    password: 'Hasło',
    name: 'Imię i nazwisko',
    resetPassword: 'Resetuj hasło',
    newPassword: 'Nowe hasło',
    forgotPassword: 'Zapomniałeś hasła?',
    backToLogin: 'Powrót do logowania',
    noAccount: 'Nie masz konta?',
    haveAccount: 'Masz już konto?',
    resetSuccess: 'Hasło zostało zmienione!',
    dashboard: 'Panel główny',
    myCvs: 'Moje CV',
    createNew: 'Utwórz nowe CV',
    noCvs: 'Nie masz jeszcze żadnego CV. Utwórz swoje pierwsze!',
    lastUpdated: 'Ostatnia aktualizacja',
    preview: 'Podgląd',
    edit: 'Edytuj',
    delete: 'Usuń',
    cvCreator: 'Kreator CV',
    cvTitle: 'Tytuł CV',
    personalInfo: 'Dane osobowe',
    firstName: 'Imię',
    lastName: 'Nazwisko',
    phone: 'Telefon',
    address: 'Adres',
    summary: 'Podsumowanie zawodowe',
    experience: 'Doświadczenie zawodowe',
    company: 'Firma',
    position: 'Stanowisko',
    startDate: 'Data rozpoczęcia',
    endDate: 'Data zakończenia',
    description: 'Opis',
    addExperience: 'Dodaj doświadczenie',
    education: 'Wykształcenie',
    school: 'Szkoła/Uczelnia',
    degree: 'Kierunek/Tytuł',
    addEducation: 'Dodaj wykształcenie',
    skills: 'Umiejętności',
    addSkill: 'Dodaj umiejętność',
    languages: 'Języki',
    language: 'Język',
    level: 'Poziom',
    addLanguage: 'Dodaj język',
    save: 'Zapisz CV',
    yamlPreview: 'Podgląd YAML',
    cvPreview: 'Podgląd CV',
    adminPanel: 'Panel administracyjny',
    userManagement: 'Zarządzanie użytkownikami',
    role: 'Rola',
    changeRole: 'Zmień rolę',
    deleteUser: 'Usuń użytkownika',
    allCvs: 'Wszystkie CV',
    browseCvs: 'Przeglądaj CV',
    author: 'Autor',
    loading: 'Ładowanie...',
    error: 'Błąd',
    success: 'Sukces',
    back: 'Powrót',
    logout: 'Wyloguj się',
    present: 'Obecnie',
    skillPlaceholder: 'np. JavaScript, React, Node.js',
    livePreview: 'live preview',
    generatedCv: 'Wygenerowane CV',
    exampleYaml: 'przykład.cv.yaml',
  },
  en: {
    heroTitle1: 'CV you treat',
    heroTitle2: 'like code.',
    heroTitle3: 'Not a form.',
    heroSub: 'Create professional CVs in YAML format, manage versions and publish with full control. A modern tool for professionals.',
    heroEyebrow: 'CV creator · YAML · role management',
    getStarted: 'Create your CV →',
    seeHow: 'See how it works',
    statYaml: 'YAML',
    statYamlLabel: 'Open formats',
    statPreview: 'Live',
    statPreviewLabel: 'Real-time preview',
    statExport: 'PDF & Web',
    statExportLabel: 'One-click export',
    statRoles: '4 roles',
    statRolesLabel: 'Permission system',
    sectionHow: '// how it works',
    howTitle: 'You write the structure.\nWe generate the rest.',
    howSub: 'One YAML file. Full control over data. Zero platform lock-in.',
    sectionFeatures: '// features',
    featuresTitle: 'Everything you\nneed.',
    featuresSub: 'One standard, dozens of possibilities.',
    featureCreator: 'CV Creator',
    featureCreatorDesc: 'Intuitive form structuring data into YAML format. Live preview.',
    featurePreview: 'Live Preview',
    featurePreviewDesc: 'View your CV with applied CSS styles in real-time.',
    featureRoles: 'Role System',
    featureRolesDesc: 'Admin, Manager, Recruiter, User — granular permissions.',
    featureVersion: 'Version control',
    featureVersionDesc: 'Every CV change is saved. Edit and update without losing data.',
    featureExport: 'YAML Export',
    featureExportDesc: 'Your CV in clean YAML format — portable and readable.',
    featureMultilang: 'Multi-language',
    featureMultilangDesc: 'Polish, German, and English support. Switch language with one click.',
    sectionWho: '// for whom',
    whoTitle: 'One standard.\nTwo worlds.',
    personaUserTag: 'individual user',
    personaUserTitle: 'Professional who\nknows what they want.',
    personaUserDesc: 'For anyone who wants full control over their CV.',
    personaUserList: ['Create CV with live preview editor', 'Structure data in YAML format', 'Edit and update at any time', 'Preview styled CV in real-time'],
    personaRecTag: 'recruiter / HR',
    personaRecTitle: 'Recruiter who\nstopped parsing PDFs.',
    personaRecDesc: 'Access to structured CVs. Browse candidate profiles.',
    personaRecList: ['Browse all CVs in the system', 'Standardized fields — zero interpretation', 'Quick access to candidate data', 'Filter and search for talents'],
    login: 'Log In',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    name: 'Full Name',
    resetPassword: 'Reset Password',
    newPassword: 'New Password',
    forgotPassword: 'Forgot password?',
    backToLogin: 'Back to login',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    resetSuccess: 'Password has been changed!',
    dashboard: 'Dashboard',
    myCvs: 'My CVs',
    createNew: 'Create New CV',
    noCvs: "You don't have any CVs yet. Create your first one!",
    lastUpdated: 'Last updated',
    preview: 'Preview',
    edit: 'Edit',
    delete: 'Delete',
    cvCreator: 'CV Creator',
    cvTitle: 'CV Title',
    personalInfo: 'Personal Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    address: 'Address',
    summary: 'Professional Summary',
    experience: 'Work Experience',
    company: 'Company',
    position: 'Position',
    startDate: 'Start Date',
    endDate: 'End Date',
    description: 'Description',
    addExperience: 'Add Experience',
    education: 'Education',
    school: 'School/University',
    degree: 'Degree/Field',
    addEducation: 'Add Education',
    skills: 'Skills',
    addSkill: 'Add Skill',
    languages: 'Languages',
    language: 'Language',
    level: 'Level',
    addLanguage: 'Add Language',
    save: 'Save CV',
    yamlPreview: 'YAML Preview',
    cvPreview: 'CV Preview',
    adminPanel: 'Admin Panel',
    userManagement: 'User Management',
    role: 'Role',
    changeRole: 'Change Role',
    deleteUser: 'Delete User',
    allCvs: 'All CVs',
    browseCvs: 'Browse CVs',
    author: 'Author',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    back: 'Back',
    logout: 'Log Out',
    present: 'Present',
    skillPlaceholder: 'e.g. JavaScript, React, Node.js',
    livePreview: 'live preview',
    generatedCv: 'Generated CV',
    exampleYaml: 'example.cv.yaml',
  },
  de: {
    heroTitle1: 'Lebenslauf, den du',
    heroTitle2: 'wie Code behandelst.',
    heroTitle3: 'Kein Formular.',
    heroSub: 'Erstellen Sie professionelle Lebensläufe im YAML-Format, verwalten Sie Versionen und veröffentlichen Sie mit voller Kontrolle.',
    heroEyebrow: 'Lebenslauf-Ersteller · YAML · Rollenverwaltung',
    getStarted: 'Lebenslauf erstellen →',
    seeHow: 'So funktioniert es',
    statYaml: 'YAML',
    statYamlLabel: 'Offene Formate',
    statPreview: 'Live',
    statPreviewLabel: 'Echtzeit-Vorschau',
    statExport: 'PDF & Web',
    statExportLabel: 'Export mit einem Klick',
    statRoles: '4 Rollen',
    statRolesLabel: 'Berechtigungssystem',
    sectionHow: '// wie es funktioniert',
    howTitle: 'Sie schreiben die Struktur.\nWir generieren den Rest.',
    howSub: 'Eine YAML-Datei. Volle Kontrolle über die Daten. Kein Platform-Lock-in.',
    sectionFeatures: '// funktionen',
    featuresTitle: 'Alles, was Sie\nbrauchen.',
    featuresSub: 'Ein Standard, Dutzende Möglichkeiten.',
    featureCreator: 'Lebenslauf-Ersteller',
    featureCreatorDesc: 'Intuitives Formular zur Strukturierung von Daten im YAML-Format.',
    featurePreview: 'Live-Vorschau',
    featurePreviewDesc: 'Sehen Sie Ihren Lebenslauf mit CSS-Stilen in Echtzeit.',
    featureRoles: 'Rollensystem',
    featureRolesDesc: 'Admin, Manager, Recruiter, Benutzer — granulare Berechtigungen.',
    featureVersion: 'Versionskontrolle',
    featureVersionDesc: 'Jede Änderung wird gespeichert. Bearbeiten ohne Datenverlust.',
    featureExport: 'YAML-Export',
    featureExportDesc: 'Ihr Lebenslauf im sauberen YAML-Format — portabel und lesbar.',
    featureMultilang: 'Mehrsprachig',
    featureMultilangDesc: 'Polnisch, Deutsch und Englisch. Sprache mit einem Klick wechseln.',
    sectionWho: '// für wen',
    whoTitle: 'Ein Standard.\nZwei Welten.',
    personaUserTag: 'Einzelbenutzer',
    personaUserTitle: 'Profi, der weiß,\nwas er will.',
    personaUserDesc: 'Für jeden, der volle Kontrolle über seinen Lebenslauf will.',
    personaUserList: ['Lebenslauf mit Live-Vorschau erstellen', 'Daten im YAML-Format strukturieren', 'Jederzeit bearbeiten und aktualisieren', 'Gestylten Lebenslauf in Echtzeit ansehen'],
    personaRecTag: 'Recruiter / HR',
    personaRecTitle: 'Recruiter, der aufgehört\nhat PDFs zu parsen.',
    personaRecDesc: 'Zugang zu strukturierten Lebensläufen.',
    personaRecList: ['Alle Lebensläufe im System durchsuchen', 'Standardisierte Felder', 'Schneller Zugriff auf Kandidatendaten', 'Talente filtern und suchen'],
    login: 'Anmelden',
    register: 'Registrieren',
    email: 'E-Mail',
    password: 'Passwort',
    name: 'Vollständiger Name',
    resetPassword: 'Passwort zurücksetzen',
    newPassword: 'Neues Passwort',
    forgotPassword: 'Passwort vergessen?',
    backToLogin: 'Zurück zum Login',
    noAccount: 'Kein Konto?',
    haveAccount: 'Bereits ein Konto?',
    resetSuccess: 'Passwort wurde geändert!',
    dashboard: 'Dashboard',
    myCvs: 'Meine Lebensläufe',
    createNew: 'Neuen Lebenslauf erstellen',
    noCvs: 'Sie haben noch keine Lebensläufe. Erstellen Sie Ihren ersten!',
    lastUpdated: 'Zuletzt aktualisiert',
    preview: 'Vorschau',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    cvCreator: 'Lebenslauf-Ersteller',
    cvTitle: 'Lebenslauf-Titel',
    personalInfo: 'Persönliche Daten',
    firstName: 'Vorname',
    lastName: 'Nachname',
    phone: 'Telefon',
    address: 'Adresse',
    summary: 'Berufliche Zusammenfassung',
    experience: 'Berufserfahrung',
    company: 'Unternehmen',
    position: 'Position',
    startDate: 'Anfangsdatum',
    endDate: 'Enddatum',
    description: 'Beschreibung',
    addExperience: 'Erfahrung hinzufügen',
    education: 'Ausbildung',
    school: 'Schule/Universität',
    degree: 'Abschluss/Fachrichtung',
    addEducation: 'Ausbildung hinzufügen',
    skills: 'Fähigkeiten',
    addSkill: 'Fähigkeit hinzufügen',
    languages: 'Sprachen',
    language: 'Sprache',
    level: 'Niveau',
    addLanguage: 'Sprache hinzufügen',
    save: 'Lebenslauf speichern',
    yamlPreview: 'YAML-Vorschau',
    cvPreview: 'Lebenslauf-Vorschau',
    adminPanel: 'Admin-Panel',
    userManagement: 'Benutzerverwaltung',
    role: 'Rolle',
    changeRole: 'Rolle ändern',
    deleteUser: 'Benutzer löschen',
    allCvs: 'Alle Lebensläufe',
    browseCvs: 'Lebensläufe durchsuchen',
    author: 'Autor',
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    back: 'Zurück',
    logout: 'Abmelden',
    present: 'Aktuell',
    skillPlaceholder: 'z.B. JavaScript, React, Node.js',
    livePreview: 'Live-Vorschau',
    generatedCv: 'Generierter Lebenslauf',
    exampleYaml: 'beispiel.cv.yaml',
  },
};

const languageNames = { pl: 'PL', en: 'EN', de: 'DE' };

// ======================== HELPERS ========================
const apiCall = async (path, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cvManagerToken') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api/${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Wystąpił błąd');
  return data;
};

const emptyCV = {
  personalInfo: { firstName: '', lastName: '', email: '', phone: '', address: '', summary: '' },
  experience: [],
  education: [],
  skills: [],
  languages: [],
};

// ======================== MAIN APP ========================
export default function App() {
  const [lang, setLang] = useState('pl');
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [currentCv, setCurrentCv] = useState(null);
  const [editCvId, setEditCvId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const t = translations[lang];

  useEffect(() => {
    const savedToken = localStorage.getItem('cvManagerToken');
    const savedLang = localStorage.getItem('cvManagerLang');
    if (savedLang) setLang(savedLang);
    if (savedToken) {
      setToken(savedToken);
      apiCall('auth/me').then(data => {
        setUser(data.user);
        setView('dashboard');
      }).catch(() => {
        localStorage.removeItem('cvManagerToken');
      });
    }
  }, []);

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('cvManagerLang', newLang);
  };

  const handleLogin = async (email, password) => {
    setLoading(true); setError('');
    try {
      const data = await apiCall('auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('cvManagerToken', data.token);
      setToken(data.token); setUser(data.user); setView('dashboard');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const handleRegister = async (name, email, password) => {
    setLoading(true); setError('');
    try {
      const data = await apiCall('auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      localStorage.setItem('cvManagerToken', data.token);
      setToken(data.token); setUser(data.user); setView('dashboard');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const handleResetPassword = async (email, newPassword) => {
    setLoading(true); setError('');
    try {
      await apiCall('auth/reset-password', { method: 'POST', body: JSON.stringify({ email, newPassword }) });
      setSuccess(t.resetSuccess);
      setTimeout(() => { setView('login'); setSuccess(''); }, 2000);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('cvManagerToken');
    setToken(null); setUser(null); setCvs([]); setView('landing');
  };

  const loadCvs = useCallback(async () => {
    try { const data = await apiCall('cv'); setCvs(data.cvs || []); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (view === 'dashboard' && user) loadCvs();
  }, [view, user, loadCvs]);

  const handleSaveCv = async (title, cvData) => {
    setLoading(true); setError('');
    try {
      if (editCvId) {
        await apiCall(`cv/${editCvId}`, { method: 'PUT', body: JSON.stringify({ title, data: cvData }) });
      } else {
        await apiCall('cv', { method: 'POST', body: JSON.stringify({ title, data: cvData }) });
      }
      setEditCvId(null); setView('dashboard'); loadCvs();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const handleDeleteCv = async (id) => {
    try { await apiCall(`cv/${id}`, { method: 'DELETE' }); loadCvs(); } catch (e) { setError(e.message); }
  };

  const clearMessages = () => { setError(''); setSuccess(''); };

  // ======================== LANGUAGE SWITCHER ========================
  const LanguageSwitcher = () => (
    <div className="flex items-center gap-1">
      <Globe className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
      {Object.entries(languageNames).map(([key, name]) => (
        <button
          key={key}
          onClick={() => changeLang(key)}
          className="px-2 py-1 text-xs rounded-md transition-all font-mono"
          style={{
            background: lang === key ? 'var(--primary)' : 'transparent',
            color: lang === key ? '#fff' : 'var(--muted)',
          }}
        >
          {name}
        </button>
      ))}
    </div>
  );

  // ======================== NAVBAR ========================
  const Navbar = () => (
    <nav className="sticky top-0 z-50 w-full" style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(8,6,15,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div className="max-w-[1100px] mx-auto px-8 flex items-center justify-between h-[60px]">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => user ? setView('dashboard') : setView('landing')}>
          <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-xs font-bold font-mono text-white" style={{ background: 'var(--primary)' }}>
            CV
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>
            Open<span style={{ color: 'var(--primary-soft)' }}>CV</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full ml-1" style={{
            background: 'rgba(124,58,237,0.2)',
            color: 'var(--primary-soft)',
            border: '1px solid var(--cv-border)',
          }}>v1.0</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user && (
            <>
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg" style={{
                background: 'var(--void-3)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--cv-white)',
              }}>
                <User className="h-3 w-3" style={{ color: 'var(--primary-soft)' }} />
                {user.name}
              </div>
              <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded" style={{
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
              }}>{user.role}</span>
              {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                <button onClick={() => setView('admin')} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--primary-soft)' }}>
                  <Shield className="h-4 w-4" />
                </button>
              )}
              {(user.role === 'ADMIN' || user.role === 'RECRUITER') && (
                <button onClick={() => setView('recruiter')} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--primary-soft)' }}>
                  <Users className="h-4 w-4" />
                </button>
              )}
              <button onClick={handleLogout} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--muted)' }}>
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
          {!user && (
            <button onClick={() => setView('login')} className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all" style={{
              background: 'var(--primary)',
              color: '#fff',
              fontFamily: 'Sora, sans-serif',
            }}>
              {t.login}
            </button>
          )}
        </div>
      </div>
    </nav>
  );

  // ======================== LANDING PAGE ========================
  const LandingPage = () => (
    <div className="min-h-screen relative">
      {/* Orbs */}
      <div className="fixed pointer-events-none" style={{ width: 600, height: 600, borderRadius: '50%', filter: 'blur(120px)', background: 'var(--orb-1)', top: -100, left: -100, zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ width: 500, height: 500, borderRadius: '50%', filter: 'blur(120px)', background: 'var(--orb-2)', top: 200, right: -100, zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ width: 400, height: 400, borderRadius: '50%', filter: 'blur(120px)', background: 'var(--orb-3)', bottom: 100, left: '30%', zIndex: 0 }} />

      <Navbar />

      {/* HERO */}
      <section className="relative" style={{ padding: '120px 0 100px' }}>
        <div className="max-w-[1100px] mx-auto px-8 relative z-10">
          {/* Eyebrow */}
          <div className="animate-fade-up inline-flex items-center gap-2 text-xs font-mono font-medium px-3 py-1.5 rounded-full mb-7" style={{
            color: 'var(--accent)',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
            letterSpacing: '0.02em',
          }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', animation: 'pulse-dot 2s infinite' }} />
            {t.heroEyebrow}
          </div>

          {/* Title */}
          <h1 className="animate-fade-up-delay-1 font-extrabold tracking-tight mb-6" style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 'clamp(44px, 6vw, 76px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: 'var(--cv-white)',
            maxWidth: 820,
          }}>
            {t.heroTitle1}<br />
            <span style={{ color: 'var(--primary-soft)' }}>{t.heroTitle2}</span><br />
            <span style={{ color: 'var(--accent)' }}>{t.heroTitle3}</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-up-delay-2 text-lg mb-10" style={{
            color: 'var(--muted)',
            maxWidth: 520,
            lineHeight: 1.65,
          }}>
            {t.heroSub}
          </p>

          {/* Actions */}
          <div className="animate-fade-up-delay-3 flex items-center gap-3.5 flex-wrap">
            <button onClick={() => setView('register')} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[10px] text-[15px] font-semibold transition-all hover:-translate-y-0.5" style={{
              background: 'var(--primary)',
              color: '#fff',
              fontFamily: 'Sora, sans-serif',
            }}>
              {t.getStarted}
            </button>
            <button onClick={() => document.getElementById('how-section')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[10px] text-[15px] font-medium transition-all" style={{
              background: 'transparent',
              color: 'var(--primary-soft)',
              border: '1px solid var(--cv-border)',
            }}>
              {t.seeHow}
            </button>
          </div>

          {/* Stats */}
          <div className="animate-fade-up-delay-4 flex gap-10 mt-16 pt-10 flex-wrap" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {[
              { num: t.statYaml, sub: <><span style={{ color: 'var(--accent)' }}>+</span>JSON</>, label: t.statYamlLabel },
              { num: t.statPreview, sub: <><span style={{ color: 'var(--accent)' }}>-</span>preview</>, label: t.statPreviewLabel },
              { num: t.statExport, sub: '', label: t.statExportLabel },
              { num: t.statRoles, sub: '', label: t.statRolesLabel },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-[28px] font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>
                  {stat.num}{stat.sub}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Code Section */}
      <section id="how-section" className="relative z-10" style={{ padding: '80px 0' }}>
        <div className="max-w-[1100px] mx-auto px-8">
          <div className="mb-12">
            <div className="text-[11px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>{t.sectionHow}</div>
            <h2 className="font-bold tracking-tight mb-4 whitespace-pre-line" style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(28px, 4vw, 42px)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
            }}>{t.howTitle}</h2>
            <p className="text-base mb-12" style={{ color: 'var(--muted)', maxWidth: 480, lineHeight: 1.65 }}>{t.howSub}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* YAML Code Block */}
            <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--void-3)', border: '1px solid var(--cv-border)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--cv-border)', background: 'rgba(0,0,0,0.15)' }}>
                <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
                <span className="text-xs font-mono ml-1" style={{ color: 'var(--muted)' }}>{t.exampleYaml}</span>
              </div>
              <div className="p-5 font-mono text-[13px] leading-[1.9] overflow-x-auto" style={{ color: '#C4B5FD' }}>
                <div><span className="yaml-com"># OpenCV Standard v1.0</span></div>
                <div><span className="yaml-key">meta</span>:</div>
                <div>  <span className="yaml-key">version</span>: <span className="yaml-val">&quot;1.0&quot;</span></div>
                <div>  <span className="yaml-key">schema</span>: <span className="yaml-str">opencvstandard.org/v1</span></div>
                <div></div>
                <div><span className="yaml-key">personal</span>:</div>
                <div>  <span className="yaml-key">name</span>: <span className="yaml-val">&quot;Jan Kowalski&quot;</span></div>
                <div>  <span className="yaml-key">title</span>: <span className="yaml-val">&quot;Senior Frontend Dev&quot;</span></div>
                <div>  <span className="yaml-key">location</span>: <span className="yaml-val">&quot;Warszawa, PL&quot;</span></div>
                <div>  <span className="yaml-key">email</span>: <span className="yaml-str">jan@kowalski.dev</span></div>
                <div></div>
                <div><span className="yaml-key">experience</span>:</div>
                <div>  - <span className="yaml-key">company</span>: <span className="yaml-val">&quot;Acme Corp&quot;</span></div>
                <div>    <span className="yaml-key">role</span>: <span className="yaml-val">&quot;Lead Developer&quot;</span></div>
                <div>    <span className="yaml-key">from</span>: <span className="yaml-arr">2021-03</span></div>
                <div>    <span className="yaml-key">to</span>: <span className="yaml-arr">present</span></div>
                <div></div>
                <div><span className="yaml-key">skills</span>:</div>
                <div>  <span className="yaml-key">languages</span>: <span className="yaml-arr">[TypeScript, React, Go]</span></div>
              </div>
            </div>

            {/* CV Preview */}
            <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--void-3)', border: '1px solid var(--cv-border)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--cv-border)', background: 'rgba(0,0,0,0.15)' }}>
                <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
                <span className="text-xs font-mono ml-1" style={{ color: 'var(--muted)' }}>{t.generatedCv}</span>
                <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded" style={{
                  background: 'var(--accent-bg)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent-border)',
                }}>{t.livePreview}</span>
              </div>
              <div className="p-6">
                <div className="text-[22px] font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>Jan Kowalski</div>
                <div className="text-[13px] mt-1 mb-4" style={{ color: 'var(--primary-soft)' }}>Senior Frontend Developer · Warszawa</div>
                <div className="flex gap-1.5 flex-wrap mb-5">
                  {['TypeScript', 'React', 'Go'].map(s => (
                    <span key={s} className="text-[11px] px-2.5 py-0.5 rounded font-mono font-medium" style={{
                      background: 'var(--cv-border)',
                      color: 'var(--primary-pale)',
                      border: '1px solid var(--cv-border)',
                    }}>{s}</span>
                  ))}
                  <span className="text-[11px] px-2.5 py-0.5 rounded font-mono font-medium" style={{
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                  }}>open to work</span>
                </div>
                <div className="h-px my-4" style={{ background: 'var(--border-subtle)' }} />
                <div className="text-[10px] font-semibold font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>{t.experience}</div>
                <div className="mb-3">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--cv-white)' }}>Lead Developer — Acme Corp</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>mar 2021 → present</div>
                </div>
                <div className="mb-3">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--cv-white)' }}>Frontend Engineer — Beta Labs</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>jun 2019 → mar 2021</div>
                </div>
                <div className="h-px my-4" style={{ background: 'var(--border-subtle)' }} />
                <div className="text-[10px] font-semibold font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>{t.skills}</div>
                <div className="flex gap-1.5 flex-wrap">
                  {['k8s', 'Figma', 'Rust'].map(s => (
                    <span key={s} className="text-[11px] px-2.5 py-0.5 rounded font-mono font-medium" style={{
                      background: 'var(--cv-border)',
                      color: 'var(--primary-pale)',
                      border: '1px solid var(--cv-border)',
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10" style={{ padding: '80px 0' }}>
        <div className="max-w-[1100px] mx-auto px-8">
          <div className="mb-12">
            <div className="text-[11px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>{t.sectionFeatures}</div>
            <h2 className="font-bold tracking-tight whitespace-pre-line" style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(28px, 4vw, 42px)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
            }}>{t.featuresTitle}</h2>
            <p className="text-base mt-3" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>{t.featuresSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Zap className="h-[18px] w-[18px]" />, title: t.featureCreator, desc: t.featureCreatorDesc, lime: false },
              { icon: <Eye className="h-[18px] w-[18px]" />, title: t.featurePreview, desc: t.featurePreviewDesc, lime: true },
              { icon: <Lock className="h-[18px] w-[18px]" />, title: t.featureRoles, desc: t.featureRolesDesc, lime: false },
              { icon: <Code className="h-[18px] w-[18px]" />, title: t.featureVersion, desc: t.featureVersionDesc, lime: true },
              { icon: <FileText className="h-[18px] w-[18px]" />, title: t.featureExport, desc: t.featureExportDesc, lime: false },
              { icon: <Languages className="h-[18px] w-[18px]" />, title: t.featureMultilang, desc: t.featureMultilangDesc, lime: true },
            ].map((f, i) => (
              <div key={i} className="rounded-[14px] p-7 transition-all hover:border-[rgba(124,58,237,0.3)]" style={{
                background: 'var(--void-2)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center mb-4.5" style={{
                  background: f.lime ? 'var(--accent-bg)' : 'rgba(124,58,237,0.15)',
                  border: f.lime ? '1px solid var(--accent-border)' : '1px solid rgba(124,58,237,0.25)',
                  color: f.lime ? 'var(--accent)' : 'var(--primary-soft)',
                }}>
                  {f.icon}
                </div>
                <div className="text-base font-semibold tracking-tight mb-2 mt-4" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>{f.title}</div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR WHO */}
      <section className="relative z-10" style={{ padding: '80px 0' }}>
        <div className="max-w-[1100px] mx-auto px-8">
          <div className="mb-12">
            <div className="text-[11px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>{t.sectionWho}</div>
            <h2 className="font-bold tracking-tight whitespace-pre-line" style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(28px, 4vw, 42px)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
            }}>{t.whoTitle}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User persona */}
            <div className="rounded-2xl p-9 relative overflow-hidden transition-all" style={{
              background: 'var(--void-2)',
              border: '1px solid var(--border-subtle)',
              borderTop: '2px solid var(--primary)',
            }}>
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider px-2.5 py-1 rounded inline-block mb-5" style={{
                background: 'rgba(124,58,237,0.15)',
                color: 'var(--primary-soft)',
                border: '1px solid rgba(124,58,237,0.25)',
              }}>{t.personaUserTag}</span>
              <div className="text-2xl font-bold tracking-tight mb-3 whitespace-pre-line" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>{t.personaUserTitle}</div>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>{t.personaUserDesc}</p>
              <ul className="space-y-2.5">
                {t.personaUserList.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: '#9B8BC0' }}>
                    <span className="font-mono text-xs mt-0.5 flex-shrink-0" style={{ color: 'var(--primary-soft)' }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recruiter persona */}
            <div className="rounded-2xl p-9 relative overflow-hidden transition-all" style={{
              background: 'var(--void-2)',
              border: '1px solid var(--border-subtle)',
              borderTop: '2px solid var(--accent)',
            }}>
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider px-2.5 py-1 rounded inline-block mb-5" style={{
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
              }}>{t.personaRecTag}</span>
              <div className="text-2xl font-bold tracking-tight mb-3 whitespace-pre-line" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>{t.personaRecTitle}</div>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>{t.personaRecDesc}</p>
              <ul className="space-y-2.5">
                {t.personaRecList.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: '#9B8BC0' }}>
                    <span className="font-mono text-xs mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10" style={{ borderTop: '1px solid var(--border-subtle)', padding: '40px 0' }}>
        <div className="max-w-[1100px] mx-auto px-8 flex items-center justify-between">
          <span className="text-[13px]" style={{ color: 'var(--muted-2)' }}>&copy; 2025 OpenCV Manager</span>
          <LanguageSwitcher />
        </div>
      </footer>
    </div>
  );

  // ======================== AUTH FORMS ========================
  const AuthWrapper = ({ children }) => (
    <div className="min-h-screen relative">
      <div className="fixed pointer-events-none" style={{ width: 500, height: 500, borderRadius: '50%', filter: 'blur(120px)', background: 'var(--orb-1)', top: -100, left: -100, zIndex: 0 }} />
      <Navbar />
      <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 60px)' }}>
        {children}
      </div>
    </div>
  );

  const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return (
      <AuthWrapper>
        <div className="w-full max-w-md rounded-2xl p-8 relative z-10" style={{
          background: 'var(--void-3)',
          border: '1px solid var(--cv-border)',
        }}>
          <h2 className="text-2xl font-bold tracking-tight mb-6 text-center" style={{ fontFamily: 'Sora, sans-serif' }}>{t.login}</h2>
          {error && <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}><AlertCircle className="h-4 w-4" />{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>{t.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-1" style={{
                  background: 'var(--void-2)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--cv-white)',
                  ringColor: 'var(--primary)',
                }} />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>{t.password}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-1" style={{
                  background: 'var(--void-2)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--cv-white)',
                }} />
            </div>
            <button onClick={() => { clearMessages(); handleLogin(email, password); }} disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5" style={{
                background: 'var(--primary)',
                color: '#fff',
                fontFamily: 'Sora, sans-serif',
              }}>
              {loading ? t.loading : t.login}
            </button>
          </div>
          <div className="text-center mt-4 space-y-2">
            <button className="text-xs hover:underline" style={{ color: 'var(--primary-soft)' }} onClick={() => { clearMessages(); setView('reset-password'); }}>{t.forgotPassword}</button>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{t.noAccount}{' '}
              <button className="hover:underline" style={{ color: 'var(--accent)' }} onClick={() => { clearMessages(); setView('register'); }}>{t.register}</button>
            </p>
          </div>
        </div>
      </AuthWrapper>
    );
  };

  const RegisterForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return (
      <AuthWrapper>
        <div className="w-full max-w-md rounded-2xl p-8 relative z-10" style={{
          background: 'var(--void-3)',
          border: '1px solid var(--cv-border)',
        }}>
          <h2 className="text-2xl font-bold tracking-tight mb-6 text-center" style={{ fontFamily: 'Sora, sans-serif' }}>{t.register}</h2>
          {error && <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}><AlertCircle className="h-4 w-4" />{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>{t.name}</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all" style={{
                  background: 'var(--void-2)', border: '1px solid var(--border-subtle)', color: 'var(--cv-white)',
                }} />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>{t.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all" style={{
                  background: 'var(--void-2)', border: '1px solid var(--border-subtle)', color: 'var(--cv-white)',
                }} />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>{t.password}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all" style={{
                  background: 'var(--void-2)', border: '1px solid var(--border-subtle)', color: 'var(--cv-white)',
                }} />
            </div>
            <button onClick={() => { clearMessages(); handleRegister(name, email, password); }} disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5" style={{
                background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif',
              }}>
              {loading ? t.loading : t.register}
            </button>
          </div>
          <p className="text-center mt-4 text-xs" style={{ color: 'var(--muted)' }}>{t.haveAccount}{' '}
            <button className="hover:underline" style={{ color: 'var(--accent)' }} onClick={() => { clearMessages(); setView('login'); }}>{t.login}</button>
          </p>
        </div>
      </AuthWrapper>
    );
  };

  const ResetPasswordForm = () => {
    const [email, setEmail] = useState('');
    const [newPwd, setNewPwd] = useState('');
    return (
      <AuthWrapper>
        <div className="w-full max-w-md rounded-2xl p-8 relative z-10" style={{
          background: 'var(--void-3)',
          border: '1px solid var(--cv-border)',
        }}>
          <h2 className="text-2xl font-bold tracking-tight mb-6 text-center" style={{ fontFamily: 'Sora, sans-serif' }}>{t.resetPassword}</h2>
          {error && <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}><AlertCircle className="h-4 w-4" />{error}</div>}
          {success && <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}><CheckCircle className="h-4 w-4" />{success}</div>}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>{t.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={{
                  background: 'var(--void-2)', border: '1px solid var(--border-subtle)', color: 'var(--cv-white)',
                }} />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>{t.newPassword}</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={{
                  background: 'var(--void-2)', border: '1px solid var(--border-subtle)', color: 'var(--cv-white)',
                }} />
            </div>
            <button onClick={() => { clearMessages(); handleResetPassword(email, newPwd); }} disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all" style={{ background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif' }}>
              {loading ? t.loading : t.resetPassword}
            </button>
          </div>
          <p className="text-center mt-4 text-xs">
            <button className="hover:underline" style={{ color: 'var(--primary-soft)' }} onClick={() => { clearMessages(); setView('login'); }}>{t.backToLogin}</button>
          </p>
        </div>
      </AuthWrapper>
    );
  };

  // ======================== DASHBOARD ========================
  const Dashboard = () => (
    <div className="min-h-screen relative">
      <div className="fixed pointer-events-none" style={{ width: 500, height: 500, borderRadius: '50%', filter: 'blur(120px)', background: 'var(--orb-1)', top: -100, right: -100, zIndex: 0 }} />
      <Navbar />
      <div className="max-w-[1100px] mx-auto px-8 py-10 relative z-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{t.dashboard}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t.myCvs} ({cvs.length})</p>
          </div>
          <button onClick={() => { setEditCvId(null); setCurrentCv(null); setView('cv-creator'); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold transition-all hover:-translate-y-0.5" style={{
              background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif',
            }}>
            <Plus className="h-4 w-4" />
            {t.createNew}
          </button>
        </div>

        {error && <div className="flex items-center gap-2 p-3 rounded-lg mb-6 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}><AlertCircle className="h-4 w-4" />{error}</div>}

        {cvs.length === 0 ? (
          <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--void-2)', border: '1px solid var(--border-subtle)' }}>
            <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--muted-2)' }} />
            <p className="text-lg mb-4" style={{ color: 'var(--muted)' }}>{t.noCvs}</p>
            <button onClick={() => { setEditCvId(null); setCurrentCv(null); setView('cv-creator'); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif' }}>
              <Plus className="h-4 w-4" />
              {t.createNew}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cvs.map(cv => (
              <div key={cv.id} className="rounded-[14px] overflow-hidden transition-all hover:border-[rgba(124,58,237,0.3)] group" style={{
                background: 'var(--void-2)',
                border: '1px solid var(--border-subtle)',
              }}>
                {/* Mini Preview */}
                <div className="p-4 mx-4 mt-4 rounded-lg overflow-hidden relative" style={{ background: 'var(--void-3)', border: '1px solid var(--border-subtle)', height: 140 }}>
                  <div className="text-sm font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>
                    {cv.data?.personalInfo?.firstName} {cv.data?.personalInfo?.lastName}
                  </div>
                  <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--primary-soft)' }}>{cv.data?.personalInfo?.email}</div>
                  {cv.data?.personalInfo?.summary && <div className="text-[10px] mt-2 line-clamp-2" style={{ color: 'var(--muted)' }}>{cv.data.personalInfo.summary}</div>}
                  {cv.data?.skills?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {cv.data.skills.slice(0, 4).map((s, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{
                          background: 'var(--cv-border)',
                          color: 'var(--primary-pale)',
                        }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(transparent, var(--void-3))' }} />
                </div>

                <div className="p-4">
                  <div className="font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>{cv.title}</div>
                  <div className="text-[11px] mt-1 flex items-center gap-1 font-mono" style={{ color: 'var(--muted)' }}>
                    <Calendar className="h-3 w-3" />
                    {new Date(cv.updatedAt).toLocaleDateString(lang === 'pl' ? 'pl-PL' : lang === 'de' ? 'de-DE' : 'en-US')}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setCurrentCv(cv); setView('cv-preview'); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                        background: 'transparent',
                        border: '1px solid var(--cv-border)',
                        color: 'var(--primary-soft)',
                      }}>
                      <Eye className="h-3 w-3" />{t.preview}
                    </button>
                    <button onClick={() => { setEditCvId(cv.id); setCurrentCv(cv); setView('cv-creator'); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                        background: 'transparent',
                        border: '1px solid var(--cv-border)',
                        color: 'var(--primary-soft)',
                      }}>
                      <Edit className="h-3 w-3" />{t.edit}
                    </button>
                    <button onClick={() => handleDeleteCv(cv.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#FCA5A5',
                      }}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ======================== CV CREATOR ========================
  const CvCreator = () => {
    const initialData = currentCv?.data || JSON.parse(JSON.stringify(emptyCV));
    const [title, setTitle] = useState(currentCv?.title || '');
    const [formData, setFormData] = useState(initialData);
    const [showYaml, setShowYaml] = useState(false);
    const [newSkill, setNewSkill] = useState('');

    const updatePersonalInfo = (field, value) => {
      setFormData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));
    };
    const addExperience = () => {
      setFormData(prev => ({ ...prev, experience: [...prev.experience, { company: '', position: '', startDate: '', endDate: '', description: '' }] }));
    };
    const updateExperience = (index, field, value) => {
      setFormData(prev => { const exp = [...prev.experience]; exp[index] = { ...exp[index], [field]: value }; return { ...prev, experience: exp }; });
    };
    const removeExperience = (index) => {
      setFormData(prev => ({ ...prev, experience: prev.experience.filter((_, i) => i !== index) }));
    };
    const addEducation = () => {
      setFormData(prev => ({ ...prev, education: [...prev.education, { school: '', degree: '', startDate: '', endDate: '' }] }));
    };
    const updateEducation = (index, field, value) => {
      setFormData(prev => { const edu = [...prev.education]; edu[index] = { ...edu[index], [field]: value }; return { ...prev, education: edu }; });
    };
    const removeEducation = (index) => {
      setFormData(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }));
    };
    const addSkill = () => {
      if (newSkill.trim()) { setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] })); setNewSkill(''); }
    };
    const removeSkill = (index) => {
      setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
    };
    const addLanguage = () => {
      setFormData(prev => ({ ...prev, languages: [...prev.languages, { language: '', level: '' }] }));
    };
    const updateLanguage = (index, field, value) => {
      setFormData(prev => { const langs = [...prev.languages]; langs[index] = { ...langs[index], [field]: value }; return { ...prev, languages: langs }; });
    };
    const removeLanguage = (index) => {
      setFormData(prev => ({ ...prev, languages: prev.languages.filter((_, i) => i !== index) }));
    };

    const yamlOutput = yaml.dump(formData, { lineWidth: -1, noRefs: true });

    const inputStyle = { background: 'var(--void-2)', border: '1px solid var(--border-subtle)', color: 'var(--cv-white)' };
    const labelStyle = { color: 'var(--muted)', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const sectionCard = { background: 'var(--void-3)', border: '1px solid var(--cv-border)', borderRadius: '14px' };

    return (
      <div className="min-h-screen relative">
        <Navbar />
        <div className="max-w-[1400px] mx-auto px-8 py-10 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-sm transition-all" style={{ color: 'var(--muted)' }}>
              <ArrowLeft className="h-4 w-4" />{t.back}
            </button>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{t.cvCreator}</h1>
          </div>

          {error && <div className="flex items-center gap-2 p-3 rounded-lg mb-6 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}><AlertCircle className="h-4 w-4" />{error}</div>}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-5">
              {/* Title */}
              <div className="p-5 rounded-[14px]" style={sectionCard}>
                <label style={labelStyle}>{t.cvTitle}</label>
                <input className="w-full px-4 py-3 rounded-lg text-sm outline-none mt-2" style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Moje CV 2025" />
              </div>

              {/* Personal Info */}
              <div className="p-5 rounded-[14px]" style={sectionCard}>
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4" style={{ color: 'var(--primary-soft)' }} />
                  <span className="font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{t.personalInfo}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label style={labelStyle}>{t.firstName}</label><input className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={formData.personalInfo.firstName} onChange={e => updatePersonalInfo('firstName', e.target.value)} /></div>
                  <div><label style={labelStyle}>{t.lastName}</label><input className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={formData.personalInfo.lastName} onChange={e => updatePersonalInfo('lastName', e.target.value)} /></div>
                </div>
                <div className="mt-3"><label style={labelStyle}>{t.email}</label><input type="email" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={formData.personalInfo.email} onChange={e => updatePersonalInfo('email', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div><label style={labelStyle}>{t.phone}</label><input className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={formData.personalInfo.phone} onChange={e => updatePersonalInfo('phone', e.target.value)} /></div>
                  <div><label style={labelStyle}>{t.address}</label><input className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={formData.personalInfo.address} onChange={e => updatePersonalInfo('address', e.target.value)} /></div>
                </div>
                <div className="mt-3"><label style={labelStyle}>{t.summary}</label><textarea rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mt-1 resize-none" style={inputStyle} value={formData.personalInfo.summary} onChange={e => updatePersonalInfo('summary', e.target.value)} /></div>
              </div>

              {/* Experience */}
              <div className="p-5 rounded-[14px]" style={sectionCard}>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="h-4 w-4" style={{ color: 'var(--primary-soft)' }} />
                  <span className="font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{t.experience}</span>
                </div>
                {formData.experience.map((exp, index) => (
                  <div key={index} className="p-4 rounded-lg mb-3 relative" style={{ background: 'var(--void-2)', border: '1px solid var(--border-subtle)' }}>
                    <button className="absolute top-2 right-2 p-1.5 rounded" style={{ color: '#FCA5A5' }} onClick={() => removeExperience(index)}><Trash2 className="h-3 w-3" /></button>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label style={labelStyle}>{t.company}</label><input className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={exp.company} onChange={e => updateExperience(index, 'company', e.target.value)} /></div>
                      <div><label style={labelStyle}>{t.position}</label><input className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={exp.position} onChange={e => updateExperience(index, 'position', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div><label style={labelStyle}>{t.startDate}</label><input type="date" className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={exp.startDate} onChange={e => updateExperience(index, 'startDate', e.target.value)} /></div>
                      <div><label style={labelStyle}>{t.endDate}</label><input type="date" className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={exp.endDate} onChange={e => updateExperience(index, 'endDate', e.target.value)} /></div>
                    </div>
                    <div className="mt-2"><label style={labelStyle}>{t.description}</label><textarea rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1 resize-none" style={inputStyle} value={exp.description} onChange={e => updateExperience(index, 'description', e.target.value)} /></div>
                  </div>
                ))}
                <button onClick={addExperience} className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all" style={{
                  background: 'transparent', border: '1px solid var(--cv-border)', color: 'var(--primary-soft)',
                }}>
                  <Plus className="h-4 w-4" />{t.addExperience}
                </button>
              </div>

              {/* Education */}
              <div className="p-5 rounded-[14px]" style={sectionCard}>
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="h-4 w-4" style={{ color: 'var(--primary-soft)' }} />
                  <span className="font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{t.education}</span>
                </div>
                {formData.education.map((edu, index) => (
                  <div key={index} className="p-4 rounded-lg mb-3 relative" style={{ background: 'var(--void-2)', border: '1px solid var(--border-subtle)' }}>
                    <button className="absolute top-2 right-2 p-1.5 rounded" style={{ color: '#FCA5A5' }} onClick={() => removeEducation(index)}><Trash2 className="h-3 w-3" /></button>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label style={labelStyle}>{t.school}</label><input className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={edu.school} onChange={e => updateEducation(index, 'school', e.target.value)} /></div>
                      <div><label style={labelStyle}>{t.degree}</label><input className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={edu.degree} onChange={e => updateEducation(index, 'degree', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div><label style={labelStyle}>{t.startDate}</label><input type="date" className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={edu.startDate} onChange={e => updateEducation(index, 'startDate', e.target.value)} /></div>
                      <div><label style={labelStyle}>{t.endDate}</label><input type="date" className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={edu.endDate} onChange={e => updateEducation(index, 'endDate', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <button onClick={addEducation} className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all" style={{
                  background: 'transparent', border: '1px solid var(--cv-border)', color: 'var(--primary-soft)',
                }}>
                  <Plus className="h-4 w-4" />{t.addEducation}
                </button>
              </div>

              {/* Skills */}
              <div className="p-5 rounded-[14px]" style={sectionCard}>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  <span className="font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{t.skills}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {formData.skills.map((skill, index) => (
                    <span key={index} className="text-[11px] px-2.5 py-1 rounded font-mono font-medium flex items-center gap-1" style={{
                      background: 'var(--cv-border)', color: 'var(--primary-pale)', border: '1px solid var(--cv-border)',
                    }}>
                      {skill}
                      <button className="ml-0.5 hover:opacity-70" onClick={() => removeSkill(index)}>×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder={t.skillPlaceholder}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
                  <button onClick={addSkill} className="px-3 rounded-lg transition-all" style={{ border: '1px solid var(--cv-border)', color: 'var(--primary-soft)' }}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Languages */}
              <div className="p-5 rounded-[14px]" style={sectionCard}>
                <div className="flex items-center gap-2 mb-4">
                  <Languages className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  <span className="font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{t.languages}</span>
                </div>
                {formData.languages.map((lng, index) => (
                  <div key={index} className="flex gap-3 items-end mb-3">
                    <div className="flex-1"><label style={labelStyle}>{t.language}</label><input className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={lng.language} onChange={e => updateLanguage(index, 'language', e.target.value)} /></div>
                    <div className="flex-1"><label style={labelStyle}>{t.level}</label><input className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1" style={inputStyle} value={lng.level} onChange={e => updateLanguage(index, 'level', e.target.value)} placeholder="A1-C2" /></div>
                    <button className="p-2 rounded-lg mb-0.5" style={{ color: '#FCA5A5' }} onClick={() => removeLanguage(index)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button onClick={addLanguage} className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all" style={{
                  background: 'transparent', border: '1px solid var(--cv-border)', color: 'var(--primary-soft)',
                }}>
                  <Plus className="h-4 w-4" />{t.addLanguage}
                </button>
              </div>

              {/* Save */}
              <button onClick={() => handleSaveCv(title, formData)} disabled={loading || !title.trim()}
                className="w-full py-3.5 rounded-[10px] text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50" style={{
                  background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif',
                }}>
                {loading ? t.loading : t.save}
              </button>
            </div>

            {/* Preview Panel */}
            <div className="space-y-5">
              <div className="flex gap-2">
                <button onClick={() => setShowYaml(false)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{
                  background: !showYaml ? 'var(--primary)' : 'transparent',
                  border: !showYaml ? 'none' : '1px solid var(--cv-border)',
                  color: !showYaml ? '#fff' : 'var(--primary-soft)',
                }}>
                  <Eye className="h-4 w-4" />{t.cvPreview}
                </button>
                <button onClick={() => setShowYaml(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{
                  background: showYaml ? 'var(--primary)' : 'transparent',
                  border: showYaml ? 'none' : '1px solid var(--cv-border)',
                  color: showYaml ? '#fff' : 'var(--primary-soft)',
                }}>
                  <Code className="h-4 w-4" />{t.yamlPreview}
                </button>
              </div>

              <div className="sticky top-[76px]">
                {showYaml ? (
                  <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--void-3)', border: '1px solid var(--cv-border)' }}>
                    <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--cv-border)', background: 'rgba(0,0,0,0.15)' }}>
                      <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
                      <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
                      <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
                      <span className="text-xs font-mono ml-1" style={{ color: 'var(--muted)' }}>cv.yaml</span>
                    </div>
                    <ScrollArea className="h-[700px]">
                      <pre className="p-5 font-mono text-[13px] leading-[1.9] whitespace-pre-wrap" style={{ color: '#C4B5FD' }}>{yamlOutput}</pre>
                    </ScrollArea>
                  </div>
                ) : (
                  <CvPreviewRender data={formData} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ======================== CV PREVIEW RENDER ========================
  const CvPreviewRender = ({ data }) => {
    if (!data) return null;
    const pi = data.personalInfo || {};
    return (
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--void-3)', border: '1px solid var(--cv-border)' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--cv-border)', background: 'rgba(0,0,0,0.15)' }}>
          <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
          <span className="text-xs font-mono ml-1" style={{ color: 'var(--muted)' }}>{t.generatedCv}</span>
          <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded" style={{
            background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)',
          }}>{t.livePreview}</span>
        </div>
        <div className="p-6">
          {/* Name */}
          <div className="text-[22px] font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>
            {pi.firstName} {pi.lastName}
          </div>
          {/* Contact */}
          <div className="flex flex-wrap gap-3 mt-2 text-[12px]" style={{ color: 'var(--primary-soft)' }}>
            {pi.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{pi.email}</span>}
            {pi.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{pi.phone}</span>}
            {pi.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{pi.address}</span>}
          </div>

          {/* Skills tags */}
          {data.skills?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-4">
              {data.skills.map((skill, i) => (
                <span key={i} className="text-[11px] px-2.5 py-0.5 rounded font-mono font-medium" style={{
                  background: 'var(--cv-border)', color: 'var(--primary-pale)', border: '1px solid var(--cv-border)',
                }}>{skill}</span>
              ))}
            </div>
          )}

          {/* Summary */}
          {pi.summary && (
            <>
              <div className="h-px my-4" style={{ background: 'var(--border-subtle)' }} />
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{pi.summary}</p>
            </>
          )}

          {/* Experience */}
          {data.experience?.length > 0 && (
            <>
              <div className="h-px my-4" style={{ background: 'var(--border-subtle)' }} />
              <div className="text-[10px] font-semibold font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>{t.experience}</div>
              {data.experience.map((exp, i) => (
                <div key={i} className="mb-3">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--cv-white)' }}>{exp.position} — {exp.company}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{exp.startDate} → {exp.endDate || t.present}</div>
                  {exp.description && <div className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>{exp.description}</div>}
                </div>
              ))}
            </>
          )}

          {/* Education */}
          {data.education?.length > 0 && (
            <>
              <div className="h-px my-4" style={{ background: 'var(--border-subtle)' }} />
              <div className="text-[10px] font-semibold font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>{t.education}</div>
              {data.education.map((edu, i) => (
                <div key={i} className="mb-3">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--cv-white)' }}>{edu.degree}</div>
                  <div className="text-[12px]" style={{ color: 'var(--primary-soft)' }}>{edu.school}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{edu.startDate} → {edu.endDate || t.present}</div>
                </div>
              ))}
            </>
          )}

          {/* Languages */}
          {data.languages?.length > 0 && (
            <>
              <div className="h-px my-4" style={{ background: 'var(--border-subtle)' }} />
              <div className="text-[10px] font-semibold font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>{t.languages}</div>
              <div className="space-y-1.5">
                {data.languages.map((lng, i) => (
                  <div key={i} className="flex justify-between items-center text-[13px]">
                    <span style={{ color: 'var(--cv-white)' }}>{lng.language}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded font-mono" style={{
                      background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)',
                    }}>{lng.level}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ======================== CV PREVIEW PAGE ========================
  const CvPreviewPage = () => {
    const [showYaml, setShowYaml] = useState(false);
    if (!currentCv) return null;
    const yamlOutput = yaml.dump(currentCv.data, { lineWidth: -1, noRefs: true });
    return (
      <div className="min-h-screen relative">
        <Navbar />
        <div className="max-w-[900px] mx-auto px-8 py-10 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <ArrowLeft className="h-4 w-4" />{t.back}
            </button>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{currentCv.title}</h1>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setShowYaml(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{
                background: !showYaml ? 'var(--primary)' : 'transparent', border: !showYaml ? 'none' : '1px solid var(--cv-border)', color: !showYaml ? '#fff' : 'var(--primary-soft)',
              }}><Eye className="h-3 w-3" />{t.cvPreview}</button>
              <button onClick={() => setShowYaml(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{
                background: showYaml ? 'var(--primary)' : 'transparent', border: showYaml ? 'none' : '1px solid var(--cv-border)', color: showYaml ? '#fff' : 'var(--primary-soft)',
              }}><Code className="h-3 w-3" />{t.yamlPreview}</button>
            </div>
          </div>
          {showYaml ? (
            <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--void-3)', border: '1px solid var(--cv-border)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--cv-border)', background: 'rgba(0,0,0,0.15)' }}>
                <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
                <span className="text-xs font-mono ml-1" style={{ color: 'var(--muted)' }}>cv.yaml</span>
              </div>
              <ScrollArea className="h-[700px]">
                <pre className="p-5 font-mono text-[13px] leading-[1.9] whitespace-pre-wrap" style={{ color: '#C4B5FD' }}>{yamlOutput}</pre>
              </ScrollArea>
            </div>
          ) : (
            <CvPreviewRender data={currentCv.data} />
          )}
        </div>
      </div>
    );
  };

  // ======================== ADMIN PANEL ========================
  const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
      apiCall('admin/users').then(data => { setUsers(data.users || []); setLoadingUsers(false); }).catch(e => { setError(e.message); setLoadingUsers(false); });
    }, []);

    const changeRole = async (userId, newRole) => {
      try {
        await apiCall(`admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } catch (e) { setError(e.message); }
    };

    const deleteUser = async (userId) => {
      try {
        await apiCall(`admin/users/${userId}`, { method: 'DELETE' });
        setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (e) { setError(e.message); }
    };

    const roleColor = (role) => {
      const colors = {
        ADMIN: { bg: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: 'rgba(239,68,68,0.2)' },
        MANAGER: { bg: 'rgba(124,58,237,0.15)', color: 'var(--primary-soft)', border: 'rgba(124,58,237,0.25)' },
        RECRUITER: { bg: 'var(--accent-bg)', color: 'var(--accent)', border: 'var(--accent-border)' },
        STANDARD_USER: { bg: 'rgba(134,239,172,0.08)', color: '#86EFAC', border: 'rgba(134,239,172,0.2)' },
      };
      return colors[role] || colors.STANDARD_USER;
    };

    return (
      <div className="min-h-screen relative">
        <Navbar />
        <div className="max-w-[1100px] mx-auto px-8 py-10 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <ArrowLeft className="h-4 w-4" />{t.back}
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{t.adminPanel}</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t.userManagement}</p>
            </div>
          </div>

          {error && <div className="flex items-center gap-2 p-3 rounded-lg mb-6 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}><AlertCircle className="h-4 w-4" />{error}</div>}

          {loadingUsers ? (
            <p style={{ color: 'var(--muted)' }}>{t.loading}</p>
          ) : (
            <div className="space-y-3">
              {users.map(u => {
                const rc = roleColor(u.role);
                return (
                  <div key={u.id} className="rounded-[14px] p-4 flex items-center justify-between" style={{
                    background: 'var(--void-2)', border: '1px solid var(--border-subtle)',
                  }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
                        <User className="h-5 w-5" style={{ color: 'var(--primary-soft)' }} />
                      </div>
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--cv-white)' }}>{u.name}</div>
                        <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{u.email}</div>
                      </div>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded" style={{
                        background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                      }}>{u.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.role === 'ADMIN' && u.id !== user.id && (
                        <Select value={u.role} onValueChange={(value) => changeRole(u.id, value)}>
                          <SelectTrigger className="w-40 h-8 text-xs" style={{ background: 'var(--void-3)', border: '1px solid var(--cv-border)', color: 'var(--cv-white)' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent style={{ background: 'var(--void-3)', border: '1px solid var(--cv-border)' }}>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="MANAGER">MANAGER</SelectItem>
                            <SelectItem value="RECRUITER">RECRUITER</SelectItem>
                            <SelectItem value="STANDARD_USER">STANDARD_USER</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {u.id !== user?.id && (user?.role === 'ADMIN' || (user?.role === 'MANAGER' && (u.role === 'RECRUITER' || u.role === 'STANDARD_USER'))) && (
                        <button onClick={() => deleteUser(u.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5',
                        }}>
                          <Trash2 className="h-3 w-3" />{t.deleteUser}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ======================== RECRUITER VIEW ========================
  const RecruiterView = () => {
    const [allCvs, setAllCvs] = useState([]);
    const [loadingCvs, setLoadingCvs] = useState(true);
    const [selectedCv, setSelectedCv] = useState(null);

    useEffect(() => {
      apiCall('recruiter/cvs').then(data => { setAllCvs(data.cvs || []); setLoadingCvs(false); }).catch(e => { setError(e.message); setLoadingCvs(false); });
    }, []);

    if (selectedCv) {
      return (
        <div className="min-h-screen relative">
          <Navbar />
          <div className="max-w-[900px] mx-auto px-8 py-10 relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setSelectedCv(null)} className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                <ArrowLeft className="h-4 w-4" />{t.back}
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{selectedCv.title}</h1>
                <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>{t.author}: {selectedCv.userName} ({selectedCv.userEmail})</p>
              </div>
            </div>
            <CvPreviewRender data={selectedCv.data} />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen relative">
        <Navbar />
        <div className="max-w-[1100px] mx-auto px-8 py-10 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <ArrowLeft className="h-4 w-4" />{t.back}
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{t.browseCvs}</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t.allCvs} ({allCvs.length})</p>
            </div>
          </div>

          {loadingCvs ? (
            <p style={{ color: 'var(--muted)' }}>{t.loading}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allCvs.map(cv => (
                <div key={cv.id} className="rounded-[14px] overflow-hidden cursor-pointer transition-all hover:border-[rgba(124,58,237,0.3)]" style={{
                  background: 'var(--void-2)', border: '1px solid var(--border-subtle)',
                }} onClick={() => setSelectedCv(cv)}>
                  <div className="p-4 mx-4 mt-4 rounded-lg overflow-hidden relative" style={{ background: 'var(--void-3)', border: '1px solid var(--border-subtle)', height: 100 }}>
                    <div className="text-sm font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>
                      {cv.data?.personalInfo?.firstName} {cv.data?.personalInfo?.lastName}
                    </div>
                    <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--primary-soft)' }}>{cv.data?.personalInfo?.email}</div>
                    <div className="absolute bottom-0 left-0 right-0 h-6" style={{ background: 'linear-gradient(transparent, var(--void-3))' }} />
                  </div>
                  <div className="p-4">
                    <div className="font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--cv-white)' }}>{cv.title}</div>
                    <div className="text-[11px] mt-1 font-mono" style={{ color: 'var(--muted)' }}>
                      {t.author}: {cv.userName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ======================== RENDER ========================
  const renderView = () => {
    switch (view) {
      case 'landing': return <LandingPage />;
      case 'login': return <LoginForm />;
      case 'register': return <RegisterForm />;
      case 'reset-password': return <ResetPasswordForm />;
      case 'dashboard': return <Dashboard />;
      case 'cv-creator': return <CvCreator />;
      case 'cv-preview': return <CvPreviewPage />;
      case 'admin': return <AdminPanel />;
      case 'recruiter': return <RecruiterView />;
      default: return <LandingPage />;
    }
  };

  return renderView();
}
