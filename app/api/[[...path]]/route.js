import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'cv_manager';
const JWT_SECRET = 'cv_manager_secret_key_2025';
const ADMIN_EMAIL = 'sysdrummatic@gmail.com';

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(MONGO_URL);
  cachedClient = client;
  cachedDb = client.db(DB_NAME);
  return cachedDb;
}

function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function handleRequest(request, { params }) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams?.path || [];
  const method = request.method;
  const path = pathSegments.join('/');

  if (method === 'OPTIONS') {
    return NextResponse.json({}, { headers: corsHeaders() });
  }

  try {
    const db = await getDb();

    // AUTH ROUTES
    if (path === 'auth/register' && method === 'POST') {
      const body = await request.json();
      const { email, password, name } = body;
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Wszystkie pola są wymagane' }, { status: 400, headers: corsHeaders() });
      }
      const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json({ error: 'Użytkownik z tym emailem już istnieje' }, { status: 409, headers: corsHeaders() });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const role = email.toLowerCase() === ADMIN_EMAIL ? 'ADMIN' : 'STANDARD_USER';
      const user = {
        id: uuidv4(),
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        createdAt: new Date().toISOString(),
      };
      await db.collection('users').insertOne(user);
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return NextResponse.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { headers: corsHeaders() });
    }

    if (path === 'auth/login' && method === 'POST') {
      const body = await request.json();
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: 'Email i hasło są wymagane' }, { status: 400, headers: corsHeaders() });
      }
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json({ error: 'Nieprawidłowy email lub hasło' }, { status: 401, headers: corsHeaders() });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Nieprawidłowy email lub hasło' }, { status: 401, headers: corsHeaders() });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return NextResponse.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { headers: corsHeaders() });
    }

    if (path === 'auth/reset-password' && method === 'POST') {
      const body = await request.json();
      const { email, newPassword } = body;
      if (!email || !newPassword) {
        return NextResponse.json({ error: 'Email i nowe hasło są wymagane' }, { status: 400, headers: corsHeaders() });
      }
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json({ error: 'Użytkownik nie znaleziony' }, { status: 404, headers: corsHeaders() });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.collection('users').updateOne({ email: email.toLowerCase() }, { $set: { password: hashedPassword } });
      return NextResponse.json({ message: 'Hasło zostało zmienione' }, { headers: corsHeaders() });
    }

    if (path === 'auth/me' && method === 'GET') {
      const decoded = verifyToken(request);
      if (!decoded) {
        return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401, headers: corsHeaders() });
      }
      const user = await db.collection('users').findOne({ id: decoded.id });
      if (!user) {
        return NextResponse.json({ error: 'Użytkownik nie znaleziony' }, { status: 404, headers: corsHeaders() });
      }
      return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { headers: corsHeaders() });
    }

    // CV ROUTES
    if (path === 'cv' && method === 'GET') {
      const decoded = verifyToken(request);
      if (!decoded) {
        return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401, headers: corsHeaders() });
      }
      const cvs = await db.collection('cvs').find({ userId: decoded.id }).sort({ updatedAt: -1 }).toArray();
      return NextResponse.json({ cvs }, { headers: corsHeaders() });
    }

    if (path === 'cv' && method === 'POST') {
      const decoded = verifyToken(request);
      if (!decoded) {
        return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401, headers: corsHeaders() });
      }
      const body = await request.json();
      const { title, data } = body;
      if (!title || !data) {
        return NextResponse.json({ error: 'Tytuł i dane CV są wymagane' }, { status: 400, headers: corsHeaders() });
      }
      const cv = {
        id: uuidv4(),
        userId: decoded.id,
        userEmail: decoded.email,
        title,
        data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('cvs').insertOne(cv);
      return NextResponse.json({ cv }, { status: 201, headers: corsHeaders() });
    }

    // CV by ID routes
    if (pathSegments[0] === 'cv' && pathSegments.length === 2) {
      const cvId = pathSegments[1];
      const decoded = verifyToken(request);
      if (!decoded) {
        return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401, headers: corsHeaders() });
      }

      if (method === 'GET') {
        const cv = await db.collection('cvs').findOne({ id: cvId });
        if (!cv) {
          return NextResponse.json({ error: 'CV nie znalezione' }, { status: 404, headers: corsHeaders() });
        }
        if (cv.userId !== decoded.id && decoded.role !== 'ADMIN' && decoded.role !== 'RECRUITER') {
          return NextResponse.json({ error: 'Brak dostępu' }, { status: 403, headers: corsHeaders() });
        }
        return NextResponse.json({ cv }, { headers: corsHeaders() });
      }

      if (method === 'PUT') {
        const body = await request.json();
        const { title, data } = body;
        const cv = await db.collection('cvs').findOne({ id: cvId });
        if (!cv) {
          return NextResponse.json({ error: 'CV nie znalezione' }, { status: 404, headers: corsHeaders() });
        }
        if (cv.userId !== decoded.id) {
          return NextResponse.json({ error: 'Brak dostępu' }, { status: 403, headers: corsHeaders() });
        }
        const updateData = { updatedAt: new Date().toISOString() };
        if (title) updateData.title = title;
        if (data) updateData.data = data;
        await db.collection('cvs').updateOne({ id: cvId }, { $set: updateData });
        const updatedCv = await db.collection('cvs').findOne({ id: cvId });
        return NextResponse.json({ cv: updatedCv }, { headers: corsHeaders() });
      }

      if (method === 'DELETE') {
        const cv = await db.collection('cvs').findOne({ id: cvId });
        if (!cv) {
          return NextResponse.json({ error: 'CV nie znalezione' }, { status: 404, headers: corsHeaders() });
        }
        if (cv.userId !== decoded.id && decoded.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Brak dostępu' }, { status: 403, headers: corsHeaders() });
        }
        await db.collection('cvs').deleteOne({ id: cvId });
        return NextResponse.json({ message: 'CV usunięte' }, { headers: corsHeaders() });
      }
    }

    // ADMIN ROUTES
    if (path === 'admin/users' && method === 'GET') {
      const decoded = verifyToken(request);
      if (!decoded) {
        return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401, headers: corsHeaders() });
      }
      if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403, headers: corsHeaders() });
      }
      const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
      return NextResponse.json({ users }, { headers: corsHeaders() });
    }

    // Update user role
    if (pathSegments[0] === 'admin' && pathSegments[1] === 'users' && pathSegments.length === 4 && pathSegments[3] === 'role' && method === 'PUT') {
      const userId = pathSegments[2];
      const decoded = verifyToken(request);
      if (!decoded) {
        return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401, headers: corsHeaders() });
      }
      if (decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Tylko admin może zmieniać role' }, { status: 403, headers: corsHeaders() });
      }
      const body = await request.json();
      const { role } = body;
      const validRoles = ['ADMIN', 'MANAGER', 'RECRUITER', 'STANDARD_USER'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Nieprawidłowa rola' }, { status: 400, headers: corsHeaders() });
      }
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) {
        return NextResponse.json({ error: 'Użytkownik nie znaleziony' }, { status: 404, headers: corsHeaders() });
      }
      await db.collection('users').updateOne({ id: userId }, { $set: { role } });
      return NextResponse.json({ message: 'Rola zaktualizowana', user: { id: user.id, email: user.email, name: user.name, role } }, { headers: corsHeaders() });
    }

    // Delete user (admin can delete all, manager can delete RECRUITER and STANDARD_USER)
    if (pathSegments[0] === 'admin' && pathSegments[1] === 'users' && pathSegments.length === 3 && method === 'DELETE') {
      const userId = pathSegments[2];
      const decoded = verifyToken(request);
      if (!decoded) {
        return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401, headers: corsHeaders() });
      }
      if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403, headers: corsHeaders() });
      }
      const targetUser = await db.collection('users').findOne({ id: userId });
      if (!targetUser) {
        return NextResponse.json({ error: 'Użytkownik nie znaleziony' }, { status: 404, headers: corsHeaders() });
      }
      // Manager can only delete RECRUITER and STANDARD_USER
      if (decoded.role === 'MANAGER' && (targetUser.role === 'ADMIN' || targetUser.role === 'MANAGER')) {
        return NextResponse.json({ error: 'Manager nie może usuwać adminów i managerów' }, { status: 403, headers: corsHeaders() });
      }
      // Cannot delete yourself
      if (decoded.id === userId) {
        return NextResponse.json({ error: 'Nie możesz usunąć swojego konta' }, { status: 400, headers: corsHeaders() });
      }
      await db.collection('cvs').deleteMany({ userId });
      await db.collection('users').deleteOne({ id: userId });
      return NextResponse.json({ message: 'Użytkownik usunięty' }, { headers: corsHeaders() });
    }

    // RECRUITER ROUTES - browse all CVs
    if (path === 'recruiter/cvs' && method === 'GET') {
      const decoded = verifyToken(request);
      if (!decoded) {
        return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401, headers: corsHeaders() });
      }
      if (decoded.role !== 'ADMIN' && decoded.role !== 'RECRUITER') {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403, headers: corsHeaders() });
      }
      const cvs = await db.collection('cvs').find({}).sort({ updatedAt: -1 }).toArray();
      // Enrich with user names
      const userIds = [...new Set(cvs.map(cv => cv.userId))];
      const users = await db.collection('users').find({ id: { $in: userIds } }, { projection: { password: 0 } }).toArray();
      const userMap = {};
      users.forEach(u => { userMap[u.id] = u; });
      const enrichedCvs = cvs.map(cv => ({
        ...cv,
        userName: userMap[cv.userId]?.name || 'Nieznany',
        userEmail: userMap[cv.userId]?.email || cv.userEmail || 'Nieznany',
      }));
      return NextResponse.json({ cvs: enrichedCvs }, { headers: corsHeaders() });
    }

    // Health check
    if (path === 'health' && method === 'GET') {
      return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { headers: corsHeaders() });
    }

    return NextResponse.json({ error: 'Nie znaleziono endpointu' }, { status: 404, headers: corsHeaders() });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Błąd serwera: ' + error.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function GET(request, context) {
  return handleRequest(request, context);
}

export async function POST(request, context) {
  return handleRequest(request, context);
}

export async function PUT(request, context) {
  return handleRequest(request, context);
}

export async function DELETE(request, context) {
  return handleRequest(request, context);
}

export async function OPTIONS(request, context) {
  return handleRequest(request, context);
}
