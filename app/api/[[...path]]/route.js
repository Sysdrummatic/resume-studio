import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { isSupabaseConfigured, getSupabaseClient, getSupabaseAdmin } from '@/lib/supabase';

// ==================== CONFIG ====================
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'cv_manager';
const JWT_SECRET = 'cv_manager_secret_key_2025';
const ADMIN_EMAIL = 'sysdrummatic@gmail.com';

// ==================== MONGODB ====================
let cachedDb = null;
async function getDb() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(MONGO_URL);
  cachedDb = client.db(DB_NAME);
  return cachedDb;
}

// ==================== HELPERS ====================
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function ok(data, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: corsHeaders() });
}

// ==================== VERIFY TOKEN ====================
// Works for both MongoDB JWT and Supabase JWT
async function verifyToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];

  if (isSupabaseConfigured()) {
    // Supabase mode: verify via supabase.auth.getUser
    try {
      const supabase = getSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return null;
      // Get profile from profiles table
      const admin = getSupabaseAdmin();
      const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single();
      return {
        id: user.id,
        email: user.email,
        role: profile?.role || 'STANDARD_USER',
        name: profile?.name || user.email,
        supabaseToken: token,
      };
    } catch { return null; }
  } else {
    // MongoDB mode: verify custom JWT
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch { return null; }
  }
}

// ====================================================================
//                       SUPABASE HANDLERS
// ====================================================================
const supabaseHandlers = {
  // ---- AUTH ----
  async register(body) {
    const { email, password, name } = body;
    if (!email || !password || !name) return err('Wszystkie pola są wymagane');

    const admin = getSupabaseAdmin();

    // Check if user exists
    const { data: existingUsers } = await admin.from('profiles').select('id').eq('email', email.toLowerCase()).limit(1);
    if (existingUsers && existingUsers.length > 0) return err('Użytkownik z tym emailem już istnieje', 409);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
    });
    if (authError) return err(authError.message);

    // Determine role
    const role = email.toLowerCase() === ADMIN_EMAIL ? 'ADMIN' : 'STANDARD_USER';

    // Create profile
    const { error: profileError } = await admin.from('profiles').insert({
      id: authData.user.id,
      email: email.toLowerCase(),
      name,
      role,
      created_at: new Date().toISOString(),
    });
    if (profileError) return err(profileError.message);

    // Sign in to get token
    const supabase = getSupabaseClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    if (signInError) return err(signInError.message);

    return ok({
      token: signInData.session.access_token,
      user: { id: authData.user.id, email: email.toLowerCase(), name, role },
    });
  },

  async login(body) {
    const { email, password } = body;
    if (!email || !password) return err('Email i hasło są wymagane');

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    if (error) return err('Nieprawidłowy email lub hasło', 401);

    // Get profile
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin.from('profiles').select('*').eq('id', data.user.id).single();

    return ok({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.email,
        role: profile?.role || 'STANDARD_USER',
      },
    });
  },

  async resetPassword(body) {
    const { email, newPassword } = body;
    if (!email || !newPassword) return err('Email i nowe hasło są wymagane');

    const admin = getSupabaseAdmin();

    // Find user by email
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
    if (listError) return err(listError.message);
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) return err('Użytkownik nie znaleziony', 404);

    // Update password
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) return err(error.message);

    return ok({ message: 'Hasło zostało zmienione' });
  },

  async me(decoded) {
    return ok({
      user: { id: decoded.id, email: decoded.email, name: decoded.name, role: decoded.role },
    });
  },

  // ---- CV CRUD ----
  async getCvs(decoded) {
    const admin = getSupabaseAdmin();
    const { data: cvs, error } = await admin
      .from('cvs')
      .select('*')
      .eq('user_id', decoded.id)
      .order('updated_at', { ascending: false });
    if (error) return err(error.message);
    // Map snake_case to camelCase for frontend compatibility
    const mapped = (cvs || []).map(cv => ({
      id: cv.id,
      userId: cv.user_id,
      userEmail: cv.user_email,
      title: cv.title,
      data: cv.data,
      createdAt: cv.created_at,
      updatedAt: cv.updated_at,
    }));
    return ok({ cvs: mapped });
  },

  async createCv(decoded, body) {
    const { title, data } = body;
    if (!title || !data) return err('Tytuł i dane CV są wymagane');

    const admin = getSupabaseAdmin();
    const id = uuidv4();
    const now = new Date().toISOString();
    const { error } = await admin.from('cvs').insert({
      id,
      user_id: decoded.id,
      user_email: decoded.email,
      title,
      data,
      created_at: now,
      updated_at: now,
    });
    if (error) return err(error.message);

    return ok({
      cv: { id, userId: decoded.id, userEmail: decoded.email, title, data, createdAt: now, updatedAt: now },
    }, 201);
  },

  async getCv(decoded, cvId) {
    const admin = getSupabaseAdmin();
    const { data: cv, error } = await admin.from('cvs').select('*').eq('id', cvId).single();
    if (error || !cv) return err('CV nie znalezione', 404);
    if (cv.user_id !== decoded.id && decoded.role !== 'ADMIN' && decoded.role !== 'RECRUITER') {
      return err('Brak dostępu', 403);
    }
    return ok({
      cv: { id: cv.id, userId: cv.user_id, userEmail: cv.user_email, title: cv.title, data: cv.data, createdAt: cv.created_at, updatedAt: cv.updated_at },
    });
  },

  async updateCv(decoded, cvId, body) {
    const admin = getSupabaseAdmin();
    const { data: cv, error: findErr } = await admin.from('cvs').select('*').eq('id', cvId).single();
    if (findErr || !cv) return err('CV nie znalezione', 404);
    if (cv.user_id !== decoded.id) return err('Brak dostępu', 403);

    const updateData = { updated_at: new Date().toISOString() };
    if (body.title) updateData.title = body.title;
    if (body.data) updateData.data = body.data;

    const { error } = await admin.from('cvs').update(updateData).eq('id', cvId);
    if (error) return err(error.message);

    const { data: updated } = await admin.from('cvs').select('*').eq('id', cvId).single();
    return ok({
      cv: { id: updated.id, userId: updated.user_id, title: updated.title, data: updated.data, createdAt: updated.created_at, updatedAt: updated.updated_at },
    });
  },

  async deleteCv(decoded, cvId) {
    const admin = getSupabaseAdmin();
    const { data: cv, error: findErr } = await admin.from('cvs').select('*').eq('id', cvId).single();
    if (findErr || !cv) return err('CV nie znalezione', 404);
    if (cv.user_id !== decoded.id && decoded.role !== 'ADMIN') return err('Brak dostępu', 403);

    const { error } = await admin.from('cvs').delete().eq('id', cvId);
    if (error) return err(error.message);
    return ok({ message: 'CV usunięte' });
  },

  // ---- ADMIN ----
  async getUsers(decoded) {
    if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') return err('Brak uprawnień', 403);
    const admin = getSupabaseAdmin();
    const { data: users, error } = await admin.from('profiles').select('*');
    if (error) return err(error.message);
    return ok({ users: users || [] });
  },

  async updateRole(decoded, userId, body) {
    if (decoded.role !== 'ADMIN') return err('Tylko admin może zmieniać role', 403);
    const { role } = body;
    const validRoles = ['ADMIN', 'MANAGER', 'RECRUITER', 'STANDARD_USER'];
    if (!validRoles.includes(role)) return err('Nieprawidłowa rola');

    const admin = getSupabaseAdmin();
    const { data: user, error: findErr } = await admin.from('profiles').select('*').eq('id', userId).single();
    if (findErr || !user) return err('Użytkownik nie znaleziony', 404);

    const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
    if (error) return err(error.message);

    return ok({ message: 'Rola zaktualizowana', user: { ...user, role } });
  },

  async deleteUser(decoded, userId) {
    if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') return err('Brak uprawnień', 403);
    if (decoded.id === userId) return err('Nie możesz usunąć swojego konta');

    const admin = getSupabaseAdmin();
    const { data: target, error: findErr } = await admin.from('profiles').select('*').eq('id', userId).single();
    if (findErr || !target) return err('Użytkownik nie znaleziony', 404);

    if (decoded.role === 'MANAGER' && (target.role === 'ADMIN' || target.role === 'MANAGER')) {
      return err('Manager nie może usuwać adminów i managerów', 403);
    }

    // Delete CVs and profile
    await admin.from('cvs').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('id', userId);
    // Delete from Supabase Auth
    await admin.auth.admin.deleteUser(userId);

    return ok({ message: 'Użytkownik usunięty' });
  },

  // ---- RECRUITER ----
  async recruiterCvs(decoded) {
    if (decoded.role !== 'ADMIN' && decoded.role !== 'RECRUITER') return err('Brak uprawnień', 403);
    const admin = getSupabaseAdmin();
    const { data: cvs, error } = await admin.from('cvs').select('*').order('updated_at', { ascending: false });
    if (error) return err(error.message);

    const userIds = [...new Set((cvs || []).map(cv => cv.user_id))];
    const { data: profiles } = await admin.from('profiles').select('*').in('id', userIds);
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const enriched = (cvs || []).map(cv => ({
      id: cv.id,
      userId: cv.user_id,
      userEmail: profileMap[cv.user_id]?.email || cv.user_email || 'Nieznany',
      userName: profileMap[cv.user_id]?.name || 'Nieznany',
      title: cv.title,
      data: cv.data,
      createdAt: cv.created_at,
      updatedAt: cv.updated_at,
    }));
    return ok({ cvs: enriched });
  },
};

// ====================================================================
//                       MONGODB HANDLERS
// ====================================================================
const mongoHandlers = {
  async register(body) {
    const { email, password, name } = body;
    if (!email || !password || !name) return err('Wszystkie pola są wymagane');
    const db = await getDb();
    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing) return err('Użytkownik z tym emailem już istnieje', 409);
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = email.toLowerCase() === ADMIN_EMAIL ? 'ADMIN' : 'STANDARD_USER';
    const user = { id: uuidv4(), email: email.toLowerCase(), password: hashedPassword, name, role, createdAt: new Date().toISOString() };
    await db.collection('users').insertOne(user);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return ok({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  },

  async login(body) {
    const { email, password } = body;
    if (!email || !password) return err('Email i hasło są wymagane');
    const db = await getDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) return err('Nieprawidłowy email lub hasło', 401);
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return err('Nieprawidłowy email lub hasło', 401);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return ok({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  },

  async resetPassword(body) {
    const { email, newPassword } = body;
    if (!email || !newPassword) return err('Email i nowe hasło są wymagane');
    const db = await getDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) return err('Użytkownik nie znaleziony', 404);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne({ email: email.toLowerCase() }, { $set: { password: hashedPassword } });
    return ok({ message: 'Hasło zostało zmienione' });
  },

  async me(decoded) {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: decoded.id });
    if (!user) return err('Użytkownik nie znaleziony', 404);
    return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  },

  async getCvs(decoded) {
    const db = await getDb();
    const cvs = await db.collection('cvs').find({ userId: decoded.id }).sort({ updatedAt: -1 }).toArray();
    return ok({ cvs });
  },

  async createCv(decoded, body) {
    const { title, data } = body;
    if (!title || !data) return err('Tytuł i dane CV są wymagane');
    const db = await getDb();
    const cv = { id: uuidv4(), userId: decoded.id, userEmail: decoded.email, title, data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await db.collection('cvs').insertOne(cv);
    return ok({ cv }, 201);
  },

  async getCv(decoded, cvId) {
    const db = await getDb();
    const cv = await db.collection('cvs').findOne({ id: cvId });
    if (!cv) return err('CV nie znalezione', 404);
    if (cv.userId !== decoded.id && decoded.role !== 'ADMIN' && decoded.role !== 'RECRUITER') return err('Brak dostępu', 403);
    return ok({ cv });
  },

  async updateCv(decoded, cvId, body) {
    const db = await getDb();
    const cv = await db.collection('cvs').findOne({ id: cvId });
    if (!cv) return err('CV nie znalezione', 404);
    if (cv.userId !== decoded.id) return err('Brak dostępu', 403);
    const updateData = { updatedAt: new Date().toISOString() };
    if (body.title) updateData.title = body.title;
    if (body.data) updateData.data = body.data;
    await db.collection('cvs').updateOne({ id: cvId }, { $set: updateData });
    const updated = await db.collection('cvs').findOne({ id: cvId });
    return ok({ cv: updated });
  },

  async deleteCv(decoded, cvId) {
    const db = await getDb();
    const cv = await db.collection('cvs').findOne({ id: cvId });
    if (!cv) return err('CV nie znalezione', 404);
    if (cv.userId !== decoded.id && decoded.role !== 'ADMIN') return err('Brak dostępu', 403);
    await db.collection('cvs').deleteOne({ id: cvId });
    return ok({ message: 'CV usunięte' });
  },

  async getUsers(decoded) {
    if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') return err('Brak uprawnień', 403);
    const db = await getDb();
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    return ok({ users });
  },

  async updateRole(decoded, userId, body) {
    if (decoded.role !== 'ADMIN') return err('Tylko admin może zmieniać role', 403);
    const { role } = body;
    const validRoles = ['ADMIN', 'MANAGER', 'RECRUITER', 'STANDARD_USER'];
    if (!validRoles.includes(role)) return err('Nieprawidłowa rola');
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) return err('Użytkownik nie znaleziony', 404);
    await db.collection('users').updateOne({ id: userId }, { $set: { role } });
    return ok({ message: 'Rola zaktualizowana', user: { id: user.id, email: user.email, name: user.name, role } });
  },

  async deleteUser(decoded, userId) {
    if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') return err('Brak uprawnień', 403);
    if (decoded.id === userId) return err('Nie możesz usunąć swojego konta');
    const db = await getDb();
    const target = await db.collection('users').findOne({ id: userId });
    if (!target) return err('Użytkownik nie znaleziony', 404);
    if (decoded.role === 'MANAGER' && (target.role === 'ADMIN' || target.role === 'MANAGER')) {
      return err('Manager nie może usuwać adminów i managerów', 403);
    }
    await db.collection('cvs').deleteMany({ userId });
    await db.collection('users').deleteOne({ id: userId });
    return ok({ message: 'Użytkownik usunięty' });
  },

  async recruiterCvs(decoded) {
    if (decoded.role !== 'ADMIN' && decoded.role !== 'RECRUITER') return err('Brak uprawnień', 403);
    const db = await getDb();
    const cvs = await db.collection('cvs').find({}).sort({ updatedAt: -1 }).toArray();
    const userIds = [...new Set(cvs.map(cv => cv.userId))];
    const users = await db.collection('users').find({ id: { $in: userIds } }, { projection: { password: 0 } }).toArray();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const enriched = cvs.map(cv => ({
      ...cv,
      userName: userMap[cv.userId]?.name || 'Nieznany',
      userEmail: userMap[cv.userId]?.email || cv.userEmail || 'Nieznany',
    }));
    return ok({ cvs: enriched });
  },
};

// ====================================================================
//                       ROUTER
// ====================================================================
async function handleRequest(request, { params }) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams?.path || [];
  const method = request.method;
  const path = pathSegments.join('/');

  if (method === 'OPTIONS') return ok({});

  const useSupabase = isSupabaseConfigured();
  const handlers = useSupabase ? supabaseHandlers : mongoHandlers;

  try {
    // ---- AUTH (no token needed) ----
    if (path === 'auth/register' && method === 'POST') {
      return await handlers.register(await request.json());
    }
    if (path === 'auth/login' && method === 'POST') {
      return await handlers.login(await request.json());
    }
    if (path === 'auth/reset-password' && method === 'POST') {
      return await handlers.resetPassword(await request.json());
    }

    // ---- TOKEN REQUIRED ----
    const decoded = await verifyToken(request);
    if (path === 'auth/me' && method === 'GET') {
      if (!decoded) return err('Brak autoryzacji', 401);
      return await handlers.me(decoded);
    }

    // ---- CV ----
    if (path === 'cv' && method === 'GET') {
      if (!decoded) return err('Brak autoryzacji', 401);
      return await handlers.getCvs(decoded);
    }
    if (path === 'cv' && method === 'POST') {
      if (!decoded) return err('Brak autoryzacji', 401);
      return await handlers.createCv(decoded, await request.json());
    }
    if (pathSegments[0] === 'cv' && pathSegments.length === 2) {
      if (!decoded) return err('Brak autoryzacji', 401);
      const cvId = pathSegments[1];
      if (method === 'GET') return await handlers.getCv(decoded, cvId);
      if (method === 'PUT') return await handlers.updateCv(decoded, cvId, await request.json());
      if (method === 'DELETE') return await handlers.deleteCv(decoded, cvId);
    }

    // ---- ADMIN ----
    if (path === 'admin/users' && method === 'GET') {
      if (!decoded) return err('Brak autoryzacji', 401);
      return await handlers.getUsers(decoded);
    }
    if (pathSegments[0] === 'admin' && pathSegments[1] === 'users' && pathSegments.length === 4 && pathSegments[3] === 'role' && method === 'PUT') {
      if (!decoded) return err('Brak autoryzacji', 401);
      return await handlers.updateRole(decoded, pathSegments[2], await request.json());
    }
    if (pathSegments[0] === 'admin' && pathSegments[1] === 'users' && pathSegments.length === 3 && method === 'DELETE') {
      if (!decoded) return err('Brak autoryzacji', 401);
      return await handlers.deleteUser(decoded, pathSegments[2]);
    }

    // ---- RECRUITER ----
    if (path === 'recruiter/cvs' && method === 'GET') {
      if (!decoded) return err('Brak autoryzacji', 401);
      return await handlers.recruiterCvs(decoded);
    }

    // ---- HEALTH ----
    if (path === 'health' && method === 'GET') {
      return ok({
        status: 'ok',
        mode: useSupabase ? 'supabase' : 'mongodb',
        timestamp: new Date().toISOString(),
      });
    }

    return err('Nie znaleziono endpointu', 404);
  } catch (error) {
    console.error('API Error:', error);
    return err('Błąd serwera: ' + error.message, 500);
  }
}

export async function GET(request, context) { return handleRequest(request, context); }
export async function POST(request, context) { return handleRequest(request, context); }
export async function PUT(request, context) { return handleRequest(request, context); }
export async function DELETE(request, context) { return handleRequest(request, context); }
export async function OPTIONS(request, context) { return handleRequest(request, context); }
