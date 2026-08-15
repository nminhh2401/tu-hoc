// ============================================================
// TỰ HỌC — auth gate + header auth widget + Firestore progress sync.
// Dùng chung cho mọi trang (index và tất cả trang môn học).
//
// TỐI ƯU TỐC ĐỘ:
//   - Firestore (667 KB) được nạp LƯỜI, chỉ sau khi đã biết chắc có
//     người dùng đăng nhập. Cổng đăng nhập chỉ cần app + auth (255 KB).
//   - Cờ 'tuhoc-signed-in' cho phép hiện nội dung NGAY khi mở trang
//     (xem script inline trong <head>), không phải chờ Firebase tải xong.
//     Nếu hoá ra phiên đã hết hạn, nội dung sẽ được ẩn lại.
//
// Giao tiếp với script của từng trang qua CustomEvent, không đụng
// vào biến/hàm toàn cục của trang đó:
//   - phát ra "tuhoc:remote-progress" khi có dữ liệu mới từ Firestore
//   - lắng nghe "tuhoc:local-progress-changed" để đẩy lên Firestore
// ============================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const STORAGE_KEY   = 'tuhoc-progress';
const SIGNED_IN_KEY = 'tuhoc-signed-in';
const EMAIL_KEY     = 'tuhoc-email';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let currentUser = null;
let unsubscribeSnapshot = null;
let firestore = null;   // { db, doc, getDoc, setDoc, onSnapshot } — nạp lười

function readLocalProgress(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function writeLocalProgress(data){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }catch(e){ /* lưu trữ không khả dụng */ }
}
function notifyRemoteProgress(data){
  window.dispatchEvent(new CustomEvent('tuhoc:remote-progress', { detail: data }));
}

// Chỉ tải firebase-firestore.js (667 KB) khi thật sự cần đồng bộ.
async function loadFirestore(){
  if(firestore) return firestore;
  const m = await import("https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js");
  firestore = {
    db: m.getFirestore(app),
    doc: m.doc, getDoc: m.getDoc, setDoc: m.setDoc, onSnapshot: m.onSnapshot
  };
  return firestore;
}

async function pushToFirestore(){
  if(!currentUser) return;
  try{
    const fs = await loadFirestore();
    await fs.setDoc(fs.doc(fs.db, 'progress', currentUser.uid), readLocalProgress());
  }catch(e){ console.error('Không lưu được lên Firestore', e); }
}

async function syncFromFirestore(uid){
  try{
    const fs = await loadFirestore();
    const ref = fs.doc(fs.db, 'progress', uid);
    const snap = await fs.getDoc(ref);
    if(snap.exists()){
      writeLocalProgress(snap.data());
      notifyRemoteProgress(snap.data());
    } else {
      await fs.setDoc(ref, readLocalProgress());
    }
    if(unsubscribeSnapshot) unsubscribeSnapshot();
    unsubscribeSnapshot = fs.onSnapshot(ref, function(snap){
      if(snap.exists()){
        writeLocalProgress(snap.data());
        notifyRemoteProgress(snap.data());
      }
    });
  }catch(e){ console.error('Không đồng bộ được từ Firestore', e); }
}

window.addEventListener('tuhoc:local-progress-changed', pushToFirestore);

function showAuthed(email){
  document.documentElement.classList.add('tuhoc-authed');
  const statusEl    = document.getElementById('auth-status');
  const loggedOutEl = document.getElementById('auth-logged-out');
  const loggedInEl  = document.getElementById('auth-logged-in');
  const emailEl     = document.getElementById('auth-email-display');
  if(statusEl)    statusEl.style.display = 'none';
  if(loggedOutEl) loggedOutEl.style.display = 'none';
  if(loggedInEl)  loggedInEl.style.display = 'inline-flex';
  if(emailEl && email) emailEl.textContent = email;
}
function showSignedOut(){
  document.documentElement.classList.remove('tuhoc-authed');
  const statusEl    = document.getElementById('auth-status');
  const loggedOutEl = document.getElementById('auth-logged-out');
  const loggedInEl  = document.getElementById('auth-logged-in');
  if(statusEl)    statusEl.style.display = 'none';
  if(loggedOutEl) loggedOutEl.style.display = 'inline-flex';
  if(loggedInEl)  loggedInEl.style.display = 'none';
}

// Hiện ngay trạng thái đã đăng nhập lần trước (lạc quan), trước cả khi
// Firebase trả lời — script trong <head> đã mở nội dung, phần này chỉ
// điền nốt email vào thanh đầu trang.
try{
  if(localStorage.getItem(SIGNED_IN_KEY) === '1'){
    showAuthed(localStorage.getItem(EMAIL_KEY) || '');
  }
}catch(e){}

onAuthStateChanged(auth, function(user){
  currentUser = user;
  const gateErr = document.getElementById('tuhoc-gate-err');
  if(gateErr) gateErr.textContent = '';

  if(user){
    try{
      localStorage.setItem(SIGNED_IN_KEY, '1');
      localStorage.setItem(EMAIL_KEY, user.email || '');
    }catch(e){}
    showAuthed(user.email);
    syncFromFirestore(user.uid);           // không chặn việc hiện nội dung
  } else {
    try{
      localStorage.removeItem(SIGNED_IN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    }catch(e){}
    showSignedOut();
    if(unsubscribeSnapshot){ unsubscribeSnapshot(); unsubscribeSnapshot = null; }
  }
});

function wireAuthForm(btnId, emailId, passId, onError){
  const btn = document.getElementById(btnId);
  const email = document.getElementById(emailId);
  const pass = document.getElementById(passId);
  if(!btn || !email || !pass) return;
  const label = btn.textContent;
  const submit = async function(){
    if(btn.disabled) return;
    if(onError) onError('');
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';
    try{
      await signInWithEmailAndPassword(auth, email.value.trim(), pass.value);
    }catch(e){
      if(onError) onError('Sai email hoặc mật khẩu.');
      else alert('Đăng nhập lỗi: ' + e.message);
    }finally{
      btn.disabled = false;
      btn.textContent = label;
    }
  };
  btn.addEventListener('click', submit);
  pass.addEventListener('keydown', function(e){ if(e.key === 'Enter') submit(); });
}

wireAuthForm('tuhoc-gate-btn', 'tuhoc-gate-email', 'tuhoc-gate-pass', function(msg){
  const el = document.getElementById('tuhoc-gate-err');
  if(el) el.textContent = msg;
});
wireAuthForm('auth-signin-btn', 'auth-email', 'auth-password', null);

const signoutBtn = document.getElementById('auth-signout-btn');
if(signoutBtn) signoutBtn.addEventListener('click', function(){ signOut(auth); });
