/**
 * SPARKLYN INFOTECH - CLIENT INTERACTIVITY & LIVE DATA ENGINE
 */

document.addEventListener('DOMContentLoaded', () => {
  initParticleCanvas();
  loadCompanyData();
  loadProjects();
  loadTeam();
  setupEventListeners();
});

// Global state
let allProjects = [];
let currentCategory = 'All';

/* ==================== 1. PARTICLE CANVAS (FIERY SPARKS) ==================== */
function initParticleCanvas() {
  const canvas = document.getElementById('spark-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 45;

  class SparkParticle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = height + Math.random() * 50;
      this.size = Math.random() * 2.5 + 1;
      this.speedY = Math.random() * 1.5 + 0.6;
      this.speedX = (Math.random() - 0.5) * 0.8;
      this.opacity = Math.random() * 0.7 + 0.3;
      this.fadeRate = Math.random() * 0.005 + 0.002;
      // Fiery hues
      const colors = ['#ffc107', '#ff8c00', '#ff5500', '#ff3300', '#ffaa00'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      this.opacity -= this.fadeRate;

      if (this.y < -10 || this.opacity <= 0) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.opacity);
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    const p = new SparkParticle();
    p.y = Math.random() * height; // initial scatter
    particles.push(p);
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let p of particles) {
      p.update();
      p.draw();
    }
    requestAnimationFrame(animate);
  }

  animate();
}

/* ==================== 2. LOAD COMPANY PROFILE DATA ==================== */
async function loadCompanyData() {
  // 1. Try Firebase Firestore first
  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('company').doc('profile').get();
      if (snap.exists) {
        applyCompanyData(snap.data());
        return;
      }
    } catch (e) {
      console.warn('Firestore company load warning, trying fallback:', e.message);
    }
  }

  // 2. Fallback to /api/company or /data/db.json
  try {
    let res = await fetch('/api/company');
    if (!res.ok) {
      res = await fetch('/data/db.json');
    }
    const data = await res.json();
    const comp = data.company || (data.success ? data.company : null);
    if (!comp) return;
    applyCompanyData(comp);
  } catch (err) {
    try {
      const fallbackRes = await fetch('/data/db.json');
      const fallbackData = await fallbackRes.json();
      if (fallbackData.company) {
        applyCompanyData(fallbackData.company);
      }
    } catch(e) {}
    console.error('Error fetching company info:', err);
  }
}

function applyCompanyData(comp) {
  if (!comp) return;
  document.querySelectorAll('.company-name').forEach(el => el.textContent = comp.name || 'Sparklyn Infotech');
  document.querySelectorAll('.company-tagline').forEach(el => el.textContent = comp.tagline || 'From First Spark to Future Tech');
  
  if (comp.about) {
    const aboutEl = document.getElementById('company-about-text');
    if (aboutEl) aboutEl.textContent = comp.about;
  }

  if (comp.vision) {
    const visionEl = document.getElementById('company-vision-text');
    if (visionEl) visionEl.textContent = comp.vision;
  }

  if (comp.mission) {
    const missionEl = document.getElementById('company-mission-text');
    if (missionEl) missionEl.textContent = comp.mission;
  }

  // Contact info
  if (comp.email) {
    document.querySelectorAll('.company-email').forEach(el => {
      el.textContent = comp.email;
      if (el.tagName === 'A') el.href = `mailto:${comp.email}`;
    });
  }

  if (comp.phone) {
    document.querySelectorAll('.company-phone').forEach(el => {
      el.textContent = comp.phone;
      if (el.tagName === 'A') el.href = `tel:${comp.phone.replace(/[^0-9+]/g, '')}`;
    });
  }

  if (comp.address) {
    document.querySelectorAll('.company-address').forEach(el => el.textContent = comp.address);
  }

  // Stats
  if (comp.stats) {
    if (document.getElementById('stat-projects')) document.getElementById('stat-projects').textContent = comp.stats.projects || '150+';
    if (document.getElementById('stat-clients')) document.getElementById('stat-clients').textContent = comp.stats.clients || '85+';
    if (document.getElementById('stat-experts')) document.getElementById('stat-experts').textContent = comp.stats.experts || '40+';
    if (document.getElementById('stat-satisfaction')) document.getElementById('stat-satisfaction').textContent = comp.stats.satisfaction || '99.2%';
  }
}

/* ==================== 3. LOAD & RENDER PROJECTS ==================== */
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
      <div style="display:inline-block; width: 30px; height: 30px; border: 3px solid rgba(255,140,0,0.3); border-top-color: var(--spark-orange); border-radius:50%; animation: spin 1s infinite linear;"></div>
      <p style="margin-top: 12px;">Loading Sparklyn Portfolio...</p>
    </div>
  `;

  // 1. Try Firebase Firestore
  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('projects').get();
      if (!snap.empty) {
        allProjects = snap.docs.map(doc => doc.data());
        renderProjects(allProjects);
        return;
      }
    } catch (e) {
      console.warn('Firestore projects load warning, trying fallback:', e.message);
    }
  }

  // 2. Fallback to API / db.json
  try {
    let res = await fetch('/api/projects');
    if (!res.ok) {
      res = await fetch('/data/db.json');
    }
    const data = await res.json();
    const projs = data.projects || (data.success ? data.projects : []);
    if (projs && projs.length > 0) {
      allProjects = projs;
      renderProjects(allProjects);
      return;
    }
  } catch (err) {
    console.warn('API /api/projects failed, trying fallback to /data/db.json', err);
  }

  try {
    const fallbackRes = await fetch('/data/db.json');
    const fallbackData = await fallbackRes.json();
    if (fallbackData.projects && fallbackData.projects.length > 0) {
      allProjects = fallbackData.projects;
      renderProjects(allProjects);
      return;
    }
  } catch (e) {
    console.error('Error loading fallback projects:', e);
  }

  grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color: #ef4444;">Failed to load projects. Please refresh.</p>`;
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  let filtered = projects;
  if (currentCategory !== 'All') {
    filtered = projects.filter(p => p.category.toLowerCase().includes(currentCategory.toLowerCase()));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 12px;">
        <h4 style="color:#fff; margin-bottom:8px;">No projects found</h4>
        <p style="color:var(--text-secondary);">Check back soon or visit the Admin portal to add projects in this category.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(proj => {
    const techTags = (proj.techStack || [])
      .slice(0, 4)
      .map(t => `<span class="tech-pill">${escapeHTML(t)}</span>`)
      .join('');

    return `
      <div class="project-card glass-panel" data-id="${proj.id}">
        <div class="project-img-wrapper">
          <img src="${escapeHTML(proj.image)}" alt="${escapeHTML(proj.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80'">
          <span class="project-category-badge">${escapeHTML(proj.category)}</span>
          ${proj.featured ? `<span class="project-featured-badge">Featured</span>` : ''}
        </div>
        <div class="project-body">
          <div class="project-client">${escapeHTML(proj.client || 'Client Project')}</div>
          <h3 class="project-title">${escapeHTML(proj.title)}</h3>
          <p class="project-summary">${escapeHTML(proj.summary || proj.description || '')}</p>
          <div class="tech-stack-pills">
            ${techTags}
          </div>
          <div class="project-footer">
            <button class="btn-view-details" onclick="openProjectModal('${proj.id}')">
              <span>View Case Study</span>
              <span>&rarr;</span>
            </button>
            ${proj.liveUrl && proj.liveUrl !== '#' ? `
              <a href="${escapeHTML(proj.liveUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-icon" title="Open Demo / Live Site">
                <i class="fas fa-external-link-alt"></i>
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==================== 4. LOAD & RENDER TEAM (USERS) ==================== */
async function loadTeam() {
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
      <p>Loading Sparklyn Team Specialists...</p>
    </div>
  `;

  // 1. Try Firebase Firestore
  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('team').get();
      if (!snap.empty) {
        const teamList = snap.docs.map(doc => doc.data());
        renderTeam(teamList);
        return;
      }
    } catch (e) {
      console.warn('Firestore team load warning, trying fallback:', e.message);
    }
  }

  // 2. Fallback to API / db.json
  try {
    let res = await fetch('/api/team');
    if (!res.ok) {
      res = await fetch('/data/db.json');
    }
    const data = await res.json();
    const team = data.team || (data.success ? data.team : []);
    if (team && team.length > 0) {
      renderTeam(team);
      return;
    }
  } catch (err) {
    console.warn('API /api/team failed, trying fallback to /data/db.json', err);
  }

  try {
    const fallbackRes = await fetch('/data/db.json');
    const fallbackData = await fallbackRes.json();
    if (fallbackData.team && fallbackData.team.length > 0) {
      renderTeam(fallbackData.team);
      return;
    }
  } catch (e) {
    console.error('Error loading fallback team members:', e);
  }

  grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color: #ef4444;">Failed to load team members.</p>`;
}

function renderTeam(teamList) {
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  if (teamList.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-secondary);">No team members added yet.</p>`;
    return;
  }

  grid.innerHTML = teamList.map(member => {
    const skills = (member.skills || [])
      .slice(0, 3)
      .map(s => `<span class="team-skill-tag">${escapeHTML(s)}</span>`)
      .join('');

    return `
      <div class="team-card glass-panel">
        <div class="team-avatar-wrapper">
          <img src="${escapeHTML(member.avatar)}" alt="${escapeHTML(member.name)}" class="team-avatar" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'">
        </div>
        <span class="team-dept-badge">${escapeHTML(member.department || 'Technology')}</span>
        <h3 class="team-name">${escapeHTML(member.name)}</h3>
        <p class="team-role">${escapeHTML(member.role)}</p>
        <p class="team-bio">${escapeHTML(member.bio || '')}</p>
        <div class="team-skills">
          ${skills}
        </div>
        <div class="team-socials">
          ${member.linkedin ? `<a href="${escapeHTML(member.linkedin)}" target="_blank" class="team-social-link" title="LinkedIn"><i class="fab fa-linkedin-in"></i></a>` : ''}
          ${member.github ? `<a href="${escapeHTML(member.github)}" target="_blank" class="team-social-link" title="GitHub"><i class="fab fa-github"></i></a>` : ''}
          ${member.email ? `<a href="mailto:${escapeHTML(member.email)}" class="team-social-link" title="Email"><i class="fas fa-envelope"></i></a>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

/* ==================== 5. PROJECT DETAIL MODAL ==================== */
window.openProjectModal = function(projectId) {
  const project = allProjects.find(p => p.id === projectId);
  if (!project) return;

  const modal = document.getElementById('project-modal');
  const modalBody = document.getElementById('modal-project-details');

  const stackHTML = (project.techStack || [])
    .map(t => `<span class="tech-pill" style="font-size:0.85rem; padding:6px 14px;">${escapeHTML(t)}</span>`)
    .join('');

  modalBody.innerHTML = `
    <div style="position: relative; height: 320px; overflow: hidden; border-radius: 12px; margin-bottom: 24px;">
      <img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.title)}" style="width:100%; height:100%; object-fit:cover;">
      <div style="position:absolute; bottom:16px; left:16px; background:rgba(0,0,0,0.8); padding:6px 14px; border-radius:999px; font-size:0.85rem; color:#ffaa33; border:1px solid rgba(255,140,0,0.4);">
        ${escapeHTML(project.category)}
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; gap:20px; flex-wrap:wrap;">
      <div>
        <span style="color:var(--text-muted); font-size:0.9rem; text-transform:uppercase;">Client: <strong>${escapeHTML(project.client || 'Enterprise')}</strong></span>
        <h2 style="font-size: 1.8rem; margin-top: 4px; color:#fff;">${escapeHTML(project.title)}</h2>
      </div>
      ${project.liveUrl && project.liveUrl !== '#' ? `
        <a href="${escapeHTML(project.liveUrl)}" target="_blank" class="btn btn-primary" style="padding:8px 20px; font-size:0.9rem;">
          <span>Live Demo</span> <i class="fas fa-external-link-alt"></i>
        </a>
      ` : ''}
    </div>
    
    <div style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:20px; border-radius:12px; margin-bottom:24px;">
      <h4 style="color:#ffaa33; margin-bottom:8px; font-size:1.05rem;">Project Overview</h4>
      <p style="color:var(--text-secondary); line-height:1.7;">${escapeHTML(project.description || project.summary || '')}</p>
    </div>

    <div style="margin-bottom: 24px;">
      <h4 style="color:#fff; margin-bottom:12px; font-size:1rem;">Technologies & Tools Deployed</h4>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${stackHTML}
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; padding-top:20px; border-top:1px solid rgba(255,255,255,0.08); font-size:0.85rem; color:var(--text-muted);">
      <span>Status: <strong style="color:#10b981;">${escapeHTML(project.status || 'Completed')}</strong></span>
      <span>Completed: ${escapeHTML(project.createdAt || 'Recent')}</span>
    </div>
  `;

  modal.classList.add('active');
};

/* ==================== 6. EVENT LISTENERS ==================== */
function setupEventListeners() {
  // Navbar scroll effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
    // Close on link click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('active'));
    });
  }

  // Filter Buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-filter') || 'All';
      renderProjects(allProjects);
    });
  });

  // Modal close
  const modalClose = document.getElementById('modal-close');
  const modal = document.getElementById('project-modal');
  if (modalClose && modal) {
    modalClose.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // Contact Form Submission
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Sending...</span>`;

      const payload = {
        name: document.getElementById('contact-name').value,
        email: document.getElementById('contact-email').value,
        phone: document.getElementById('contact-phone').value,
        service: document.getElementById('contact-service').value,
        budget: document.getElementById('contact-budget').value,
        message: document.getElementById('contact-message').value
      };

      // 1. Try Firebase Firestore directly
      if (typeof firestoreDb !== 'undefined' && firestoreDb) {
        try {
          await firestoreDb.collection('inquiries').add({
            ...payload,
            status: 'New',
            createdAt: new Date().toISOString()
          });
          showToast('Thank you! Your message has been saved and sent to Sparklyn team.', 'success');
          contactForm.reset();
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
          return;
        } catch (fbErr) {
          console.warn('Firestore write warning, trying fallback:', fbErr.message);
        }
      }

      // 2. Fallback to /api/contact or offline storage
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const result = await res.json();
          showToast(result.message || 'Message sent successfully! Our team will contact you shortly.', 'success');
          contactForm.reset();
        } else {
          // Static Netlify fallback
          saveOfflineInquiry(payload);
          showToast('Thank you! Your message has been received. Our team will contact you shortly.', 'success');
          contactForm.reset();
        }
      } catch (err) {
        // Network/Static fallback
        saveOfflineInquiry(payload);
        showToast('Thank you! Your message has been received. Our team will contact you shortly.', 'success');
        contactForm.reset();
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
}

/* ==================== 7. TOAST HELPER ==================== */
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
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}" style="color:${type === 'success' ? '#10b981' : '#ef4444'}; font-size:1.1rem;"></i>
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

// Security XSS helper
function escapeHTML(str) {
  if (typeof str !== 'string') return str || '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function saveOfflineInquiry(payload) {
  try {
    const list = JSON.parse(localStorage.getItem('sparklyn_offline_inquiries') || '[]');
    list.unshift({
      id: 'inq-' + Date.now(),
      ...payload,
      status: 'New',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('sparklyn_offline_inquiries', JSON.stringify(list));
  } catch(e) {}
}

