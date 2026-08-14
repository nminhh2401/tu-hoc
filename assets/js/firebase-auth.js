// ============================================================
// TỰ HỌC — auth gate + header auth widget + Firestore progress sync.
// Dùng chung cho mọi trang (index và tất cả trang môn học).
// Giao tiếp với script của từng trang qua CustomEvent, không đụng
// vào biến/hàm toàn cục của trang đó:
//   - phát ra "tuhoc:remote-progress" khi có dữ liệu mới từ Firestore
//   - lắng nghe "tuhoc:local-progress-changed" để đẩy lên Firestore
// ============================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const STORAGE_KEY = 'tuhoc-progress';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let unsubscribeSnapshot = null;

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
async function pushToFirestore(){
  if(!currentUser) return;
  try{ await setDoc(doc(db, 'progress', currentUser.uid), readLocalProgress()); }
  catch(e){ console.error('Không lưu được lên Firestore', e); }
}
function subscribeRemote(uid){
  if(unsubscribeSnapshot) unsubscribeSnapshot();
  unsubscribeSnapshot = onSnapshot(doc(db, 'progress', uid), function(snap){
    if(snap.exists()){
      writeLocalProgress(snap.data());
      notifyRemoteProgress(snap.data());
    }
  });
}

window.addEventListener('tuhoc:local-progress-changed', pushToFirestore);

onAuthStateChanged(auth, async function(user){
  currentUser = user;
  const loggedOutEl = document.getElementById('auth-logged-out');
  const loggedInEl = document.getElementById('auth-logged-in');
  const statusEl = document.getElementById('auth-status');
  if(statusEl) statusEl.style.display = 'none';

  document.body.classList.toggle('tuhoc-authed', !!user);
  const gateErr = document.getElementById('tuhoc-gate-err');
  if(gateErr) gateErr.textContent = '';

  if(user){
    if(loggedOutEl) loggedOutEl.style.display = 'none';
    if(loggedInEl) loggedInEl.style.display = 'inline-flex';
    const emailDisplay = document.getElementById('auth-email-display');
    if(emailDisplay) emailDisplay.textContent = user.email;

    try{
      const ref = doc(db, 'progress', user.uid);
      const snap = await getDoc(ref);
      if(snap.exists()){
        writeLocalProgress(snap.data());
        notifyRemoteProgress(snap.data());
      } else {
        await setDoc(ref, readLocalProgress());
      }
    }catch(e){ console.error(e); }

    subscribeRemote(user.uid);
  } else {
    if(loggedOutEl) loggedOutEl.style.display = 'inline-flex';
    if(loggedInEl) loggedInEl.style.display = 'none';
    if(unsubscribeSnapshot){ unsubscribeSnapshot(); unsubscribeSnapshot = null; }
  }
});

function wireAuthForm(btnId, emailId, passId, onError){
  const btn = document.getElementById(btnId);
  const email = document.getElementById(emailId);
  const pass = document.getElementById(passId);
  if(!btn || !email || !pass) return;
  const submit = async function(){
    if(onError) onError('');
    try{ await signInWithEmailAndPassword(auth, email.value.trim(), pass.value); }
    catch(e){ if(onError) onError('Sai email hoặc mật khẩu.'); else alert('Đăng nhập lỗi: ' + e.message); }
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
