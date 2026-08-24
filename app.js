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

const app=document.getElementById("app");
let timer=null,quiz=null,lastResult=null,deferredInstallPrompt=null;
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
const appVersion="v2.7";

const profileData=()=>store.get("studentProfile",null);
const attempts=()=>store.get("attemptHistory",[]);
const certs=()=>store.get("certificates",[]);
const savedQuiz=()=>store.get("activeQuiz",null);
const bookmarkKeys=()=>store.get("questionBookmarks",[]);
const wrongKeys=()=>store.get("wrongQuestionKeys",[]);
const qKey=(subject,id)=>`${subject}:${id}`;

const allQuestionRecords=()=>typeof SUBJECT_DATA!=="undefined"?Object.entries(SUBJECT_DATA).flatMap(([subject,data])=>
 (data.questions||[]).map(q=>({subject,paper:data.paper,subjectName:data.name,...q}))
):[];

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

function hideTimer(){const el=document.getElementById("miniTimer");if(el)el.style.display="none"}
function showTimer(){const el=document.getElementById("miniTimer");if(el)el.style.display="block"}

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
  <p>Search questions instantly, save weak questions and revise them later.</p>

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
  <article class="card tool-card" onclick="spacedRevision()"><h3>🧠 Spaced Revision</h3><p>Revise at the right time based on your performance</p></article>
  <article class="card tool-card" onclick="examModeSetup()"><h3>⏱️ Exam Mode</h3><p>Timed mixed-paper CMA Final simulation</p></article>
  <article class="card tool-card" onclick="pyqTrends()"><h3>📈 PYQ Trends</h3><p>See high-frequency papers and topics</p></article>
  <article class="card tool-card" onclick="myCertificates()"><h3>🎓 Certificates</h3><p>All course certificates</p></article>
  <article class="card tool-card" onclick="leaderboard()"><h3>🏆 Leaderboard</h3><p>Live rankings</p></article>
  <article class="card tool-card" onclick="contact()"><h3>💬 Ask a Doubt</h3><p>Telegram support</p></article>
  <article class="card tool-card" onclick="installApp()"><h3>📱 Install App</h3><p>Add to Android home screen</p></article>
  <article class="card tool-card" onclick="adminLogin()"><span class="badge">Owner Only</span><h3>🛠️ Admin Panel</h3><p>Manage premium access</p></article>
 </section>
 <p class="release-note">Yug Adlakha MCQ Jungle • ${appVersion}</p>`;
}

function showCMAFinal(){
 if(typeof SUBJECT_DATA==="undefined")return;
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
  const options=(q.options||[]).join(" ").toLowerCase();
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
    <p>${(q.options||[]).map((o,i)=>`${String.fromCharCode(65+i)}. ${esc(o)}`).join("<br>")}</p>
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
 if(typeof SUBJECT_DATA==="undefined")return null;
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
    ${(q.options||[]).map((o,i)=>`<div class="option">${String.fromCharCode(65+i)}. ${esc(o)}</div>`).join("")}
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
 if(typeof persist==="function")persist();showTimer();if(typeof startTimer==="function")startTimer();if(typeof render==="function")render();
}

function spacedSchedule(){return store.get("spacedRevision",{})}
function setSpacedSchedule(v){store.set("spacedRevision",v)}
function spacedRevision(){
 const schedule=spacedSchedule(), now=Date.now();
 const due=Object.entries(schedule).filter(([,v])=>Number(v.due||0)<=now).map(([key])=>findQuestionByKey(key)).filter(Boolean);
 if(!due.length){
  const next=Object.values(schedule).filter(v=>v?.due).sort((a,b)=>a.due-b.due)[0];
  app.innerHTML=`<section class="card"><span class="badge">Spaced Revision</span><h1>Nothing Due Right Now 🎯</h1><p>Your scheduled revision queue is clear.</p>${next?`<p class="notice">Next scheduled revision: <b>${new Date(next.due).toLocaleString()}</b></p>`:`<p class="small">Questions will enter the schedule automatically after you answer them incorrectly or mark them for revision.</p>`}<button class="btn ghost" onclick="home()">Home</button></section>`;
  return;
 }
 const minutes=Math.max(20,Math.ceil(due.length*1.2));
 quiz={subject:"REVISION",mode:"spaced",name:`Spaced Revision — ${due.length} Due`,questions:shuffle(due),index:0,answers:Array(due.length).fill(null),review:[],seconds:minutes*60,totalSeconds:minutes*60,chosenMinutes:minutes};
 if(typeof persist==="function")persist();showTimer();if(typeof startTimer==="function")startTimer();if(typeof render==="function")render();
}
function scheduleQuestion(key,level){
 const delays={wrong:1,repeat:3,good:7,strong:30};
 const days=delays[level]||1;
 const s=spacedSchedule(); s[key]={due:Date.now()+days*86400000,level,updatedAt:Date.now()}; setSpacedSchedule(s);
}
function examModeSetup(){
 const total=allQuestionRecords().length;
 const choices=[20,30,50,100].filter(n=>n<=total);
 app.innerHTML=`<section class="card"><span class="badge">Exam Mode</span><h1>CMA Final Exam Simulation</h1><p>Build a mixed-paper timed test from the complete CMA Final question bank.</p><div class="question-count-grid">${choices.map((n,i)=>`<button class="count-btn ${i===0?"active":""}" onclick="selectExamCount(${n})"><strong>${n}</strong><span>Questions</span></button>`).join("")}</div><input type="hidden" id="examCount" value="${choices[0]||0}"><div class="notice">Recommended: 50 questions. Questions are mixed across available CMA Final papers.</div><div class="actions"><button class="btn" onclick="examTimerSetup()">Continue</button><button class="btn ghost" onclick="home()">Back</button></div></section>`;
}
function selectExamCount(n){document.getElementById("examCount").value=n;document.querySelectorAll(".count-btn").forEach(b=>b.classList.toggle("active",Number(b.querySelector("strong").textContent)===n))}
function examTimerSetup(){
 const count=Number(document.getElementById("examCount").value); const mins=Math.max(20,Math.ceil(count*1.2));
 app.innerHTML=`<section class="card timer-setup"><span class="badge">Exam Mode • ${count} Questions</span><h1>Set Exam Time</h1><p>Choose a realistic time limit for your mixed CMA Final simulation.</p><div class="preset-grid"><button class="preset-btn" onclick="setTimerMinutes(30)">30 min</button><button class="preset-btn" onclick="setTimerMinutes(45)">45 min</button><button class="preset-btn active" onclick="setTimerMinutes(${mins})">${mins} min</button><button class="preset-btn" onclick="setTimerMinutes(90)">90 min</button><button class="preset-btn" onclick="setTimerMinutes(120)">120 min</button></div><label>Or enter your own time</label><div class="custom-time-row"><button class="time-step" onclick="changeTimer(-5)">−</button><input class="input timer-input" id="customMinutes" type="number" min="20" max="600" value="${mins}" oninput="syncTimerInput()"><span>minutes</span><button class="time-step" onclick="changeTimer(5)">+</button></div><input type="hidden" id="examCountFinal" value="${count}"><div id="timerError"></div><div class="actions"><button class="btn gold" onclick="startExamFromSetup()">Start Exam</button><button class="btn ghost" onclick="examModeSetup()">Back</button></div></section>`;
 window.selectedTimerMinutes=mins;
}
function startExamFromSetup(){
 const mins=parseInt(document.getElementById("customMinutes").value), count=Number(document.getElementById("examCountFinal").value);
 if(!Number.isFinite(mins)||mins<20||mins>600){document.getElementById("timerError").innerHTML=`<div class="not-attempted">Choose between 20 and 600 minutes.</div>`;return}
 const qs=shuffle(allQuestionRecords()).slice(0,count); quiz={subject:"MIXED",mode:"exam",name:`CMA Final Exam Mode — ${count} Questions`,questions:qs,index:0,answers:Array(qs.length).fill(null),review:[],seconds:mins*60,totalSeconds:mins*60,chosenMinutes:mins}; if(typeof persist==="function")persist();showTimer();if(typeof startTimer==="function")startTimer();if(typeof render==="function")render();
}
function pyqTrends(){
 const records=allQuestionRecords(), topicMap={}, paperMap={}, difficultyMap={};
 records.forEach(q=>{const topic=q.topic||"Uncategorised";topicMap[topic]=(topicMap[topic]||0)+1;paperMap[q.paper]=(paperMap[q.paper]||0)+1;const d=q.difficulty||"Unrated";difficultyMap[d]=(difficultyMap[d]||0)+1});
 const topTopics=Object.entries(topicMap).sort((a,b)=>b[1]-a[1]).slice(0,12), topPapers=Object.entries(paperMap).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
 const yearTagged=records.filter(q=>q.year||q.attempt||q.exam||q.session);
 const yearMap={}; yearTagged.forEach(q=>{const y=q.year||q.attempt||q.exam||q.session;yearMap[y]=(yearMap[y]||0)+1});
 app.innerHTML=`<section class="card"><span class="badge">PYQ Trend Detector</span><h1>What Gets Tested Most?</h1><p>Frequency analysis across the current CMA Final question bank.</p><h2>🔥 Highest-Frequency Topics</h2><div class="review-list">${topTopics.map(([t,n],i)=>`<article class="card"><h3>#${i+1} ${esc(t)}</h3><p><b>${n}</b> questions tagged to this topic.</p></article>`).join("")}</div><h2>📚 Paper Coverage</h2><div class="review-list">${topPapers.map(([p,n])=>`<article class="card"><h3>${esc(p)}</h3><p>${n} questions currently available.</p></article>`).join("")}</div><h2>🎯 Difficulty Mix</h2><p>${Object.entries(difficultyMap).map(([d,n])=>`<span class="badge" style="margin:4px">${esc(d)}: ${n}</span>`).join("")}</p><div class="actions"><button class="btn" onclick="examModeSetup()">Use Exam Mode</button><button class="btn ghost" onclick="home()">Home</button></div></section>`;
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
   <div class="full"><label>City</label><input class="input" id="pCity" value="${esc(p.city||"")}"></div>
  </div>
  <div class="act
