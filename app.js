const DEFAULT_PREMIUM_CODE="SUBSCRIBEYUGADLAKHA",ADMIN_CODE="YUGADLAKHA@77";
const COURSE_CATALOG=[
 {
  id:"CMA",
  title:"Cost and Management Accountancy",
  shortTitle:"CMA Course",
  levels:[
   {id:"CMA_FOUNDATION",label:"CMA Foundation",status:"coming"},
   {id:"CMA_INTERMEDIATE",label:"CMA Intermediate",status:"coming"},
   {id:"CMA_FINAL",label:"CMA Final",status:"available",action:"showCMAFinal"}
  ]
 },
 {
  id:"CA",
  title:"Chartered Accountancy",
  shortTitle:"CA Course",
  levels:[
   {id:"CA_INTERMEDIATE",label:"CA Intermediate",status:"coming"},
   {id:"CA_FINAL",label:"CA Final",status:"coming"}
  ]
 }
];


const app=document.getElementById("app");let timer=null,quiz=null,lastResult=null,deferredInstallPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e});
const store={
 get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},
 set:(k,v)=>{
  localStorage.setItem(k,JSON.stringify(v));
  if(window.cloudQueueSave)window.cloudQueueSave(k);
 }
};
const getPremiumCode=()=>String(store.get("premiumAccessCode",DEFAULT_PREMIUM_CODE));
const setPremiumCode=code=>store.set("premiumAccessCode",String(code));
const appVersion="Public Beta";

const profileData=()=>store.get("studentProfile",null),attempts=()=>store.get("attemptHistory",[]),certs=()=>store.get("certificates",[]),savedQuiz=()=>store.get("activeQuiz",null);
const bookmarkKeys=()=>store.get("questionBookmarks",[]);
const wrongKeys=()=>store.get("wrongQuestionKeys",[]);
const qKey=(subject,id)=>`${subject}:${id}`;
const allQuestionRecords=()=>Object.entries(SUBJECT_DATA).flatMap(([subject,data])=>
 data.questions.map(q=>({subject,paper:data.paper,subjectName:data.name,...q}))
);

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function shuffle(a){a=[...a];for(let i=a.length-1;i;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function profileSummary(){
 const p=profileData();
 const email=window.cloudState?.user?.email||p?.email||"";
 return p?`<div class="profile-bar">
  <div class="profile-chip"><b>${esc(p.name)}</b> • ${esc(p.level)} • ${esc(p.city)}<small>${esc(email)}</small></div>
  <div class="cloud-chip">☁️ <span id="cloudStatus">Synced</span></div>
  <button class="btn ghost" onclick="profile()">Account</button>
 </div>`:`<div class="profile-bar"><div class="profile-chip">Complete your cloud profile.</div><button class="btn" onclick="profile()">Profile</button></div>`;
}
function stats(code){let r=attempts().filter(x=>x.subject===code);return{tests:r.length,best:r.length?Math.max(...r.map(x=>x.pct)):0,avg:r.length?Math.round(r.reduce((a,b)=>a+b.pct,0)/r.length):0}}
function overall(){let r=attempts();return{tests:r.length,best:r.length?Math.max(...r.map(x=>x.pct)):0,avg:r.length?Math.round(r.reduce((a,b)=>a+b.pct,0)/r.length):0,certs:certs().length}}
function home(){
 clearInterval(timer);hideTimer();
 const o=overall();
 app.innerHTML=`
 <section class="logo-hero">
  <img src="logo-jungle.jpg" class="jungle-logo" alt="Yug Adlakha MCQ Jungle logo">
 </section>

 <section class="hero">
  <span class="badge">CMA & CA MCQ Platform</span>
  <span class="version-pill">${appVersion}</span>
  <h1>Yug Adlakha MCQ Jungle</h1>
  <p>Search questions instantly, practise CMA Final papers, save weak questions and revise them later.</p>

  <div class="smart-search-box">
   <span class="search-icon">🔍</span>
   <input id="homeSearch" type="search"
    placeholder="AI Smart Search: GST, audit, valuation..."
    oninput="smartSearch(this.value)">
  </div>
  
  <div id="searchResults"></div>

  <div class="actions">
   <button class="btn" onclick="document.getElementById('courses').scrollIntoView({behavior:'smooth'})">Choose Your Course</button>
   <button class="btn ghost" onclick="dashboard()">Dashboard</button>
   <a class="btn gold" href="https://youtube.com/@yugadlakha" target="_blank">YouTube</a>
  </div>
 </section>

 ${profileSummary()}
 ${savedQuiz()?`<div class="resume-banner"><b>Unfinished test found.</b><div class="actions"><button class="btn" onclick="resumeTest()">Resume</button><button class="btn ghost" onclick="discardTest()">Discard</button></div></div>`:""}

 <section class="dashboard-grid">
  <article class="card metric"><strong>${o.tests}</strong>Tests</article>
  <article class="card metric"><strong>${o.best}%</strong>Best</article>
  <article class="card metric"><strong>${o.avg}%</strong>Average</article>
  <article class="card metric"><strong>${o.certs}</strong>Certificates</article>
 </section>

 <h2 class="section-title" id="courses">Choose Your Course</h2>
 <section class="course-grid">
 ${COURSE_CATALOG.map(course=>`
  <article class="card course-card">
   <span class="badge">${esc(course.shortTitle)}</span>
   <h2>${esc(course.title)}</h2>
   <p>Select a level to continue.</p>
   <div class="course-levels">
    ${course.levels.map(level=>`
     <button class="level-btn ${level.status==="available"?"active":""}"
      onclick="${level.status==="available"&&level.action?level.action+"()":`comingSoon('${esc(level.label)}','${esc(level.label)}')`}">
      ${esc(level.label)}
      <small>${level.status==="available"?"Available Now":"Coming Soon"}</small>
     </button>`).join("")}
   </div>
  </article>`).join("")}
 </section>

 <section class="card disclaimer-card">
  <span class="badge">Educational Disclaimer</span>
  <h3>Independent Learning Platform</h3>
  <p>Yug Adlakha MCQ Jungle is an independent educational initiative and is not affiliated with or endorsed by ICMAI or ICAI.</p>
 </section>

 <h2 class="section-title">Student Tools</h2>
 <section class="feature-grid">
  <article class="card tool-card" onclick="dashboard()"><h3>📊 Performance</h3><p>Scores and attempt history</p></article>
  <article class="card tool-card" onclick="bookmarksPage()"><h3>🔖 Bookmarks</h3><p>Questions saved during tests</p></article>
  <article class="card tool-card" onclick="wrongNotebook()"><h3>📕 Wrong Notebook</h3><p>Incorrect and skipped questions</p></article>
  <article class="card tool-card" onclick="revisionMode()"><h3>🔄 Revision Mode</h3><p>Retry weak questions</p></article>
  <article class="card tool-card" onclick="myCertificates()"><h3>🎓 Certificates</h3><p>All course certificates</p></article>
  <article class="card tool-card" onclick="leaderboard()"><h3>🏆 Leaderboard</h3><p>Local rankings</p></article>
  <article class="card tool-card" onclick="contact()"><h3>💬 Ask a Doubt</h3><p>Telegram support</p></article>
  <article class="card tool-card" onclick="installApp()"><h3>📱 Install App</h3><p>Add to Android home screen</p></article>
  <article class="card tool-card" onclick="adminLogin()"><span class="badge">Owner Only</span><h3>🛠️ Admin Panel</h3><p>Manage premium access</p></article>
 </section>
 <p class="release-note">Yug Adlakha MCQ Jungle • ${appVersion}</p>`;
}

function showCMAFinal(){
 app.innerHTML=`${profileSummary()}<section class="card"><span class="badge">CMA Final</span><h1>CMA Final MCQ Practice</h1><p>All eight CMA Final papers are available.</p></section><h2 class="section-title">CMA Final Subjects</h2><section class="subject-grid">${Object.entries(SUBJECT_DATA).map(([c,s])=>{let st=stats(c),n=s.questions.length;return`<article class="card subject-card" onclick="openSubject('${c}')"><span class="badge">${s.paper}</span><h3>${c}</h3><p>${esc(s.name)}</p><p><b>${n} MCQs available</b></p><p class="small">Attempts: ${st.tests} • Best: ${st.best}%</p></article>`}).join("")}</section><div class="actions" style="margin-top:18px"><button class="btn ghost" onclick="home()">Back to Courses</button></div>`;
}


function smartSearch(term){
 const output=document.getElementById("searchResults");
 if(!output)return;
 const query=String(term||"").trim().toLowerCase();
 if(query.length<2){output.innerHTML="";return}

 const words=query.split(/\s+/).filter(Boolean);
 const matches=allQuestionRecords().map(q=>{
  const question=String(q.q).toLowerCase();
  const options=q.options.join(" ").toLowerCase();
  const hay=`${question} ${options}`;
  let score=0;
  words.forEach(word=>{if(question.includes(word))score+=3;else if(hay.includes(word))score+=1});
  if(question.includes(query))score+=5;
  return {q,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,25);

 output.innerHTML=matches.length?`
  <div class="search-summary">${matches.length} matching questions</div>
  <div class="search-result-list">${matches.map(({q})=>`
   <article class="search-result-card">
    <div>
     <span class="badge">${q.subject} • ${q.paper}</span>
     <button class="bookmark-mini" onclick="toggleSavedQuestion('${q.subject}',${q.id});smartSearch(document.getElementById('homeSearch').value)" aria-label="Bookmark">${isBookmarked(q.subject,q.id)?"★":"☆"}</button>
    </div>
    <h3>${q.id}. ${esc(q.q)}</h3>
    <p>${q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${esc(o)}`).join("<br>")}</p>
   </article>`).join("")}
  </div>`:`<div class="not-attempted">No matching question found.</div>`;
}

function isBookmarked(subject,id){return bookmarkKeys().includes(qKey(subject,id))}
function toggleSavedQuestion(subject,id){
 const key=qKey(subject,id);
 let list=bookmarkKeys();
 list=list.includes(key)?list.filter(x=>x!==key):[...list,key];
 store.set("questionBookmarks",list);
}
function findQuestionByKey(key){
 const split=String(key).split(":");
 const subject=split[0],id=split.slice(1).join(":");
 const q=SUBJECT_DATA[subject]?.questions.find(x=>String(x.id)===id);
 return q?{subject,paper:SUBJECT_DATA[subject].paper,subjectName:SUBJECT_DATA[subject].name,...q}:null;
}
function collectionPage(title,keys,emptyMessage,type){
 const records=[...new Set(keys)].map(findQuestionByKey).filter(Boolean);
 app.innerHTML=`<section class="card">
  <span class="badge">Smart Revision</span>
  <h1>${esc(title)}</h1>
  ${records.length?`<div class="review-list">${records.map(q=>`
   <article class="card">
    <span class="badge">${q.subject} • ${q.paper}</span>
    <h3>${q.id}. ${esc(q.q)}</h3>
    ${q.options.map((o,i)=>`<div class="option">${String.fromCharCode(65+i)}. ${esc(o)}</div>`).join("")}
   </article>`).join("")}</div>`:`<p>${esc(emptyMessage)}</p>`}
  <div class="actions" style="margin-top:14px">
   ${records.length?`<button class="btn" onclick="startRevision('${type}')">Start Revision Test</button>`:""}
   <button class="btn ghost" onclick="home()">Home</button>
  </div>
 </section>`;
}
function bookmarksPage(){collectionPage("Bookmarked Questions",bookmarkKeys(),"No questions bookmarked yet.","bookmarks")}
function wrongNotebook(){collectionPage("Wrong Answer Notebook",wrongKeys(),"No incorrect or skipped questions saved yet.","wrong")}
function revisionMode(){
 if(!wrongKeys().length){wrongNotebook();return}
 startRevision("wrong");
}
function startRevision(type){
 const keys=type==="bookmarks"?bookmarkKeys():wrongKeys();
 const questions=[...new Set(keys)].map(findQuestionByKey).filter(Boolean);
 if(!questions.length)return alert("No questions available for revision.");
 const minutes=Math.max(20,Math.ceil(questions.length*1.2));
 quiz={subject:"REVISION",mode:"revision",name:type==="bookmarks"?"Bookmarked Revision":"Wrong Answer Revision",questions:shuffle(questions),index:0,answers:Array(questions.length).fill(null),review:[],seconds:minutes*60,totalSeconds:minutes*60,chosenMinutes:minutes};
 persist();showTimer();startTimer();render();
}

function profile(){
 const p=profileData()||{
  name:window.cloudState?.user?.displayName||"",
  email:window.cloudState?.user?.email||"",
  course:"CMA",
  level:"CMA Final",
  city:""
 };
 app.innerHTML=`<section class="card account-card">
  <span class="badge">Cloud Account</span>
  <h1>Student Profile</h1>
  <p class="small">Your profile and progress are synced with Firebase.</p>
  <div class="form-grid">
   <div class="full"><label>Full name</label><input class="input" id="pn" value="${esc(p.name)}"></div>
   <div><label>Course</label><select id="pCourse"><option ${p.course==="CMA"?"selected":""}>CMA</option><option ${p.course==="CA"?"selected":""}>CA</option></select></div>
   <div><label>Current level</label><select id="pl">
    <option ${p.level==="CMA Foundation"?"selected":""}>CMA Foundation</option>
    <option ${p.level==="CMA Intermediate"?"selected":""}>CMA Intermediate</option>
    <option ${p.level==="CMA Final"?"selected":""}>CMA Final</option>
    <option ${p.level==="CA Intermediate"?"selected":""}>CA Intermediate</option>
    <option ${p.level==="CA Final"?"selected":""}>CA Final</option>
   </select></div>
   <div class="full"><label>City</label><input class="input" id="pc" value="${esc(p.city)}"></div>
   <div class="full"><label>Email</label><input class="input" value="${esc(window.cloudState?.user?.email||p.email||"")}" disabled></div>
  </div>
  <div class="actions" style="margin-top:14px">
   <button class="btn" onclick="saveProfile()">Save Profile</button>
   <button class="btn ghost" onclick="home()">Cancel</button>
   <button class="btn danger" onclick="firebaseLogout()">Logout</button>
  </div>
 </section>`;
}
async function saveProfile(){
 const name=document.getElementById("pn").value.trim();
 const city=document.getElementById("pc").value.trim();
 const course=document.getElementById("pCourse").value;
 const level=document.getElementById("pl").value;
 const email=window.cloudState?.user?.email||"";
 if(!name||!city){alert("Enter name and city.");return}
 const profile={name,city,course,level,email};
 store.set("studentProfile",profile);
 if(window.cloudState?.user){
  try{
   await window.cloudState.user.updateProfile({displayName:name});
   await firebaseDb.collection("users").doc(window.cloudState.user.uid).set({
    profile,
    email,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
   },{merge:true});
  }catch(error){console.error(error)}
 }
 home();
}
function openSubject(code){if(!profileData())return profile();let s=SUBJECT_DATA[code],n=s.questions.length,free=Math.min(100,n),premium=Math.max(0,n-100);app.innerHTML=`${profileSummary()}<section class="card"><span class="badge">${s.paper}</span><h1>${code} — ${esc(s.name)}</h1><p>${n} valid scorable MCQs are currently available.</p>
<div class="content-tags">
  <span>MCQ Bank</span><span>Study Material MCQs</span><span>PYQ MCQs</span><span>Model Paper MCQs</span>
</div>
</section><section class="feature-grid"><article class="card mode-card" onclick="timerSetup('${code}','free')"><span class="badge">Free</span><h3>Random ${free} Questions</h3><p>Student chooses the timer • minimum 20 minutes</p></article><article class="card mode-card" onclick="premiumLogin('${code}')"><span class="badge">Premium</span><h3>${premium} Remaining Questions</h3><p>Student chooses the timer • minimum 20 minutes</p></article><article class="card mode-card" onclick="premiumLogin('${code}','mock')"><span class="badge">Full Mock</span><h3>All ${n} Questions</h3><p>Student chooses the timer • premium access</p></article></section>`}
function premiumLogin(code,mode="premium"){app.innerHTML=`<section class="card"><h1>Premium Access</h1><p>Subscribe to Yug Adlakha on YouTube, watch the latest MCQ video and enter the code.</p><a class="btn" href="https://youtube.com/@yugadlakha" target="_blank">Open YouTube</a><input class="input" id="premiumCode" placeholder="Enter access code" style="margin-top:15px"><div class="actions"><button class="btn gold" onclick="checkPremium('${code}','${mode}')">Unlock</button><button class="btn ghost" onclick="openSubject('${code}')">Back</button></div><div id="premiumMessage"></div></section>`}
function checkPremium(c,m){
 if(premiumCode.value.replace(/\s/g,"").toUpperCase()===getPremiumCode().replace(/\s/g,"").toUpperCase())timerSetup(c,m);
 else premiumMessage.innerHTML=`<div class="not-attempted">Invalid code.</div>`;
}
function timerSetup(code,mode){
 const bank=SUBJECT_DATA[code].questions;
 const count=mode==="free"?Math.min(100,bank.length):(mode==="premium"?Math.max(0,bank.length-100):bank.length);
 const label=mode==="free"?"Free Test":(mode==="premium"?"Premium Test":"Full Mock");
 if(!count){alert("No questions available in this mode.");return}
 app.innerHTML=`<section class="card timer-setup">
  <span class="badge">${code} • ${label}</span>
  <h1>Set Your Test Timer</h1>
  <p>Choose the test duration like setting an alarm clock. Minimum duration is <b>20 minutes</b>.</p>
  <div class="clock-face">
   <div class="clock-icon">⏰</div>
   <div class="clock-value"><span id="timerValue">60</span><small>minutes</small></div>
  </div>
  <div class="preset-grid">
   <button class="preset-btn" onclick="setTimerMinutes(20)">20 min</button>
   <button class="preset-btn" onclick="setTimerMinutes(30)">30 min</button>
   <button class="preset-btn active" onclick="setTimerMinutes(60)">60 min</button>
   <button class="preset-btn" onclick="setTimerMinutes(90)">90 min</button>
   <button class="preset-btn" onclick="setTimerMinutes(120)">120 min</button>
   <button class="preset-btn" onclick="setTimerMinutes(180)">180 min</button>
  </div>
  <label style="margin-top:16px">Or enter your own time</label>
  <div class="custom-time-row">
   <button class="time-step" onclick="changeTimer(-5)">−</button>
   <input class="input timer-input" id="customMinutes" type="number" min="20" max="600" value="60" oninput="syncTimerInput()">
   <span>minutes</span>
   <button class="time-step" onclick="changeTimer(5)">+</button>
  </div>
  <div id="timerError"></div>
  <div class="notice">The test will auto-submit when the selected time ends. Warnings appear at 15 minutes and 5 minutes remaining.</div>
  <div class="actions" style="margin-top:16px">
   <button class="btn" onclick="confirmTimerAndStart('${code}','${mode}')">Start ${label}</button>
   <button class="btn ghost" onclick="openSubject('${code}')">Back</button>
  </div>
 </section>`;
 window.selectedTimerMinutes=60;
}

function setTimerMinutes(minutes){
 window.selectedTimerMinutes=minutes;
 document.getElementById("timerValue").textContent=minutes;
 document.getElementById("customMinutes").value=minutes;
 document.querySelectorAll(".preset-btn").forEach(b=>b.classList.toggle("active",b.textContent.trim()===minutes+" min"));
 document.getElementById("timerError").innerHTML="";
}

function changeTimer(delta){
 const input=document.getElementById("customMinutes");
 let value=Math.max(20,Math.min(600,(parseInt(input.value)||20)+delta));
 input.value=value;
 syncTimerInput();
}

function syncTimerInput(){
 const input=document.getElementById("customMinutes");
 const value=parseInt(input.value);
 if(!Number.isFinite(value))return;
 window.selectedTimerMinutes=value;
 document.getElementById("timerValue").textContent=value;
 document.querySelectorAll(".preset-btn").forEach(b=>b.classList.remove("active"));
 document.getElementById("timerError").innerHTML=value<20?`<div class="not-attempted" style="margin-top:10px">Minimum test time is 20 minutes.</div>`:"";
}

function confirmTimerAndStart(code,mode){
 const minutes=parseInt(document.getElementById("customMinutes").value);
 if(!Number.isFinite(minutes)||minutes<20){
  document.getElementById("timerError").innerHTML=`<div class="not-attempted" style="margin-top:10px">Please choose at least 20 minutes.</div>`;
  return;
 }
 if(minutes>600){
  document.getElementById("timerError").innerHTML=`<div class="not-attempted" style="margin-top:10px">Maximum timer allowed is 600 minutes.</div>`;
  return;
 }
 startMode(code,mode,minutes);
}

function startMode(code,mode,minutes){
 let bank=SUBJECT_DATA[code].questions,qs,name;
 if(mode==="free"){qs=shuffle(bank.slice(0,Math.min(100,bank.length)));name=`${code} Free Test`}
 else if(mode==="premium"){qs=shuffle(bank.slice(100));name=`${code} Premium Test`}
 else{qs=shuffle(bank);name=`${code} Full Mock`}
 if(!qs.length)return alert("No questions available in this mode.");
 quiz={subject:code,mode,name,questions:qs,index:0,answers:Array(qs.length).fill(null),review:[],seconds:minutes*60,totalSeconds:minutes*60,chosenMinutes:minutes};
 persist();showTimer();startTimer();render();
}
function persist(){store.set("activeQuiz",quiz)}function resumeTest(){quiz=savedQuiz();showTimer();startTimer();render()}function discardTest(){localStorage.removeItem("activeQuiz");home()}
function startTimer(){clearInterval(timer);updateTimer();timer=setInterval(()=>{quiz.seconds--;persist();updateTimer();if(quiz.seconds<=0){clearInterval(timer);submit(true)}},1000)}
function fmt(s){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}function showTimer(){miniTimer.style.display="block"}function hideTimer(){miniTimer.style.display="none"}function updateTimer(){miniTimer.textContent=fmt(quiz.seconds);miniTimer.classList.toggle("warn",quiz.seconds<=900&&quiz.seconds>300);miniTimer.classList.toggle("danger",quiz.seconds<=300)}
function render(){let q=quiz.questions[quiz.index],chosen=quiz.answers[quiz.index],answered=quiz.answers.filter(x=>x!==null).length,total=quiz.questions.length;app.innerHTML=`<div class="quiz-layout"><section class="card"><div class="quiz-head"><strong>${quiz.name}: ${quiz.index+1}/${total}</strong><div class="progress"><span style="width:${(quiz.index+1)/total*100}%"></span></div></div><div class="question">${q.id}. ${esc(q.q)}</div><div class="options">${q.options.map((o,i)=>`<button class="option ${chosen===i?"selected":""}" onclick="answer(${i})"><b>${String.fromCharCode(65+i)}.</b> ${esc(o)}</button>`).join("")}</div><div class="navrow"><button class="btn ghost" onclick="prev()">← Previous</button><button class="btn gold" onclick="markReview()">${quiz.review.includes(quiz.index)?"Remove Review":"Mark Review"}</button><button class="btn ghost" onclick="bookmarkCurrent()">${isBookmarked(quiz.subject,q.id)?"★ Saved":"☆ Bookmark"}</button><button class="btn" onclick="next()">${quiz.index===total-1?"Finish":"Next →"}</button></div></section><aside class="card"><div class="stats"><div class="stat"><b>${answered}</b>Answered</div><div class="stat"><b>${total-answered}</b>Left</div><div class="stat"><b>${quiz.review.length}</b>Review</div></div><div class="palette">${quiz.questions.map((_,i)=>`<button class="qnum ${quiz.answers[i]!==null?"answered":""} ${quiz.review.includes(i)?"review":""} ${i===quiz.index?"current":""}" onclick="go(${i})">${i+1}</button>`).join("")}</div><button class="btn" style="width:100%;margin-top:12px" onclick="submit(false)">Submit</button></aside></div>`}
function bookmarkCurrent(){const q=quiz.questions[quiz.index];toggleSavedQuestion(quiz.subject,q.id);render()}
function answer(i){quiz.answers[quiz.index]=i;persist();render()}function prev(){if(quiz.index>0){quiz.index--;persist();render()}}function next(){if(quiz.index<quiz.questions.length-1){quiz.index++;persist();render()}else submit(false)}function go(i){quiz.index=i;persist();render()}function markReview(){let i=quiz.index;quiz.review.includes(i)?quiz.review=quiz.review.filter(x=>x!==i):quiz.review.push(i);persist();render()}
function submit(auto){if(!auto&&!confirm("Submit test?"))return;clearInterval(timer);hideTimer();localStorage.removeItem("activeQuiz");let correct=0;quiz.questions.forEach((q,i)=>{if(quiz.answers[i]===q.answer)correct++});let total=quiz.questions.length,attempted=quiz.answers.filter(x=>x!==null).length,incorrect=attempted-correct,unattempted=total-attempted,pct=Math.round(correct/total*100),p=profileData(),time=quiz.totalSeconds-quiz.seconds;lastResult={...quiz,score:correct,total,attempted,incorrect,unattempted,pct,time,profile:p,date:new Date().toLocaleString()};let h=attempts();h.push(lastResult);store.set("attemptHistory",h);
 let wrong=wrongKeys();
 quiz.questions.forEach((q,i)=>{
  const key=qKey(quiz.subject,q.id);
  if(quiz.answers[i]!==q.answer){if(!wrong.includes(key))wrong.push(key)}
  else wrong=wrong.filter(x=>x!==key);
 });
 store.set("wrongQuestionKeys",wrong);if(pct>=70)addCert(lastResult);app.innerHTML=`<section class="card result"><h1>${esc(quiz.name)} Result</h1><div class="score">${correct}/${total}</div><h2>${pct}%</h2><div class="result-summary"><div class="summary-box"><b>${attempted}</b>Attempted</div><div class="summary-box"><b>${correct}</b>Correct</div><div class="summary-box"><b>${incorrect}</b>Incorrect</div><div class="summary-box"><b>${unattempted}</b>Unattempted</div><div class="summary-box"><b>${Math.floor(time/60)}m</b>Time</div><div class="summary-box"><b>${pct>=70?"Yes":"No"}</b>Certificate</div></div><div class="actions"><button class="btn" onclick="review()">Review Submitted</button>${pct>=70?`<button class="btn gold" onclick="myCertificates()">Certificate</button>`:""}<button class="btn ghost" onclick="home()">Home</button></div></section>`}
function review(){
 app.innerHTML=`<section class="card">
  <h1>Submitted Answer Review</h1>
  <p>Correct answers are shown only for attempted questions. Use “Report Wrong Question” if you notice a mistake.</p>
  <div class="review-list">${lastResult.questions.map((q,i)=>{
   let u=lastResult.answers[i];
   if(u===null)return`<article class="card"><h3>${q.id}. ${esc(q.q)}</h3><div class="not-attempted"><b>Not Attempted</b><br>Correct answer hidden.</div></article>`;
   return`<article class="card">
    <h3>${q.id}. ${esc(q.q)}</h3>
    <div class="option ${u===q.answer?"correct":"wrong"}"><b>Your answer:</b> ${String.fromCharCode(65+u)}. ${esc(q.options[u])}</div>
    <div class="option correct"><b>Correct answer:</b> ${String.fromCharCode(65+q.answer)}. ${esc(q.options[q.answer])}</div>
    <button class="btn danger report-btn" onclick="reportQuestion('${lastResult.subject}',${q.id})">Report Wrong Question</button>
   </article>`}).join("")}</div>
  <button class="btn" onclick="home()">Home</button>
 </section>`;
}
function reportQuestion(subject,id){
 const text=`Hello Yug, I want to report a possible issue in ${subject}, Question ${id}, on Yug Adlakha MCQ Jungle.`;
 window.open(`https://t.me/Yugadlakha?text=${encodeURIComponent(text)}`,"_blank");
}
function addCert(r){let cs=certs(),id=`YCH-${r.subject}-${Date.now().toString(36).toUpperCase()}`;cs.push({id,subject:r.subject,test:r.name,score:r.score,total:r.total,pct:r.pct,date:r.date,profile:r.profile});store.set("certificates",cs)}
function myCertificates(){let cs=certs();app.innerHTML=`<section class="card"><h1>My Certificates</h1>${cs.length?cs.map((c,i)=>`<article class="card"><h3>${c.subject} — ${esc(c.test)}</h3><p>${c.score}/${c.total} (${c.pct}%) • ${esc(c.id)}</p><button class="btn gold" onclick="showCert(${i})">Open</button></article>`).join(""):"<p>No certificate yet.</p>"}<button class="btn ghost" onclick="home()">Home</button></section>`}
function showCert(i){let c=certs()[i];app.innerHTML=`<section class="certificate"><img src="icon-192.png" style="width:90px"><h1>Certificate of Achievement</h1><p>Presented to</p><div class="name">${esc(c.profile.name)}</div><p>${esc(c.profile.level)} • ${esc(c.profile.city)}</p><h2>${c.subject} — ${esc(c.test)}</h2><p>Score: <b>${c.score}/${c.total} (${c.pct}%)</b></p><p>Certificate ID: ${esc(c.id)}</p><p>Issued by Yug Adlakha MCQ Jungle</p><p>${esc(c.date)}</p></section><button class="btn gold" onclick="window.print()">Print / Save PDF</button>`}
function dashboard(){let rows=attempts(),o=overall();app.innerHTML=`<section class="card"><h1>Performance Dashboard</h1><p class="small">${esc(window.cloudState?.user?.email||"")}</p><section class="dashboard-grid"><article class="card metric"><strong>${o.tests}</strong>Tests</article><article class="card metric"><strong>${o.best}%</strong>Best</article><article class="card metric"><strong>${o.avg}%</strong>Average</article><article class="card metric"><strong>${o.certs}</strong>Certificates</article></section><h2>Subject Performance</h2>${Object.entries(SUBJECT_DATA).map(([c,s])=>{let x=stats(c);return`<article class="card"><h3>${c} — ${esc(s.name)}</h3><p>Attempts: ${x.tests} • Best: ${x.best}% • Average: ${x.avg}%</p></article>`}).join("")}<button class="btn ghost" onclick="home()">Home</button></section>`}
function leaderboard(){let r=attempts().sort((a,b)=>b.pct-a.pct).slice(0,10);app.innerHTML=`<section class="card"><h1>Leaderboard</h1><p class="small">Stored on this device until Firebase is connected.</p><table class="leaderboard"><tr><th>Rank</th><th>Name</th><th>Level</th><th>Score</th></tr>${r.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.profile.name)}</td><td>${esc(x.profile.level)}</td><td>${x.pct}%</td></tr>`).join("")}</table><button class="btn ghost" onclick="home()">Home</button></section>`}
function contact(){app.innerHTML=`<section class="card"><h1>Ask a Doubt</h1><div class="contact-grid"><a class="btn" href="https://t.me/yugadlakha05" target="_blank">Telegram Channel</a><a class="btn gold" href="https://t.me/Yugadlakha" target="_blank">Message Yug</a></div></section>`}
async function installApp(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice}else alert("In Chrome, use menu → Add to Home screen.")}
function adminLogin(){
 app.innerHTML=`<section class="card admin-login-card">
  <span class="badge">Owner Only</span>
  <h1>Admin Login</h1>
  <p>Enter the owner code to manage premium access.</p>
  <input class="input" id="ac" type="password" placeholder="Admin code">
  <div class="actions" style="margin-top:14px">
   <button class="btn" onclick="checkAdmin()">Continue</button>
   <button class="btn ghost" onclick="home()">Back</button>
  </div>
 </section>`;
}
function checkAdmin(){
 const entered=document.getElementById("ac").value.trim().toUpperCase();
 if(entered===ADMIN_CODE.toUpperCase())adminPanel();
 else alert("Incorrect admin code.");
}
function adminPanel(){
 app.innerHTML=`<section class="card admin-dashboard">
  <span class="badge">Owner Dashboard</span>
  <h1>Admin Panel</h1>
  <p class="small">Only the website owner should use this section.</p>

  <div class="admin-grid">
   <article class="card">
    <h3>🔐 Premium Code</h3>
    <p>Change the code students use for premium tests and full mocks.</p>
    <label>Current premium code</label>
    <input class="input" id="newPremiumCode" value="${esc(getPremiumCode())}" autocomplete="off">
    <button class="btn gold" style="margin-top:12px" onclick="savePremiumCode()">Save New Code</button>
   </article>

   <article class="card">
    <h3>📚 Course Status</h3>
    <p>CMA Final is live. Other CMA and CA levels remain marked Coming Soon until their MCQ files are added.</p>
    <div class="not-attempted">Future course setup is kept inside the source code and is not shown to students.</div>
   </article>
  </div>

  <div id="adminStatus"></div>
  <div class="actions" style="margin-top:16px">
   <button class="btn ghost" onclick="home()">Back Home</button>
  </div>
 </section>`;
}
function savePremiumCode(){
 const code=document.getElementById("newPremiumCode").value.trim();
 if(code.length<4){
  document.getElementById("adminStatus").innerHTML=`<div class="not-attempted" style="margin-top:12px">Use at least 4 characters.</div>`;
  return;
 }
 setPremiumCode(code);
 document.getElementById("adminStatus").innerHTML=`<div class="success-note" style="margin-top:12px"><b>Saved.</b> The new premium code is active on this device.</div>`;
}

homeBtn.onclick=home;themeBtn.onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("theme",document.body.classList.contains("dark")?"dark":"light");themeBtn.textContent=document.body.classList.contains("dark")?"☀️":"🌙"};if(localStorage.getItem("theme")==="dark"){document.body.classList.add("dark");themeBtn.textContent="☀️"}window.startCloudApp?window.startCloudApp():home();
