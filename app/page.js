'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import yaml from 'js-yaml';
import {
  FileText, Plus, Eye, Trash2, LogOut, User, Shield, Globe,
  ChevronRight, Briefcase, GraduationCap, Languages, Star, Mail,
  Phone, MapPin, Calendar, Edit, Users, Settings, Download, ArrowLeft,
  CheckCircle, AlertCircle
} from 'lucide-react';

// ======================== TRANSLATIONS ========================
const translations = {
  pl: {
    // Landing
    heroTitle: 'Twórz profesjonalne CV w kilka minut',
    heroSubtitle: 'Kreator CV z podglądem na żywo, eksportem YAML i zarządzaniem rolami. Nowoczesne narzędzie dla profesjonalistów.',
    getStarted: 'Rozpocznij',
    features: 'Funkcje',
    featureCreator: 'Kreator CV',
    featureCreatorDesc: 'Intuicyjny formularz, który strukturyzuje Twoje dane w profesjonalny format YAML.',
    featurePreview: 'Podgląd na żywo',
    featurePreviewDesc: 'Oglądaj swoje CV z nałożonymi stylami CSS w czasie rzeczywistym.',
    featureRoles: 'System ról',
    featureRolesDesc: 'Zarządzanie użytkownikami z rolami: Admin, Manager, Rekruter, Użytkownik.',
    // Auth
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
    // Dashboard
    dashboard: 'Panel główny',
    myCvs: 'Moje CV',
    createNew: 'Utwórz nowe CV',
    noCvs: 'Nie masz jeszcze żadnego CV. Utwórz swoje pierwsze!',
    lastUpdated: 'Ostatnia aktualizacja',
    preview: 'Podgląd',
    edit: 'Edytuj',
    delete: 'Usuń',
    // CV Creator
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
    // Admin
    adminPanel: 'Panel administracyjny',
    userManagement: 'Zarządzanie użytkownikami',
    role: 'Rola',
    changeRole: 'Zmień rolę',
    deleteUser: 'Usuń użytkownika',
    // Recruiter
    allCvs: 'Wszystkie CV',
    browseCvs: 'Przeglądaj CV',
    author: 'Autor',
    // Common
    loading: 'Ładowanie...',
    error: 'Błąd',
    success: 'Sukces',
    cancel: 'Anuluj',
    confirm: 'Potwierdź',
    back: 'Powrót',
    logout: 'Wyloguj się',
    present: 'Obecnie',
    skillPlaceholder: 'np. JavaScript, React, Node.js',
    removed: 'Usunięto',
  },
  en: {
    heroTitle: 'Create professional CVs in minutes',
    heroSubtitle: 'CV creator with live preview, YAML export, and role management. A modern tool for professionals.',
    getStarted: 'Get Started',
    features: 'Features',
    featureCreator: 'CV Creator',
    featureCreatorDesc: 'Intuitive form that structures your data into a professional YAML format.',
    featurePreview: 'Live Preview',
    featurePreviewDesc: 'View your CV with applied CSS styles in real-time.',
    featureRoles: 'Role System',
    featureRolesDesc: 'User management with roles: Admin, Manager, Recruiter, User.',
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
    cancel: 'Cancel',
    confirm: 'Confirm',
    back: 'Back',
    logout: 'Log Out',
    present: 'Present',
    skillPlaceholder: 'e.g. JavaScript, React, Node.js',
    removed: 'Removed',
  },
  de: {
    heroTitle: 'Erstellen Sie professionelle Lebensläufe in Minuten',
    heroSubtitle: 'Lebenslauf-Ersteller mit Live-Vorschau, YAML-Export und Rollenverwaltung. Ein modernes Tool für Profis.',
    getStarted: 'Loslegen',
    features: 'Funktionen',
    featureCreator: 'Lebenslauf-Ersteller',
    featureCreatorDesc: 'Intuitives Formular, das Ihre Daten in ein professionelles YAML-Format strukturiert.',
    featurePreview: 'Live-Vorschau',
    featurePreviewDesc: 'Sehen Sie Ihren Lebenslauf mit angewandten CSS-Stilen in Echtzeit.',
    featureRoles: 'Rollensystem',
    featureRolesDesc: 'Benutzerverwaltung mit Rollen: Admin, Manager, Recruiter, Benutzer.',
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
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    back: 'Zurück',
    logout: 'Abmelden',
    present: 'Aktuell',
    skillPlaceholder: 'z.B. JavaScript, React, Node.js',
    removed: 'Entfernt',
  },
};

const languageNames = { pl: 'Polski', en: 'English', de: 'Deutsch' };

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
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('cvManagerToken', data.token);
      setToken(data.token);
      setUser(data.user);
      setView('dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (name, email, password) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      localStorage.setItem('cvManagerToken', data.token);
      setToken(data.token);
      setUser(data.user);
      setView('dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email, newPassword) => {
    setLoading(true);
    setError('');
    try {
      await apiCall('auth/reset-password', { method: 'POST', body: JSON.stringify({ email, newPassword }) });
      setSuccess(t.resetSuccess);
      setTimeout(() => { setView('login'); setSuccess(''); }, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cvManagerToken');
    setToken(null);
    setUser(null);
    setCvs([]);
    setView('landing');
  };

  const loadCvs = useCallback(async () => {
    try {
      const data = await apiCall('cv');
      setCvs(data.cvs || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (view === 'dashboard' && user) loadCvs();
  }, [view, user, loadCvs]);

  const handleSaveCv = async (title, cvData) => {
    setLoading(true);
    setError('');
    try {
      if (editCvId) {
        await apiCall(`cv/${editCvId}`, { method: 'PUT', body: JSON.stringify({ title, data: cvData }) });
      } else {
        await apiCall('cv', { method: 'POST', body: JSON.stringify({ title, data: cvData }) });
      }
      setEditCvId(null);
      setView('dashboard');
      loadCvs();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCv = async (id) => {
    try {
      await apiCall(`cv/${id}`, { method: 'DELETE' });
      loadCvs();
    } catch (e) {
      setError(e.message);
    }
  };

  const clearMessages = () => { setError(''); setSuccess(''); };

  // ======================== LANGUAGE SWITCHER ========================
  const LanguageSwitcher = () => (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-muted-foreground" />
      {Object.entries(languageNames).map(([key, name]) => (
        <button
          key={key}
          onClick={() => changeLang(key)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            lang === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {key.toUpperCase()}
        </button>
      ))}
    </div>
  );

  // ======================== NAVBAR ========================
  const Navbar = () => (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => user ? setView('dashboard') : setView('landing')}>
          <FileText className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">CV Manager</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user && (
            <>
              <Badge variant="outline" className="hidden sm:flex">
                <User className="h-3 w-3 mr-1" />
                {user.name}
              </Badge>
              <Badge variant="secondary" className="hidden sm:flex">{user.role}</Badge>
              {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                <Button variant="ghost" size="sm" onClick={() => setView('admin')}>
                  <Shield className="h-4 w-4" />
                </Button>
              )}
              {(user.role === 'ADMIN' || user.role === 'RECRUITER') && (
                <Button variant="ghost" size="sm" onClick={() => setView('recruiter')}>
                  <Users className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );

  // ======================== LANDING PAGE ========================
  const LandingPage = () => (
    <div className="min-h-screen">
      <Navbar />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">CV Manager 2025</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {t.heroTitle}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.heroSubtitle}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" onClick={() => setView('register')}>
                {t.getStarted}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => setView('login')}>
                {t.login}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">{t.features}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t.featureCreator}</CardTitle>
                <CardDescription>{t.featureCreatorDesc}</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t.featurePreview}</CardTitle>
                <CardDescription>{t.featurePreviewDesc}</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t.featureRoles}</CardTitle>
                <CardDescription>{t.featureRolesDesc}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Hero Image */}
      <section className="py-16">
        <div className="container">
          <div className="rounded-xl overflow-hidden shadow-2xl max-w-4xl mx-auto">
            <img
              src="https://images.unsplash.com/photo-1730382625230-3756013c515c?w=1200&h=600&fit=crop"
              alt="Career Building"
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2025 CV Manager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );

  // ======================== AUTH FORMS ========================
  const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container flex items-center justify-center py-20">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t.login}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{t.password}</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => { clearMessages(); handleLogin(email, password); }} disabled={loading}>
                {loading ? t.loading : t.login}
              </Button>
              <div className="text-center text-sm space-y-2">
                <button className="text-primary hover:underline" onClick={() => { clearMessages(); setView('reset-password'); }}>{t.forgotPassword}</button>
                <p className="text-muted-foreground">{t.noAccount}{' '}
                  <button className="text-primary hover:underline" onClick={() => { clearMessages(); setView('register'); }}>{t.register}</button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const RegisterForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container flex items-center justify-center py-20">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t.register}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
              <div className="space-y-2">
                <Label>{t.name}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{t.password}</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => { clearMessages(); handleRegister(name, email, password); }} disabled={loading}>
                {loading ? t.loading : t.register}
              </Button>
              <p className="text-center text-sm text-muted-foreground">{t.haveAccount}{' '}
                <button className="text-primary hover:underline" onClick={() => { clearMessages(); setView('login'); }}>{t.login}</button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const ResetPasswordForm = () => {
    const [email, setEmail] = useState('');
    const [newPwd, setNewPwd] = useState('');
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container flex items-center justify-center py-20">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t.resetPassword}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
              {success && <div className="p-3 bg-green-500/10 text-green-600 rounded-lg text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4" />{success}</div>}
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{t.newPassword}</Label>
                <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => { clearMessages(); handleResetPassword(email, newPwd); }} disabled={loading}>
                {loading ? t.loading : t.resetPassword}
              </Button>
              <p className="text-center text-sm">
                <button className="text-primary hover:underline" onClick={() => { clearMessages(); setView('login'); }}>{t.backToLogin}</button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ======================== DASHBOARD ========================
  const Dashboard = () => (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t.dashboard}</h1>
            <p className="text-muted-foreground">{t.myCvs} ({cvs.length})</p>
          </div>
          <Button onClick={() => { setEditCvId(null); setCurrentCv(null); setView('cv-creator'); }}>
            <Plus className="h-4 w-4 mr-2" />
            {t.createNew}
          </Button>
        </div>

        {error && <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

        {cvs.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">{t.noCvs}</p>
            <Button className="mt-4" onClick={() => { setEditCvId(null); setCurrentCv(null); setView('cv-creator'); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t.createNew}
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cvs.map(cv => (
              <Card key={cv.id} className="hover:shadow-lg transition-shadow group">
                <CardHeader className="pb-3">
                  {/* Mini preview */}
                  <div className="h-40 bg-white rounded-lg border mb-3 p-3 overflow-hidden text-xs relative">
                    <div className="font-bold text-sm text-gray-800">
                      {cv.data?.personalInfo?.firstName} {cv.data?.personalInfo?.lastName}
                    </div>
                    <div className="text-gray-500 text-[10px] mt-1">{cv.data?.personalInfo?.email}</div>
                    {cv.data?.personalInfo?.summary && (
                      <div className="text-gray-600 text-[10px] mt-2 line-clamp-2">{cv.data.personalInfo.summary}</div>
                    )}
                    {cv.data?.experience?.length > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold text-[10px] text-gray-700">{t.experience}</div>
                        {cv.data.experience.slice(0, 2).map((exp, i) => (
                          <div key={i} className="text-[9px] text-gray-500">{exp.position} - {exp.company}</div>
                        ))}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                  </div>
                  <CardTitle className="text-lg">{cv.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t.lastUpdated}: {new Date(cv.updatedAt).toLocaleDateString(lang === 'pl' ? 'pl-PL' : lang === 'de' ? 'de-DE' : 'en-US')}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setCurrentCv(cv); setView('cv-preview'); }}>
                    <Eye className="h-3 w-3 mr-1" />
                    {t.preview}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditCvId(cv.id);
                    setCurrentCv(cv);
                    setView('cv-creator');
                  }}>
                    <Edit className="h-3 w-3 mr-1" />
                    {t.edit}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteCv(cv.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>
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
      setFormData(prev => ({
        ...prev,
        experience: [...prev.experience, { company: '', position: '', startDate: '', endDate: '', description: '' }]
      }));
    };

    const updateExperience = (index, field, value) => {
      setFormData(prev => {
        const exp = [...prev.experience];
        exp[index] = { ...exp[index], [field]: value };
        return { ...prev, experience: exp };
      });
    };

    const removeExperience = (index) => {
      setFormData(prev => ({ ...prev, experience: prev.experience.filter((_, i) => i !== index) }));
    };

    const addEducation = () => {
      setFormData(prev => ({
        ...prev,
        education: [...prev.education, { school: '', degree: '', startDate: '', endDate: '' }]
      }));
    };

    const updateEducation = (index, field, value) => {
      setFormData(prev => {
        const edu = [...prev.education];
        edu[index] = { ...edu[index], [field]: value };
        return { ...prev, education: edu };
      });
    };

    const removeEducation = (index) => {
      setFormData(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }));
    };

    const addSkill = () => {
      if (newSkill.trim()) {
        setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
        setNewSkill('');
      }
    };

    const removeSkill = (index) => {
      setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
    };

    const addLanguage = () => {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, { language: '', level: '' }]
      }));
    };

    const updateLanguage = (index, field, value) => {
      setFormData(prev => {
        const langs = [...prev.languages];
        langs[index] = { ...langs[index], [field]: value };
        return { ...prev, languages: langs };
      });
    };

    const removeLanguage = (index) => {
      setFormData(prev => ({ ...prev, languages: prev.languages.filter((_, i) => i !== index) }));
    };

    const yamlOutput = yaml.dump(formData, { lineWidth: -1, noRefs: true });

    return (
      <div className="min-h-screen bg-muted/20">
        <Navbar />
        <div className="container py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => setView('dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <h1 className="text-3xl font-bold">{t.cvCreator}</h1>
          </div>

          {error && <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-6">
              {/* Title */}
              <Card>
                <CardContent className="pt-6">
                  <Label className="text-base font-semibold">{t.cvTitle}</Label>
                  <Input className="mt-2" value={title} onChange={e => setTitle(e.target.value)} placeholder="Moje CV 2025" />
                </CardContent>
              </Card>

              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t.personalInfo}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.firstName}</Label>
                      <Input value={formData.personalInfo.firstName} onChange={e => updatePersonalInfo('firstName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.lastName}</Label>
                      <Input value={formData.personalInfo.lastName} onChange={e => updatePersonalInfo('lastName', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.email}</Label>
                    <Input type="email" value={formData.personalInfo.email} onChange={e => updatePersonalInfo('email', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.phone}</Label>
                      <Input value={formData.personalInfo.phone} onChange={e => updatePersonalInfo('phone', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.address}</Label>
                      <Input value={formData.personalInfo.address} onChange={e => updatePersonalInfo('address', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.summary}</Label>
                    <Textarea rows={3} value={formData.personalInfo.summary} onChange={e => updatePersonalInfo('summary', e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {/* Experience */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    {t.experience}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.experience.map((exp, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                      <Button size="sm" variant="destructive" className="absolute top-2 right-2 h-7 w-7 p-0" onClick={() => removeExperience(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t.company}</Label>
                          <Input value={exp.company} onChange={e => updateExperience(index, 'company', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t.position}</Label>
                          <Input value={exp.position} onChange={e => updateExperience(index, 'position', e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t.startDate}</Label>
                          <Input type="date" value={exp.startDate} onChange={e => updateExperience(index, 'startDate', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t.endDate}</Label>
                          <Input type="date" value={exp.endDate} onChange={e => updateExperience(index, 'endDate', e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.description}</Label>
                        <Textarea rows={2} value={exp.description} onChange={e => updateExperience(index, 'description', e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={addExperience}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.addExperience}
                  </Button>
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    {t.education}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.education.map((edu, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                      <Button size="sm" variant="destructive" className="absolute top-2 right-2 h-7 w-7 p-0" onClick={() => removeEducation(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t.school}</Label>
                          <Input value={edu.school} onChange={e => updateEducation(index, 'school', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t.degree}</Label>
                          <Input value={edu.degree} onChange={e => updateEducation(index, 'degree', e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t.startDate}</Label>
                          <Input type="date" value={edu.startDate} onChange={e => updateEducation(index, 'startDate', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t.endDate}</Label>
                          <Input type="date" value={edu.endDate} onChange={e => updateEducation(index, 'endDate', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={addEducation}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.addEducation}
                  </Button>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    {t.skills}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="gap-1 pr-1">
                        {skill}
                        <button className="ml-1 hover:text-destructive" onClick={() => removeSkill(index)}>×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder={t.skillPlaceholder}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    />
                    <Button variant="outline" onClick={addSkill}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Languages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    {t.languages}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.languages.map((lng, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">{t.language}</Label>
                        <Input value={lng.language} onChange={e => updateLanguage(index, 'language', e.target.value)} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">{t.level}</Label>
                        <Input value={lng.level} onChange={e => updateLanguage(index, 'level', e.target.value)} placeholder="A1-C2" />
                      </div>
                      <Button size="sm" variant="destructive" className="h-9 w-9 p-0" onClick={() => removeLanguage(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={addLanguage}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.addLanguage}
                  </Button>
                </CardContent>
              </Card>

              {/* Save */}
              <Button size="lg" className="w-full" onClick={() => handleSaveCv(title, formData)} disabled={loading || !title.trim()}>
                {loading ? t.loading : t.save}
              </Button>
            </div>

            {/* Preview Panel */}
            <div className="space-y-6">
              <div className="flex gap-2">
                <Button variant={showYaml ? 'outline' : 'default'} onClick={() => setShowYaml(false)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t.cvPreview}
                </Button>
                <Button variant={showYaml ? 'default' : 'outline'} onClick={() => setShowYaml(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t.yamlPreview}
                </Button>
              </div>

              {showYaml ? (
                <Card>
                  <CardContent className="pt-6">
                    <ScrollArea className="h-[700px]">
                      <pre className="text-xs font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap">{yamlOutput}</pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <CvPreviewRender data={formData} />
              )}
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
      <Card className="shadow-xl">
        <CardContent className="p-0">
          <div className="bg-white text-black" style={{ fontFamily: 'Georgia, serif' }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-8">
              <h1 className="text-3xl font-bold">{pi.firstName} {pi.lastName}</h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-300">
                {pi.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{pi.email}</span>}
                {pi.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{pi.phone}</span>}
                {pi.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{pi.address}</span>}
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Summary */}
              {pi.summary && (
                <div>
                  <h2 className="text-lg font-bold text-slate-800 border-b-2 border-slate-300 pb-1 mb-3">{t.summary}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{pi.summary}</p>
                </div>
              )}

              {/* Experience */}
              {data.experience?.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-slate-800 border-b-2 border-slate-300 pb-1 mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {t.experience}
                  </h2>
                  <div className="space-y-4">
                    {data.experience.map((exp, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-slate-800">{exp.position}</h3>
                            <p className="text-sm text-primary">{exp.company}</p>
                          </div>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {exp.startDate} - {exp.endDate || t.present}
                          </span>
                        </div>
                        {exp.description && <p className="text-sm text-slate-600 mt-1">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {data.education?.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-slate-800 border-b-2 border-slate-300 pb-1 mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {t.education}
                  </h2>
                  <div className="space-y-3">
                    {data.education.map((edu, i) => (
                      <div key={i} className="flex justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-800">{edu.degree}</h3>
                          <p className="text-sm text-primary">{edu.school}</p>
                        </div>
                        <span className="text-xs text-slate-500">{edu.startDate} - {edu.endDate || t.present}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {data.skills?.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-slate-800 border-b-2 border-slate-300 pb-1 mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    {t.skills}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {data.languages?.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-slate-800 border-b-2 border-slate-300 pb-1 mb-3 flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    {t.languages}
                  </h2>
                  <div className="space-y-2">
                    {data.languages.map((lng, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-700">{lng.language}</span>
                        <Badge variant="outline">{lng.level}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ======================== CV PREVIEW PAGE ========================
  const CvPreviewPage = () => {
    const [showYaml, setShowYaml] = useState(false);
    if (!currentCv) return null;
    const yamlOutput = yaml.dump(currentCv.data, { lineWidth: -1, noRefs: true });
    return (
      <div className="min-h-screen bg-muted/20">
        <Navbar />
        <div className="container py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => setView('dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <h1 className="text-3xl font-bold">{currentCv.title}</h1>
            <div className="ml-auto flex gap-2">
              <Button variant={showYaml ? 'outline' : 'default'} size="sm" onClick={() => setShowYaml(false)}>
                <Eye className="h-4 w-4 mr-1" />
                {t.cvPreview}
              </Button>
              <Button variant={showYaml ? 'default' : 'outline'} size="sm" onClick={() => setShowYaml(true)}>
                <FileText className="h-4 w-4 mr-1" />
                {t.yamlPreview}
              </Button>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            {showYaml ? (
              <Card>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[700px]">
                    <pre className="text-xs font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap">{yamlOutput}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <CvPreviewRender data={currentCv.data} />
            )}
          </div>
        </div>
      </div>
    );
  };

  // ======================== ADMIN PANEL ========================
  const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
      apiCall('admin/users').then(data => {
        setUsers(data.users || []);
        setLoadingUsers(false);
      }).catch(e => {
        setError(e.message);
        setLoadingUsers(false);
      });
    }, []);

    const changeRole = async (userId, newRole) => {
      try {
        await apiCall(`admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } catch (e) {
        setError(e.message);
      }
    };

    const deleteUser = async (userId) => {
      try {
        await apiCall(`admin/users/${userId}`, { method: 'DELETE' });
        setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (e) {
        setError(e.message);
      }
    };

    const roleColors = {
      ADMIN: 'bg-red-100 text-red-800',
      MANAGER: 'bg-purple-100 text-purple-800',
      RECRUITER: 'bg-blue-100 text-blue-800',
      STANDARD_USER: 'bg-green-100 text-green-800',
    };

    return (
      <div className="min-h-screen bg-muted/20">
        <Navbar />
        <div className="container py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => setView('dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t.adminPanel}</h1>
              <p className="text-muted-foreground">{t.userManagement}</p>
            </div>
          </div>

          {error && <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

          {loadingUsers ? (
            <p>{t.loading}</p>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <Card key={u.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-sm text-muted-foreground">{u.email}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || ''}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.role === 'ADMIN' && u.id !== user.id && (
                        <Select value={u.role} onValueChange={(value) => changeRole(u.id, value)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="MANAGER">MANAGER</SelectItem>
                            <SelectItem value="RECRUITER">RECRUITER</SelectItem>
                            <SelectItem value="STANDARD_USER">STANDARD_USER</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {u.id !== user?.id && (
                        (user?.role === 'ADMIN' || (user?.role === 'MANAGER' && (u.role === 'RECRUITER' || u.role === 'STANDARD_USER'))) && (
                          <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id)}>
                            <Trash2 className="h-3 w-3 mr-1" />
                            {t.deleteUser}
                          </Button>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
      apiCall('recruiter/cvs').then(data => {
        setAllCvs(data.cvs || []);
        setLoadingCvs(false);
      }).catch(e => {
        setError(e.message);
        setLoadingCvs(false);
      });
    }, []);

    if (selectedCv) {
      return (
        <div className="min-h-screen bg-muted/20">
          <Navbar />
          <div className="container py-8">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" onClick={() => setSelectedCv(null)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.back}
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{selectedCv.title}</h1>
                <p className="text-muted-foreground">{t.author}: {selectedCv.userName} ({selectedCv.userEmail})</p>
              </div>
            </div>
            <div className="max-w-3xl mx-auto">
              <CvPreviewRender data={selectedCv.data} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-muted/20">
        <Navbar />
        <div className="container py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => setView('dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t.browseCvs}</h1>
              <p className="text-muted-foreground">{t.allCvs} ({allCvs.length})</p>
            </div>
          </div>

          {error && <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

          {loadingCvs ? (
            <p>{t.loading}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCvs.map(cv => (
                <Card key={cv.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedCv(cv)}>
                  <CardHeader className="pb-3">
                    <div className="h-32 bg-white rounded-lg border mb-3 p-3 overflow-hidden text-xs relative">
                      <div className="font-bold text-sm text-gray-800">
                        {cv.data?.personalInfo?.firstName} {cv.data?.personalInfo?.lastName}
                      </div>
                      <div className="text-gray-500 text-[10px] mt-1">{cv.data?.personalInfo?.email}</div>
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                    </div>
                    <CardTitle className="text-lg">{cv.title}</CardTitle>
                    <CardDescription>
                      {t.author}: {cv.userName} ({cv.userEmail})
                    </CardDescription>
                  </CardHeader>
                </Card>
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
