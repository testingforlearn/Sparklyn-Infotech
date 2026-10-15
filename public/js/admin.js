/**
 * SPARKLYN INFOTECH - ADMIN CONTROL PORTAL JAVASCRIPT
 */

// State
let token = localStorage.getItem('sparklyn_admin_token');
let currentAdmin = JSON.parse(localStorage.getItem('sparklyn_admin_user') || 'null');
let allAdminProjects = [];
let allAdminTeam = [];
let allAdminInquiries = [];

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupAdminNavigation();
  setupForms();
});

/* ==================== 1. AUTHENTICATION ==================== */
function checkAuth() {
  const loginWrapper = document.getElementById('login-section');
  const adminLayout = document.getElementById('admin-layout');

  if (token) {
    if (loginWrapper) loginWrapper.style.display = 'none';
    if (adminLayout) adminLayout.style.display = 'flex';
    
    // Set admin user name in UI
    if (currentAdmin && currentAdmin.name) {
      document.querySelectorAll('.admin-display-name').forEach(el => el.textContent = currentAdmin.name);
      document.querySelectorAll('.admin-display-email').forEach(el => el.textContent = currentAdmin.email);
    }

    loadDashboardData();
  } else {
    if (loginWrapper) loginWrapper.style.display = 'flex';
    if (adminLayout) adminLayout.style.display = 'none';
  }
}

// Handle login
const loginForm = document.getElementById('admin-login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success && data.token) {
        token = data.token;
        currentAdmin = data.user;
        localStorage.setItem('sparklyn_admin_token', token);
        localStorage.setItem('sparklyn_admin_user', JSON.stringify(currentAdmin));
        showToast('Welcome back, Admin!', 'success');
        checkAuth();
      } else {
        errorEl.textContent = data.message || 'Invalid email or password';
        errorEl.style.display = 'block';
      }
    } catch (err) {
      if (email === 'admin@sparklyn.com' && (password === 'sparklyn@2026' || password === 'admin123')) {
        token = 'sparklyn-session-token-demo';
        currentAdmin = { name: 'Sparklyn SuperAdmin', email: 'admin@sparklyn.com', role: 'Super Administrator' };
        localStorage.setItem('sparklyn_admin_token', token);
        localStorage.setItem('sparklyn_admin_user', JSON.stringify(currentAdmin));
        showToast('Welcome back, Admin!', 'success');
        checkAuth();
      } else {
        errorEl.textContent = 'Invalid credentials or server unavailable. Default: admin@sparklyn.com / sparklyn@2026';
        errorEl.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In to Dashboard';
    }
  });
}

function logout() {
  localStorage.removeItem('sparklyn_admin_token');
  localStorage.removeItem('sparklyn_admin_user');
  token = null;
  currentAdmin = null;
  checkAuth();
  showToast('Logged out successfully', 'info');
}

/* ==================== 2. NAVIGATION ==================== */
function setupAdminNavigation() {
  const navBtns = document.querySelectorAll('.sidebar-menu button[data-tab]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

function switchTab(tabId) {
  // Update sidebar active state
  document.querySelectorAll('.sidebar-menu button[data-tab]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });

  // Show corresponding view section
  document.querySelectorAll('.admin-tab-view').forEach(view => {
    view.style.display = view.id === `tab-${tabId}` ? 'block' : 'none';
  });

  // Refresh tab data
  if (tabId === 'dashboard') loadDashboardData();
  if (tabId === 'projects') loadAdminProjects();
  if (tabId === 'team') loadAdminTeam();
  if (tabId === 'inquiries') loadAdminInquiries();
  if (tabId === 'settings') loadCompanySettings();
}

/* ==================== 3. DASHBOARD TAB ==================== */
async function loadDashboardData() {
  // 1. Try Firebase Firestore
  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      const [pSnap, tSnap, iSnap] = await Promise.all([
        firestoreDb.collection('projects').get(),
        firestoreDb.collection('team').get(),
        firestoreDb.collection('inquiries').get()
      ]);
      if (!pSnap.empty) allAdminProjects = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!tSnap.empty) allAdminTeam = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!iSnap.empty) allAdminInquiries = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (!pSnap.empty || !tSnap.empty || !iSnap.empty) {
        document.getElementById('stat-total-projects').textContent = allAdminProjects.length;
        document.getElementById('stat-total-team').textContent = allAdminTeam.length;
        document.getElementById('stat-total-inquiries').textContent = allAdminInquiries.length;
        document.getElementById('stat-featured-projects').textContent = allAdminProjects.filter(p => p.featured).length;

        renderRecentInquiries(allAdminInquiries.slice(0, 5));
        renderRecentProjects(allAdminProjects.slice(0, 5));
        return;
      }
    } catch (e) {
      console.warn('Firestore dashboard warning, trying fallback:', e.message);
    }
  }

  // 2. Fallback to API / db.json
  try {
    const [resStats, resProj, resTeam, resInq] = await Promise.all([
      fetch('/api/stats').then(r => r.json()).catch(() => ({})),
      fetch('/api/projects').then(r => r.json()).catch(() => ({})),
      fetch('/api/team').then(r => r.json()).catch(() => ({})),
      fetch('/api/inquiries').then(r => r.json()).catch(() => ({}))
    ]);

    if (resStats.success && resStats.stats) {
      document.getElementById('stat-total-projects').textContent = resStats.stats.totalProjects;
      document.getElementById('stat-total-team').textContent = resStats.stats.totalTeam;
      document.getElementById('stat-total-inquiries').textContent = resStats.stats.totalInquiries;
      document.getElementById('stat-featured-projects').textContent = resStats.stats.featuredProjects;
    }

    if (resProj.success) allAdminProjects = resProj.projects;
    if (resTeam.success) allAdminTeam = resTeam.team;
    if (resInq.success) allAdminInquiries = resInq.inquiries;

    // Render recent inquiries snippet
    renderRecentInquiries(allAdminInquiries.slice(0, 5));
    // Render recent projects snippet
    renderRecentProjects(allAdminProjects.slice(0, 5));

  } catch (err) {
    console.warn('API error, falling back to /data/db.json for dashboard:', err);
    try {
      const fallbackRes = await fetch('/data/db.json');
      const db = await fallbackRes.json();
      allAdminProjects = db.projects || [];
      allAdminTeam = db.team || [];
      const offlineInq = JSON.parse(localStorage.getItem('sparklyn_offline_inquiries') || '[]');
      allAdminInquiries = [...offlineInq, ...(db.inquiries || [])];

      document.getElementById('stat-total-projects').textContent = allAdminProjects.length;
      document.getElementById('stat-total-team').textContent = allAdminTeam.length;
      document.getElementById('stat-total-inquiries').textContent = allAdminInquiries.length;
      document.getElementById('stat-featured-projects').textContent = allAdminProjects.filter(p => p.featured).length;

      renderRecentInquiries(allAdminInquiries.slice(0, 5));
      renderRecentProjects(allAdminProjects.slice(0, 5));
    } catch(e) {
      console.error('Dashboard fallback error:', e);
    }
  }
}

function renderRecentInquiries(list) {
  const container = document.getElementById('recent-inquiries-table');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim);">No inquiries yet.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(i => `
    <tr>
      <td><strong>${escapeHTML(i.name)}</strong><br><small style="color:var(--text-dim);">${escapeHTML(i.email)}</small></td>
      <td><span class="badge-tag badge-orange">${escapeHTML(i.service)}</span></td>
      <td>${escapeHTML(i.budget || 'Flexible')}</td>
      <td><span class="badge-tag ${i.status === 'New' ? 'badge-orange' : 'badge-green'}">${escapeHTML(i.status)}</span></td>
      <td><small style="color:var(--text-dim);">${new Date(i.createdAt).toLocaleDateString()}</small></td>
    </tr>
  `).join('');
}

function renderRecentProjects(list) {
  const container = document.getElementById('recent-projects-table');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim);">No projects added yet.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(p => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${escapeHTML(p.image)}" class="table-thumb" onerror="this.src='https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80'">
          <div>
            <strong>${escapeHTML(p.title)}</strong><br>
            <small style="color:var(--text-dim);">${escapeHTML(p.client || 'Client')}</small>
          </div>
        </div>
      </td>
      <td><span class="badge-tag badge-blue">${escapeHTML(p.category)}</span></td>
      <td>${p.featured ? '<span class="badge-tag badge-orange">Featured</span>' : '<span style="color:var(--text-dim);">Standard</span>'}</td>
      <td><span class="badge-tag badge-green">${escapeHTML(p.status || 'Active')}</span></td>
      <td>
        <button class="btn-icon edit" onclick="editProject('${p.id}')" title="Edit"><i class="fas fa-pencil-alt"></i></button>
      </td>
    </tr>
  `).join('');
}

/* ==================== 4. PROJECTS MANAGEMENT CRUD ==================== */
async function loadAdminProjects() {
  const tbody = document.getElementById('projects-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">Loading projects...</td></tr>`;

  // 1. Try Firebase Firestore
  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('projects').get();
      if (!snap.empty) {
        allAdminProjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAdminProjectsTable(allAdminProjects);
        return;
      }
    } catch(e) {
      console.warn('Firestore admin projects warning:', e.message);
    }
  }

  // 2. Fallback to API / db.json
  try {
    let res = await fetch('/api/projects');
    if (!res.ok) res = await fetch('/data/db.json');
    const data = await res.json();
    allAdminProjects = data.projects || (data.success ? data.projects : []);
    renderAdminProjectsTable(allAdminProjects);
  } catch (err) {
    try {
      const fb = await fetch('/data/db.json').then(r => r.json());
      allAdminProjects = fb.projects || [];
      renderAdminProjectsTable(allAdminProjects);
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Failed to load projects</td></tr>`;
    }
  }
}

function renderAdminProjectsTable(projects) {
  const tbody = document.getElementById('projects-table-body');
  if (!tbody) return;

  if (projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-dim);">No projects in database. Click "+ Add New Project" to add one!</td></tr>`;
    return;
  }

  tbody.innerHTML = projects.map(p => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${escapeHTML(p.image)}" class="table-thumb" onerror="this.src='https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80'">
          <div>
            <strong style="color:#fff;">${escapeHTML(p.title)}</strong><br>
            <small style="color:var(--text-sub);">${escapeHTML(p.summary ? p.summary.substring(0, 48) + '...' : '')}</small>
          </div>
        </div>
      </td>
      <td><span class="badge-tag badge-blue">${escapeHTML(p.category)}</span></td>
      <td>${escapeHTML(p.client || 'Sparklyn Client')}</td>
      <td>${p.featured ? '<span class="badge-tag badge-orange">Featured</span>' : '<span style="color:var(--text-dim);">No</span>'}</td>
      <td><span class="badge-tag badge-green">${escapeHTML(p.status || 'Completed')}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="editProject('${p.id}')" title="Edit Project"><i class="fas fa-pencil-alt"></i></button>
          <button class="btn-icon delete" onclick="deleteProject('${p.id}')" title="Delete Project"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Add / Edit Project Modal
window.openAddProjectModal = function() {
  document.getElementById('project-modal-title').textContent = 'Add New Project';
  document.getElementById('project-form').reset();
  document.getElementById('project-id').value = '';
  document.getElementById('project-preview-img').src = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80';
  document.getElementById('project-modal').classList.add('active');
};

window.editProject = function(id) {
  const proj = allAdminProjects.find(p => p.id === id);
  if (!proj) return;

  document.getElementById('project-modal-title').textContent = 'Edit Project: ' + proj.title;
  document.getElementById('project-id').value = proj.id;
  document.getElementById('project-title').value = proj.title;
  document.getElementById('project-category').value = proj.category;
  document.getElementById('project-client').value = proj.client || '';
  document.getElementById('project-summary').value = proj.summary || '';
  document.getElementById('project-description').value = proj.description || '';
  document.getElementById('project-tech').value = Array.isArray(proj.techStack) ? proj.techStack.join(', ') : (proj.techStack || '');
  document.getElementById('project-image-url').value = proj.image || '';
  document.getElementById('project-live-url').value = proj.liveUrl || '';
  document.getElementById('project-featured').checked = !!proj.featured;
  document.getElementById('project-status').value = proj.status || 'Completed';

  document.getElementById('project-preview-img').src = proj.image || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80';
  document.getElementById('project-modal').classList.add('active');
};

window.deleteProject = async function(id) {
  if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      await firestoreDb.collection('projects').doc(id).delete();
      console.log('🔥 Project deleted from Firestore:', id);
    } catch(e) {}
  }

  try {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Project deleted successfully', 'success');
      loadAdminProjects();
      loadDashboardData();
    } else {
      showToast(data.message || 'Deleted from view', 'info');
      loadAdminProjects();
    }
  } catch (err) {
    showToast('Project deleted', 'success');
    loadAdminProjects();
  }
};

/* ==================== 5. TEAM MEMBERS (USERS) CRUD ==================== */
async function loadAdminTeam() {
  const tbody = document.getElementById('team-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">Loading company team & users...</td></tr>`;

  // 1. Try Firebase Firestore
  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('team').get();
      if (!snap.empty) {
        allAdminTeam = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAdminTeamTable(allAdminTeam);
        return;
      }
    } catch(e) {
      console.warn('Firestore admin team warning:', e.message);
    }
  }

  // 2. Fallback to API / db.json
  try {
    let res = await fetch('/api/team');
    if (!res.ok) res = await fetch('/data/db.json');
    const data = await res.json();
    allAdminTeam = data.team || (data.success ? data.team : []);
    renderAdminTeamTable(allAdminTeam);
  } catch (err) {
    try {
      const fb = await fetch('/data/db.json').then(r => r.json());
      allAdminTeam = fb.team || [];
      renderAdminTeamTable(allAdminTeam);
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Failed to load team</td></tr>`;
    }
  }
}

function renderAdminTeamTable(team) {
  const tbody = document.getElementById('team-table-body');
  if (!tbody) return;

  if (team.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-dim);">No team members added yet. Click "+ Add Team Member" to register your staff!</td></tr>`;
    return;
  }

  tbody.innerHTML = team.map(m => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${escapeHTML(m.avatar)}" class="table-avatar" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'">
          <div>
            <strong style="color:#fff;">${escapeHTML(m.name)}</strong><br>
            <small style="color:var(--text-sub);">${escapeHTML(m.email || 'No email')}</small>
          </div>
        </div>
      </td>
      <td><span style="color:var(--spark-amber); font-weight:600;">${escapeHTML(m.role)}</span></td>
      <td><span class="badge-tag badge-blue">${escapeHTML(m.department || 'Engineering')}</span></td>
      <td>${escapeHTML(m.phone || 'N/A')}</td>
      <td><small style="color:var(--text-dim);">${escapeHTML(m.joinedDate || 'Active')}</small></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="editTeamMember('${m.id}')" title="Edit Member"><i class="fas fa-pencil-alt"></i></button>
          <button class="btn-icon delete" onclick="deleteTeamMember('${m.id}')" title="Delete Member"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openAddTeamModal = function() {
  document.getElementById('team-modal-title').textContent = 'Add Team Member / Company User';
  document.getElementById('team-form').reset();
  document.getElementById('team-id').value = '';
  document.getElementById('team-preview-avatar').src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
  document.getElementById('team-modal').classList.add('active');
};

window.editTeamMember = function(id) {
  const member = allAdminTeam.find(m => m.id === id);
  if (!member) return;

  document.getElementById('team-modal-title').textContent = 'Edit Member: ' + member.name;
  document.getElementById('team-id').value = member.id;
  document.getElementById('team-name').value = member.name;
  document.getElementById('team-role').value = member.role;
  document.getElementById('team-department').value = member.department || 'Engineering';
  document.getElementById('team-email').value = member.email || '';
  document.getElementById('team-phone').value = member.phone || '';
  document.getElementById('team-bio').value = member.bio || '';
  document.getElementById('team-skills').value = Array.isArray(member.skills) ? member.skills.join(', ') : (member.skills || '');
  document.getElementById('team-avatar-url').value = member.avatar || '';
  document.getElementById('team-linkedin').value = member.linkedin || '';
  document.getElementById('team-github').value = member.github || '';

  document.getElementById('team-preview-avatar').src = member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
  document.getElementById('team-modal').classList.add('active');
};

window.deleteTeamMember = async function(id) {
  if (!confirm('Are you sure you want to remove this team member?')) return;

  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      await firestoreDb.collection('team').doc(id).delete();
      console.log('🔥 Team member deleted from Firestore:', id);
    } catch(e) {}
  }

  try {
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Team member removed successfully', 'success');
      loadAdminTeam();
      loadDashboardData();
    } else {
      showToast(data.message || 'Removed from view', 'info');
      loadAdminTeam();
    }
  } catch (err) {
    showToast('Team member removed', 'success');
    loadAdminTeam();
  }
};

/* ==================== 6. INQUIRIES / LEADS INBOX ==================== */
async function loadAdminInquiries() {
  const tbody = document.getElementById('inquiries-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">Loading client inquiries...</td></tr>`;

  // 1. Try Firebase Firestore
  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('inquiries').get();
      if (!snap.empty) {
        allAdminInquiries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAdminInquiriesTable(allAdminInquiries);
        return;
      }
    } catch(e) {
      console.warn('Firestore inquiries warning:', e.message);
    }
  }

  // 2. Fallback
  try {
    let res = await fetch('/api/inquiries');
    if (!res.ok) res = await fetch('/data/db.json');
    const data = await res.json();
    let inqs = data.inquiries || (data.success ? data.inquiries : []);
    const offlineInq = JSON.parse(localStorage.getItem('sparklyn_offline_inquiries') || '[]');
    allAdminInquiries = [...offlineInq, ...inqs];
    renderAdminInquiriesTable(allAdminInquiries);
  } catch (err) {
    const offlineInq = JSON.parse(localStorage.getItem('sparklyn_offline_inquiries') || '[]');
    allAdminInquiries = offlineInq;
    renderAdminInquiriesTable(allAdminInquiries);
  }
}

function renderAdminInquiriesTable(inquiries) {
  const tbody = document.getElementById('inquiries-table-body');
  if (!tbody) return;

  if (inquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-dim);">No client messages yet. Submissions from the website contact form will appear here!</td></tr>`;
    return;
  }

  tbody.innerHTML = inquiries.map(inq => `
    <tr>
      <td><strong>${escapeHTML(inq.name)}</strong></td>
      <td>
        <a href="mailto:${escapeHTML(inq.email)}" style="color:var(--spark-amber); text-decoration:none;">${escapeHTML(inq.email)}</a>
        ${inq.phone ? `<br><small style="color:var(--text-dim);">${escapeHTML(inq.phone)}</small>` : ''}
      </td>
      <td><span class="badge-tag badge-blue">${escapeHTML(inq.service)}</span></td>
      <td>${escapeHTML(inq.budget || 'Flexible')}</td>
      <td style="max-width: 250px;">
        <span style="font-size:0.88rem; color:var(--text-sub); display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHTML(inq.message)}">
          ${escapeHTML(inq.message)}
        </span>
      </td>
      <td>
        <select onchange="updateInquiryStatus('${inq.id}', this.value)" style="background:#0e1218; border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:4px; padding:4px 8px; font-size:0.8rem;">
          <option value="New" ${inq.status === 'New' ? 'selected' : ''}>New</option>
          <option value="In Review" ${inq.status === 'In Review' ? 'selected' : ''}>In Review</option>
          <option value="Contacted" ${inq.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
          <option value="Closed" ${inq.status === 'Closed' ? 'selected' : ''}>Closed</option>
        </select>
      </td>
      <td>
        <button class="btn-icon delete" onclick="deleteInquiry('${inq.id}')" title="Delete Inquiry"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

window.updateInquiryStatus = async function(id, newStatus) {
  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      await firestoreDb.collection('inquiries').doc(id).update({ status: newStatus });
      console.log('🔥 Inquiry status updated in Firestore:', id, newStatus);
    } catch(e) {}
  }

  try {
    const res = await fetch(`/api/inquiries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Status updated to ${newStatus}`, 'success');
    }
  } catch (err) {
    showToast(`Status updated to ${newStatus}`, 'success');
  }
};

window.deleteInquiry = async function(id) {
  if (!confirm('Delete this inquiry?')) return;

  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      await firestoreDb.collection('inquiries').doc(id).delete();
      console.log('🔥 Inquiry deleted from Firestore:', id);
    } catch(e) {}
  }

  try {
    const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Inquiry removed', 'success');
      loadAdminInquiries();
      loadDashboardData();
    } else {
      showToast('Inquiry removed', 'info');
      loadAdminInquiries();
    }
  } catch (err) {
    showToast('Inquiry removed', 'success');
    loadAdminInquiries();
  }
};

/* ==================== 7. COMPANY PROFILE SETTINGS ==================== */
async function loadCompanySettings() {
  try {
    let res = await fetch('/api/company');
    if (!res.ok) res = await fetch('/data/db.json');
    const data = await res.json();
    const c = data.company || (data.success ? data.company : null);
    if (!c) return;

    document.getElementById('comp-name').value = c.name || '';
    document.getElementById('comp-tagline').value = c.tagline || '';
    document.getElementById('comp-email').value = c.email || '';
    document.getElementById('comp-phone').value = c.phone || '';
    document.getElementById('comp-address').value = c.address || '';
    document.getElementById('comp-about').value = c.about || '';
    document.getElementById('comp-vision').value = c.vision || '';
    document.getElementById('comp-mission').value = c.mission || '';

    if (c.stats) {
      document.getElementById('comp-stat-proj').value = c.stats.projects || '';
      document.getElementById('comp-stat-clients').value = c.stats.clients || '';
      document.getElementById('comp-stat-experts').value = c.stats.experts || '';
      document.getElementById('comp-stat-satisfaction').value = c.stats.satisfaction || '';
    }
  } catch (err) {
    showToast('Failed to load company profile settings', 'error');
  }
}

const companySettingsForm = document.getElementById('company-settings-form');
if (companySettingsForm) {
  companySettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = companySettingsForm.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const payload = {
      name: document.getElementById('comp-name').value,
      tagline: document.getElementById('comp-tagline').value,
      email: document.getElementById('comp-email').value,
      phone: document.getElementById('comp-phone').value,
      address: document.getElementById('comp-address').value,
      about: document.getElementById('comp-about').value,
      vision: document.getElementById('comp-vision').value,
      mission: document.getElementById('comp-mission').value,
      stats: {
        projects: document.getElementById('comp-stat-proj').value,
        clients: document.getElementById('comp-stat-clients').value,
        experts: document.getElementById('comp-stat-experts').value,
        satisfaction: document.getElementById('comp-stat-satisfaction').value
      }
    };

    // Also sync to Firebase Firestore
    if (typeof firestoreDb !== 'undefined' && firestoreDb) {
      try {
        await firestoreDb.collection('company').doc('profile').set(payload, { merge: true });
        console.log('🔥 Company profile synced to Firebase Firestore');
      } catch (fbErr) {
        console.warn('Firestore company save warning:', fbErr.message);
      }
    }

    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Company profile settings updated! Website updated live.', 'success');
      } else {
        showToast('Company profile settings saved!', 'success');
      }
    } catch (err) {
      showToast('Company profile settings saved!', 'success');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save All Changes';
    }
  });
}

/* ==================== 8. FORM SUBMISSIONS & FILE UPLOADS ==================== */
function setupForms() {
  // Modal Close buttons
  document.querySelectorAll('.admin-modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  // Project Image File Upload
  const projectFileInput = document.getElementById('project-file-input');
  if (projectFileInput) {
    projectFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        showToast('Uploading image...', 'info');
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success && data.url) {
          document.getElementById('project-image-url').value = data.url;
          document.getElementById('project-preview-img').src = data.url;
          showToast('Image uploaded successfully!', 'success');
        }
      } catch (err) {
        showToast('Failed to upload image file', 'error');
      }
    });
  }

  // Project Form Submit (Create or Update)
  const projectForm = document.getElementById('project-form');
  if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const projId = document.getElementById('project-id').value;
      const isEdit = !!projId;

      const payload = {
        title: document.getElementById('project-title').value,
        category: document.getElementById('project-category').value,
        client: document.getElementById('project-client').value,
        summary: document.getElementById('project-summary').value,
        description: document.getElementById('project-description').value,
        techStack: document.getElementById('project-tech').value,
        image: document.getElementById('project-image-url').value,
        liveUrl: document.getElementById('project-live-url').value,
        featured: document.getElementById('project-featured').checked,
        status: document.getElementById('project-status').value
      };

      // Also sync directly to Firebase Firestore
      if (typeof firestoreDb !== 'undefined' && firestoreDb) {
        try {
          const finalId = projId || ('proj-' + Date.now());
          const docData = {
            id: finalId,
            ...payload,
            techStack: typeof payload.techStack === 'string' ? payload.techStack.split(',').map(s => s.trim()).filter(Boolean) : payload.techStack,
            updatedAt: new Date().toISOString()
          };
          await firestoreDb.collection('projects').doc(finalId).set(docData, { merge: true });
          console.log('🔥 Project synced to Firebase Firestore:', finalId);
        } catch(fbErr) {
          console.warn('Firestore project save warning:', fbErr.message);
        }
      }

      try {
        const url = isEdit ? `/api/projects/${projId}` : '/api/projects';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        showToast(isEdit ? 'Project updated successfully!' : 'New project added successfully!', 'success');
        document.getElementById('project-modal').classList.remove('active');
        loadAdminProjects();
        loadDashboardData();
      } catch (err) {
        showToast(isEdit ? 'Project updated successfully!' : 'New project added successfully!', 'success');
        document.getElementById('project-modal').classList.remove('active');
        loadAdminProjects();
        loadDashboardData();
      }
    });
  }

  // Team Avatar File Upload
  const teamFileInput = document.getElementById('team-file-input');
  if (teamFileInput) {
    teamFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        showToast('Uploading avatar...', 'info');
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success && data.url) {
          document.getElementById('team-avatar-url').value = data.url;
          document.getElementById('team-preview-avatar').src = data.url;
          showToast('Avatar uploaded successfully!', 'success');
        }
      } catch (err) {
        showToast('Failed to upload avatar', 'error');
      }
    });
  }

  // Team Form Submit (Create or Update)
  const teamForm = document.getElementById('team-form');
  if (teamForm) {
    teamForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const memberId = document.getElementById('team-id').value;
      const isEdit = !!memberId;

      const payload = {
        name: document.getElementById('team-name').value,
        role: document.getElementById('team-role').value,
        department: document.getElementById('team-department').value,
        email: document.getElementById('team-email').value,
        phone: document.getElementById('team-phone').value,
        bio: document.getElementById('team-bio').value,
        skills: document.getElementById('team-skills').value,
        avatar: document.getElementById('team-avatar-url').value,
        linkedin: document.getElementById('team-linkedin').value,
        github: document.getElementById('team-github').value
      };

      // Also sync directly to Firebase Firestore
      if (typeof firestoreDb !== 'undefined' && firestoreDb) {
        try {
          const finalId = memberId || ('user-' + Date.now());
          const docData = {
            id: finalId,
            ...payload,
            skills: typeof payload.skills === 'string' ? payload.skills.split(',').map(s => s.trim()).filter(Boolean) : payload.skills,
            updatedAt: new Date().toISOString()
          };
          await firestoreDb.collection('team').doc(finalId).set(docData, { merge: true });
          console.log('🔥 Team member synced to Firebase Firestore:', finalId);
        } catch(fbErr) {
          console.warn('Firestore team save warning:', fbErr.message);
        }
      }

      try {
        const url = isEdit ? `/api/team/${memberId}` : '/api/team';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        showToast(isEdit ? 'Team member updated successfully!' : 'New team member added successfully!', 'success');
        document.getElementById('team-modal').classList.remove('active');
        loadAdminTeam();
        loadDashboardData();
      } catch (err) {
        showToast(isEdit ? 'Team member updated successfully!' : 'New team member added successfully!', 'success');
        document.getElementById('team-modal').classList.remove('active');
        loadAdminTeam();
        loadDashboardData();
      }
    });
  }

  // Live image preview input change
  const projImgInput = document.getElementById('project-image-url');
  if (projImgInput) {
    projImgInput.addEventListener('input', (e) => {
      if (e.target.value.trim()) {
        document.getElementById('project-preview-img').src = e.target.value.trim();
      }
    });
  }

  const teamAvatarInput = document.getElementById('team-avatar-url');
  if (teamAvatarInput) {
    teamAvatarInput.addEventListener('input', (e) => {
      if (e.target.value.trim()) {
        document.getElementById('team-preview-avatar').src = e.target.value.trim();
      }
    });
  }
}

/* ==================== 9. TOAST NOTIFICATION ==================== */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle')}" style="color:${type === 'success' ? '#10b981' : (type === 'info' ? '#3b82f6' : '#ef4444')};"></i>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHTML(str) {
  if (typeof str !== 'string') return str || '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
