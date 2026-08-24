const firebaseConfig = {
  apiKey: "AIzaSyCzA9pTWhlbvpSsiPvONaZCDVKb4s3w0Wg",
  authDomain: "mcq-jungle.firebaseapp.com",
  projectId: "mcq-jungle",
  storageBucket: "mcq-jungle.firebasestorage.app",
  messagingSenderId: "497002604691",
  appId: "1:497002604691:web:5a49c89157a8a9069ac566",
  measurementId: "G-3JE8FFEY4C"
};

firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();
const firebaseDb = firebase.firestore();

window.cloudState = {
  user: null,
  ready: false,
  pulling: false,
  saveTimer: null
};

const CLOUD_KEYS = [
  "studentProfile",
  "attemptHistory",
  "certificates",
  "questionBookmarks",
  "wrongQuestionKeys",
  "activeQuiz"
];

function cloudEscape(value=""){
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
}

function compactAttempts(rows){
  return (Array.isArray(rows) ? rows : []).slice(-100).map(item => ({
    subject: item.subject || "",
    name: item.name || item.test || "",
    mode: item.mode || "",
    score: Number(item.score || 0),
    total: Number(item.total || 0),
    attempted: Number(item.attempted || 0),
    incorrect: Number(item.incorrect || 0),
    unattempted: Number(item.unattempted || 0),
    pct: Number(item.pct || 0),
    time: Number(item.time || item.timeTaken || 0),
    date: item.date || "",
    profile: item.profile || null
  }));
}

function readLocalJson(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function cloudPayload(){
  return {
    profile: readLocalJson("studentProfile", null),
    attempts: compactAttempts(readLocalJson("attemptHistory", [])),
    certificates: readLocalJson("certificates", []).slice(-100),
    bookmarks: readLocalJson("questionBookmarks", []),
    wrongQuestionKeys: readLocalJson("wrongQuestionKeys", []),
    activeQuiz: readLocalJson("activeQuiz", null),
    email: cloudState.user?.email || "",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

async function cloudSaveNow(){
  if (!cloudState.user || cloudState.pulling) return;
  try {
    await firebaseDb.collection("users").doc(cloudState.user.uid).set(cloudPayload(), {merge:true});
    updateCloudIndicator("Synced");
  } catch (error) {
    console.error("Cloud save failed:", error);
    updateCloudIndicator("Sync pending");
  }
}

window.cloudQueueSave = function(key){
  if (!cloudState.user || cloudState.pulling || !CLOUD_KEYS.includes(key)) return;
  clearTimeout(cloudState.saveTimer);
  updateCloudIndicator("Saving…");
  cloudState.saveTimer = setTimeout(cloudSaveNow, 700);
};

async function cloudPull(){
  if (!cloudState.user) return;
  cloudState.pulling = true;
  try {
    const ref = firebaseDb.collection("users").doc(cloudState.user.uid);
    const snap = await ref.get();

    if (snap.exists) {
      const data = snap.data() || {};
      if (data.profile) localStorage.setItem("studentProfile", JSON.stringify(data.profile));
      if (Array.isArray(data.attempts)) localStorage.setItem("attemptHistory", JSON.stringify(data.attempts));
      if (Array.isArray(data.certificates)) localStorage.setItem("certificates", JSON.stringify(data.certificates));
      if (Array.isArray(data.bookmarks)) localStorage.setItem("questionBookmarks", JSON.stringify(data.bookmarks));
      if (Array.isArray(data.wrongQuestionKeys)) localStorage.setItem("wrongQuestionKeys", JSON.stringify(data.wrongQuestionKeys));
      if (data.activeQuiz) localStorage.setItem("activeQuiz", JSON.stringify(data.activeQuiz));
    } else {
      await ref.set(cloudPayload(), {merge:true});
    }
    updateCloudIndicator("Synced");
  } catch (error) {
    console.error("Cloud pull failed:", error);
    updateCloudIndicator("Offline");
  } finally {
    cloudState.pulling = false;
  }
}

function authMessage(text, isError=false){
  const el = document.getElementById("authMessage");
  if (!el) return;
  el.className = isError ? "auth-message error" : "auth-message success";
  el.textContent = text;
}

window.renderAuthScreen = function(mode="login"){
  const appElement = document.getElementById("app");
  const nav = document.querySelector(".bottom-nav");
  if (nav) nav.style.display = "none";
  document.getElementById("miniTimer").style.display = "none";

  const signup = mode === "signup";
  appElement.innerHTML = `
    <section class="auth-shell">
      <article class="card auth-card">
        <img src="logo-jungle.jpg" class="auth-logo" alt="MCQ Jungle">
        <span class="badge">Cloud Account</span>
        <h1>${signup ? "Create Student Account" : "Welcome Back"}</h1>
        <p>${signup ? "Your progress will be available on every device." : "Sign in to continue your MCQ practice."}</p>

        ${signup ? `
        <div class="form-grid">
          <div class="full"><label>Full name</label><input class="input" id="authName" autocomplete="name"></div>
          <div><label>Course</label>
            <select id="authCourse">
              <option value="CMA">CMA</option>
              <option value="CA">CA</option>
            </select>
          </div>
          <div><label>Current level</label>
            <select id="authLevel">
              <option>CMA Foundation</option>
              <option>CMA Intermediate</option>
              <option selected>CMA Final</option>
              <option>CA Intermediate</option>
              <option>CA Final</option>
            </select>
          </div>
          <div class="full"><label>City</label><input class="input" id="authCity" autocomplete="address-level2"></div>
        </div>` : ""}

        <label>Email</label>
        <input class="input" id="authEmail" type="email" autocomplete="email">

        <label style="margin-top:12px">Password</label>
        <input class="input" id="authPassword" type="password" autocomplete="${signup ? "new-password" : "current-password"}">

        <div id="authMessage"></div>

        <div class="actions" style="margin-top:16px">
          <button class="btn" onclick="${signup ? "firebaseSignup()" : "firebaseLogin()"}">${signup ? "Create Account" : "Login"}</button>
          ${!signup ? `<button class="btn ghost" onclick="firebaseForgotPassword()">Forgot Password</button>` : ""}
        </div>

        <button class="auth-switch" onclick="renderAuthScreen('${signup ? "login" : "signup"}')">
          ${signup ? "Already registered? Login" : "New student? Create account"}
        </button>
      </article>
    </section>`;
};

window.firebaseSignup = async function(){
  const name = document.getElementById("authName").value.trim();
  const city = document.getElementById("authCity").value.trim();
  const course = document.getElementById("authCourse").value;
  const level = document.getElementById("authLevel").value;
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  if (!name || !city || !email || password.length < 6) {
    authMessage("Enter name, city, valid email and a password of at least 6 characters.", true);
    return;
  }

  try {
    authMessage("Creating account…");
    const credential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
    await credential.user.updateProfile({displayName:name});
    const profile = {name, city, course, level, email};
    localStorage.setItem("studentProfile", JSON.stringify(profile));
    await firebaseDb.collection("users").doc(credential.user.uid).set({
      profile,
      email,
      attempts: [],
      certificates: [],
      bookmarks: [],
      wrongQuestionKeys: [],
      activeQuiz: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true});
    authMessage("Account created.");
  } catch (error) {
    authMessage(firebaseErrorText(error), true);
  }
};

window.firebaseLogin = async function(){
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  try {
    authMessage("Signing in…");
    await firebaseAuth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    authMessage(firebaseErrorText(error), true);
  }
};

window.firebaseForgotPassword = async function(){
  const email = document.getElementById("authEmail").value.trim();
  if (!email) {
    authMessage("Enter your email first.", true);
    return;
  }
  try {
    await firebaseAuth.sendPasswordResetEmail(email);
    authMessage("Password reset email sent.");
  } catch (error) {
    authMessage(firebaseErrorText(error), true);
  }
};

window.firebaseLogout = async function(){
  await cloudSaveNow();
  await firebaseAuth.signOut();
};

function firebaseErrorText(error){
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use":"This email is already registered.",
    "auth/invalid-email":"Enter a valid email address.",
    "auth/invalid-credential":"Incorrect email or password.",
    "auth/user-not-found":"No account was found for this email.",
    "auth/wrong-password":"Incorrect email or password.",
    "auth/weak-password":"Use a password of at least 6 characters.",
    "auth/too-many-requests":"Too many attempts. Please try again later.",
    "auth/network-request-failed":"Network error. Check your internet connection."
  };
  return messages[code] || error?.message || "Something went wrong.";
}

window.updateCloudIndicator = function(text){
  const indicator = document.getElementById("cloudStatus");
  if (indicator) indicator.textContent = text;
};

window.startCloudApp = function(){
  const appElement = document.getElementById("app");
  appElement.innerHTML = `<section class="card cloud-loading"><div class="spinner"></div><h2>Loading MCQ Jungle…</h2></section>`;

  firebaseAuth.onAuthStateChanged(async user => {
    cloudState.user = user || null;
    cloudState.ready = true;

    if (!user) {
      renderAuthScreen("login");
      return;
    }

    await cloudPull();
    const nav = document.querySelector(".bottom-nav");
    if (nav) nav.style.display = "grid";
    if (typeof home === "function") home();
  });
};
