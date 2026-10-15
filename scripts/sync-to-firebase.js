const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBsjxJeZzgQHGOUL2-08EYLHcG6wUPwbBI",
  authDomain: "sparklyn-49ce6.firebaseapp.com",
  projectId: "sparklyn-49ce6",
  storageBucket: "sparklyn-49ce6.firebasestorage.app",
  messagingSenderId: "762988088794",
  appId: "1:762988088794:web:3129aa2b9fea78e862c4e3",
  measurementId: "G-4BDTLZ43CB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

async function syncToFirebase() {
  console.log('🚀 Starting Data Migration to Firebase Firestore (sparklyn-49ce6)...');
  
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ data/db.json not found!');
    process.exit(1);
  }

  const raw = fs.readFileSync(DB_FILE, 'utf8');
  const data = JSON.parse(raw);

  try {
    // 1. Sync Company Profile
    if (data.company) {
      console.log('📤 Syncing Company Profile...');
      await setDoc(doc(db, 'company', 'profile'), data.company, { merge: true });
      console.log('✅ Company Profile synced.');
    }

    // 2. Sync Projects
    if (Array.isArray(data.projects)) {
      console.log(`📤 Syncing ${data.projects.length} Projects (Signova, Inventory, GovExam)...`);
      for (const p of data.projects) {
        await setDoc(doc(db, 'projects', p.id), p, { merge: true });
        console.log(`  ✓ Synced Project: ${p.title}`);
      }
      console.log('✅ All Projects synced to Firestore.');
    }

    // 3. Sync Team Members
    if (Array.isArray(data.team)) {
      console.log(`📤 Syncing ${data.team.length} Team Members...`);
      for (const m of data.team) {
        await setDoc(doc(db, 'team', m.id), m, { merge: true });
        console.log(`  ✓ Synced Member: ${m.name} (${m.role})`);
      }
      console.log('✅ All Team Members synced to Firestore.');
    }

    // 4. Sync Inquiries
    if (Array.isArray(data.inquiries)) {
      console.log(`📤 Syncing ${data.inquiries.length} Inquiries...`);
      for (const inq of data.inquiries) {
        await setDoc(doc(db, 'inquiries', inq.id), inq, { merge: true });
      }
      console.log('✅ Inquiries synced to Firestore.');
    }

    // 5. Sync Admin credentials
    if (data.admin) {
      await setDoc(doc(db, 'system', 'admin'), {
        email: data.admin.email,
        name: data.admin.name,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Admin configuration synced.');
    }

    console.log('\n🎉 ALL DATA HAS BEEN SUCCESSFULLY UPLOADED & STORED IN FIREBASE FIRESTORE!');
    console.log('Project ID: sparklyn-49ce6');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Firebase Sync Error:', err.message);
    if (err.message.includes('PERMISSION_DENIED') || err.message.includes('Cloud Firestore API has not been used')) {
      console.log('\n👉 NOTE: Cloud Firestore database has not been created yet in Firebase Console.');
      console.log('Please visit: https://console.firebase.google.com/project/sparklyn-49ce6/firestore');
      console.log('Click "Create database", choose "Start in test mode", and click "Create".');
    }
    process.exit(1);
  }
}

syncToFirebase();
