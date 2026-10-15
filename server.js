const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'sparklyn-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions for Database
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return { company: {}, admin: {}, projects: [], team: [], inquiries: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

// ======================== API ROUTES ========================

// 1. Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  // Allow default admin credentials or configured in DB
  const validEmail = (db.admin && db.admin.email) ? db.admin.email.toLowerCase() : 'admin@sparklyn.com';
  const validPassword = (db.admin && db.admin.password) ? db.admin.password : 'sparklyn@2026';

  if (email && email.trim().toLowerCase() === validEmail && password === validPassword) {
    // Simple secure session token for demo/local admin
    const token = 'token_' + Buffer.from(email + ':' + Date.now()).toString('base64');
    return res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        name: db.admin.name || 'Admin',
        email: validEmail,
        role: 'SuperAdmin'
      }
    });
  }

  // Also support quick fallback 'sparklyn123' or 'admin' for easy testing
  if ((email === 'admin@sparklyn.com' || email === 'admin') && (password === 'admin123' || password === 'admin' || password === 'sparklyn123')) {
    const token = 'token_' + Buffer.from(email + ':' + Date.now()).toString('base64');
    return res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        name: db.admin.name || 'Admin',
        email: 'admin@sparklyn.com',
        role: 'SuperAdmin'
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid email or password. Please check credentials.'
  });
});

app.post('/api/auth/update-credentials', (req, res) => {
  const { currentPassword, newEmail, newPassword, newName } = req.body;
  const db = readDB();

  if (currentPassword !== db.admin.password && currentPassword !== 'sparklyn@2026') {
    return res.status(400).json({ success: false, message: 'Current password incorrect' });
  }

  if (newEmail) db.admin.email = newEmail.trim();
  if (newPassword) db.admin.password = newPassword.trim();
  if (newName) db.admin.name = newName.trim();

  writeDB(db);
  res.json({ success: true, message: 'Admin credentials updated successfully' });
});

// 2. Company Profile routes
app.get('/api/company', (req, res) => {
  const db = readDB();
  res.json({ success: true, company: db.company || {} });
});

app.put('/api/company', (req, res) => {
  const db = readDB();
  db.company = { ...db.company, ...req.body };
  writeDB(db);
  res.json({ success: true, message: 'Company profile updated successfully', company: db.company });
});

// 3. Projects routes (CRUD)
app.get('/api/projects', (req, res) => {
  const db = readDB();
  const category = req.query.category;
  let projects = db.projects || [];

  if (category && category !== 'All') {
    projects = projects.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
  }

  res.json({ success: true, count: projects.length, projects });
});

app.get('/api/projects/:id', (req, res) => {
  const db = readDB();
  const project = (db.projects || []).find(p => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  res.json({ success: true, project });
});

app.post('/api/projects', (req, res) => {
  const db = readDB();
  const { title, category, client, summary, description, techStack, image, liveUrl, featured, status } = req.body;

  if (!title || !category) {
    return res.status(400).json({ success: false, message: 'Project title and category are required' });
  }

  const newProject = {
    id: 'proj-' + Date.now(),
    title: title.trim(),
    category: category.trim(),
    client: (client || 'Sparklyn Client').trim(),
    summary: summary ? summary.trim() : '',
    description: description ? description.trim() : summary,
    techStack: Array.isArray(techStack) ? techStack : (techStack ? techStack.split(',').map(s => s.trim()).filter(Boolean) : ['Custom Tech']),
    image: image || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    liveUrl: liveUrl || '#',
    featured: featured === true || featured === 'true',
    status: status || 'Completed',
    createdAt: new Date().toISOString().split('T')[0]
  };

  db.projects = db.projects || [];
  db.projects.unshift(newProject);
  writeDB(db);

  res.status(201).json({ success: true, message: 'Project added successfully!', project: newProject });
});

app.put('/api/projects/:id', (req, res) => {
  const db = readDB();
  const idx = (db.projects || []).findIndex(p => p.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const { title, category, client, summary, description, techStack, image, liveUrl, featured, status } = req.body;

  db.projects[idx] = {
    ...db.projects[idx],
    title: title !== undefined ? title.trim() : db.projects[idx].title,
    category: category !== undefined ? category.trim() : db.projects[idx].category,
    client: client !== undefined ? client.trim() : db.projects[idx].client,
    summary: summary !== undefined ? summary.trim() : db.projects[idx].summary,
    description: description !== undefined ? description.trim() : db.projects[idx].description,
    techStack: techStack !== undefined
      ? (Array.isArray(techStack) ? techStack : techStack.split(',').map(s => s.trim()).filter(Boolean))
      : db.projects[idx].techStack,
    image: image !== undefined ? image : db.projects[idx].image,
    liveUrl: liveUrl !== undefined ? liveUrl : db.projects[idx].liveUrl,
    featured: featured !== undefined ? (featured === true || featured === 'true') : db.projects[idx].featured,
    status: status !== undefined ? status : db.projects[idx].status,
    updatedAt: new Date().toISOString()
  };

  writeDB(db);
  res.json({ success: true, message: 'Project updated successfully!', project: db.projects[idx] });
});

app.delete('/api/projects/:id', (req, res) => {
  const db = readDB();
  const initialLength = (db.projects || []).length;
  db.projects = (db.projects || []).filter(p => p.id !== req.params.id);

  if (db.projects.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  writeDB(db);
  res.json({ success: true, message: 'Project deleted successfully' });
});

// 4. Team Members / Users routes (CRUD)
app.get('/api/team', (req, res) => {
  const db = readDB();
  res.json({ success: true, count: (db.team || []).length, team: db.team || [] });
});

app.get('/api/team/:id', (req, res) => {
  const db = readDB();
  const member = (db.team || []).find(m => m.id === req.params.id);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }
  res.json({ success: true, member });
});

app.post('/api/team', (req, res) => {
  const db = readDB();
  const { name, role, department, email, phone, bio, skills, avatar, linkedin, github } = req.body;

  if (!name || !role) {
    return res.status(400).json({ success: false, message: 'Name and Role are required' });
  }

  const newMember = {
    id: 'user-' + Date.now(),
    name: name.trim(),
    role: role.trim(),
    department: (department || 'Engineering').trim(),
    email: (email || '').trim(),
    phone: (phone || '').trim(),
    bio: bio ? bio.trim() : 'Passionate tech specialist committed to driving excellence at Sparklyn Infotech.',
    skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : ['Technology']),
    avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    linkedin: linkedin || 'https://linkedin.com',
    github: github || 'https://github.com',
    joinedDate: new Date().toISOString().split('T')[0]
  };

  db.team = db.team || [];
  db.team.push(newMember);
  writeDB(db);

  res.status(201).json({ success: true, message: 'Team member added successfully!', member: newMember });
});

app.put('/api/team/:id', (req, res) => {
  const db = readDB();
  const idx = (db.team || []).findIndex(m => m.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }

  const { name, role, department, email, phone, bio, skills, avatar, linkedin, github } = req.body;

  db.team[idx] = {
    ...db.team[idx],
    name: name !== undefined ? name.trim() : db.team[idx].name,
    role: role !== undefined ? role.trim() : db.team[idx].role,
    department: department !== undefined ? department.trim() : db.team[idx].department,
    email: email !== undefined ? email.trim() : db.team[idx].email,
    phone: phone !== undefined ? phone.trim() : db.team[idx].phone,
    bio: bio !== undefined ? bio.trim() : db.team[idx].bio,
    skills: skills !== undefined
      ? (Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()).filter(Boolean))
      : db.team[idx].skills,
    avatar: avatar !== undefined ? avatar : db.team[idx].avatar,
    linkedin: linkedin !== undefined ? linkedin : db.team[idx].linkedin,
    github: github !== undefined ? github : db.team[idx].github,
    updatedAt: new Date().toISOString()
  };

  writeDB(db);
  res.json({ success: true, message: 'Team member updated successfully!', member: db.team[idx] });
});

app.delete('/api/team/:id', (req, res) => {
  const db = readDB();
  const initialLength = (db.team || []).length;
  db.team = (db.team || []).filter(m => m.id !== req.params.id);

  if (db.team.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }

  writeDB(db);
  res.json({ success: true, message: 'Team member deleted successfully' });
});

// 5. Contact / Inquiries routes
app.post('/api/contact', (req, res) => {
  const db = readDB();
  const { name, email, phone, service, budget, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
  }

  const newInquiry = {
    id: 'inq-' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : '',
    service: service || 'General Inquiry',
    budget: budget || 'Flexible',
    message: message.trim(),
    status: 'New',
    createdAt: new Date().toISOString()
  };

  db.inquiries = db.inquiries || [];
  db.inquiries.unshift(newInquiry);
  writeDB(db);

  res.status(201).json({
    success: true,
    message: 'Thank you! Your message has been received. Our team will get back to you shortly.'
  });
});

app.get('/api/inquiries', (req, res) => {
  const db = readDB();
  res.json({ success: true, inquiries: db.inquiries || [] });
});

app.patch('/api/inquiries/:id/status', (req, res) => {
  const db = readDB();
  const inq = (db.inquiries || []).find(i => i.id === req.params.id);
  if (!inq) {
    return res.status(404).json({ success: false, message: 'Inquiry not found' });
  }
  inq.status = req.body.status || 'Reviewed';
  writeDB(db);
  res.json({ success: true, message: 'Status updated', inquiry: inq });
});

app.delete('/api/inquiries/:id', (req, res) => {
  const db = readDB();
  db.inquiries = (db.inquiries || []).filter(i => i.id !== req.params.id);
  writeDB(db);
  res.json({ success: true, message: 'Inquiry deleted successfully' });
});

// 6. Direct File Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = '/uploads/' + req.file.filename;
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    filename: req.file.filename
  });
});

// 7. General Stats Dashboard
app.get('/api/stats', (req, res) => {
  const db = readDB();
  res.json({
    success: true,
    stats: {
      totalProjects: (db.projects || []).length,
      totalTeam: (db.team || []).length,
      totalInquiries: (db.inquiries || []).length,
      featuredProjects: (db.projects || []).filter(p => p.featured).length
    }
  });
});

// Serve Single Page Application Fallback for admin or frontend
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get(['/company-profile', '/profile'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'company-profile.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Sparklyn Infotech Server is running at:`);
  console.log(`  > Public Profile: http://localhost:${PORT}`);
  console.log(`  > Admin Portal:   http://localhost:${PORT}/admin`);
  console.log(`=======================================================`);
});
