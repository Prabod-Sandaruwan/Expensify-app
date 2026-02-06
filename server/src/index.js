require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('./prismaClient');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.sub;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Auth
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'email already in use' });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hash } });
  res.json({ id: user.id, email: user.email, name: user.name });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'invalid credentials' });
  const token = jwt.sign({}, JWT_SECRET, { subject: String(user.id), expiresIn: '7d' });
  res.json({ token });
});

// Expenses
app.get('/expenses', authMiddleware, async (req, res) => {
  const expenses = await prisma.expense.findMany({ where: { userId: Number(req.userId) }, orderBy: { date: 'desc' } });
  res.json(expenses);
});

app.post('/expenses', authMiddleware, async (req, res) => {
  const { description, amount, date, category } = req.body;
  const exp = await prisma.expense.create({ data: { description, amount: Number(amount), date: new Date(date), category, user: { connect: { id: Number(req.userId) } } } });
  res.json(exp);
});

app.delete('/expenses/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.expense.deleteMany({ where: { id, userId: Number(req.userId) } });
  res.json({ ok: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log('Server listening on', port));
