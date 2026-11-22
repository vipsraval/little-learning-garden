'use strict';
const element = id => document.getElementById(id);
const tokenKey = 'little-learning-garden.readonly';
const url = 'https://api.github.com/repos/vipsraval/little-learning-garden-lessons/contents/maths/garden.json?ref=main';
let garden;
let lesson;
let roundIndex = 0;
let finishedRound = false;
let answered = 0;
let sessionStartedAt = 0;
let timerId;
let celebrationRun = 0;
const successPhrases = [
  'Excellent!', 'You did it!', 'Wonderful work!', 'Amazing counting!',
  'Great job!', 'Brilliant!', 'Super thinking!', 'Fantastic!',
  'Terrific work!', 'You are a maths star!', 'Beautiful counting!', 'Way to go!',
  'Outstanding!', 'Clever work!', 'You kept going!', 'That was awesome!',
  'Remarkable!', 'What a great effort!', 'Magnificent!', 'Garden complete!'
];

function stored(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function store(key,value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key,value);
  } catch { /* The lessons still work without saved progress. */ }
}

function isComplete(item) {
  return stored('garden.done.'+item.id) === 'yes';
}

function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(text);
  voice.lang = 'en-US';
  voice.rate = 0.86;
  speechSynthesis.speak(voice);
}

function announce(message) {
  element('feedback').textContent = message;
  speak(message);
}

function makeButton(label,action) {
  const button = document.createElement('button');
  button.textContent = label;
  button.onclick = action;
  return button;
}

function celebrate() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const layer = element('celebration');
  const symbols = ['★','✦','✧','●','◆','—'];
  const colors = ['#e86f51','#f2b84b','#66a96b','#46a9bd','#9368b7'];
  const run = ++celebrationRun;
  layer.replaceChildren();
  for (let index=0; index<34; index++) {
    const piece = document.createElement('span');
    const angle = Math.PI*2*index/34+(Math.random()-.5)*.22;
    const distance = 130+Math.random()*270;
    piece.className = 'celebration-piece';
    piece.textContent = symbols[index%symbols.length];
    piece.style.color = colors[index%colors.length];
    layer.append(piece);
    piece.animate([
      {opacity:0,transform:'translate(-50%,-50%) scale(.3) rotate(0deg)'},
      {opacity:1,offset:.14},
      {opacity:0,transform:'translate(calc(-50% + '+Math.cos(angle)*distance+'px),calc(-50% + '+Math.sin(angle)*distance+'px)) scale(1.1) rotate('+(180+Math.random()*360)+'deg)'}
    ],{
      duration:950+Math.random()*450,
      delay:Math.random()*120,
      easing:'cubic-bezier(.16,.72,.28,1)',
      fill:'forwards'
    });
  }
  setTimeout(() => {
    if (run===celebrationRun) layer.replaceChildren();
  },1600);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = undefined;
}

function updateTime() {
  const seconds = Math.max(0,Math.floor((Date.now()-sessionStartedAt)/1000));
  const minutes = Math.floor(seconds/60);
  element('elapsed').textContent = String(minutes).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
}

function updateTracker() {
  const total = lesson.rounds.length;
  const percentage = Math.round(answered/total*100);
  element('answered').textContent = answered+' / '+total;
  element('points').textContent = percentage+' / 100';
  element('progressFill').style.width = percentage+'%';
}

function startTracker() {
  stopTimer();
  answered = 0;
  sessionStartedAt = Date.now();
  updateTime();
  updateTracker();
  timerId = setInterval(updateTime,1000);
}

function renderCountRound(current) {
  const board = element('bugs');
  let marked = 0;
  for (let index = 0; index < current.count; index++) {
    const piece = makeButton(lesson.symbol, () => {
      if (finishedRound || piece.getAttribute('aria-pressed') === 'true') return;
      marked++;
      piece.setAttribute('aria-pressed','true');
      piece.setAttribute('aria-label','Counted '+marked);
      piece.textContent = lesson.symbol+' '+marked;
      speak(String(marked));
    });
    piece.setAttribute('aria-label','Count object '+(index+1));
    piece.setAttribute('aria-pressed','false');
    board.append(piece);
  }

  for (const value of current.choices) element('choices').append(makeButton(value, () => {
    if (finishedRound) return;
    if (value !== current.count) {
      announce(marked === current.count ? lesson.countedHint : current.hint);
      return;
    }
    finishRound(current.praise);
  }));
}

function renderTenFrameRound(current) {
  const board = element('bugs');
  board.classList.add('ten-frame');
  let planted = 0;
  for (let index = 0; index < 10; index++) {
    const space = makeButton('', () => {
      if (finishedRound) return;
      const filled = space.getAttribute('aria-pressed') === 'true';
      planted += filled ? -1 : 1;
      space.setAttribute('aria-pressed',String(!filled));
      space.setAttribute('aria-label',filled ? 'Empty space '+(index+1) : 'Seed '+planted+' planted');
      space.textContent = filled ? '' : lesson.symbol;
      speak(filled ? 'Removed. '+planted : String(planted));
    });
    space.className = 'frame-space';
    space.setAttribute('aria-label','Empty space '+(index+1));
    space.setAttribute('aria-pressed','false');
    board.append(space);
  }

  element('choices').append(makeButton('Done', () => {
    if (finishedRound) return;
    if (planted !== current.count) {
      announce(current.hint+' You have '+planted+'.');
      return;
    }
    finishRound(current.praise);
  }));
}

function finishRound(message) {
  finishedRound = true;
  answered++;
  updateTracker();
  const praise = successPhrases[roundIndex%successPhrases.length]+' '+message;
  element('feedback').classList.add('success-feedback');
  celebrate();
  announce(praise);
  const last = roundIndex === lesson.rounds.length-1;
  if (last) {
    store('garden.done.'+lesson.id,'yes');
    stopTimer();
  }
  element('next').textContent = last ? 'Back to my garden' : 'Next garden';
  element('next').hidden = false;
}

function renderRound() {
  const current = lesson.rounds[roundIndex];
  finishedRound = false;
  element('round').textContent = 'Garden '+(roundIndex+1)+' of '+lesson.rounds.length;
  element('prompt').textContent = current.prompt;
  element('feedback').textContent = current.instruction;
  element('feedback').classList.remove('success-feedback');
  element('next').hidden = true;
  element('bugs').replaceChildren();
  element('bugs').classList.remove('ten-frame');
  element('choices').replaceChildren();
  if (lesson.activity === 'ten-frame') renderTenFrameRound(current);
  else renderCountRound(current);
}

function lessonLink(item) {
  const link = document.createElement('a');
  link.href = '#lesson/'+item.id;
  link.textContent = item.skill+' · '+(isComplete(item) ? 'Completed' : 'Ready');
  return link;
}

function lessonCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = item.symbol;
  icon.setAttribute('aria-hidden','true');
  card.append(icon,lessonLink(item));
  return card;
}

function search() {
  const term = element('search').value.toLowerCase().trim();
  const matches = garden.lessons.filter(item => (item.title+' '+item.skill).toLowerCase().includes(term));
  element('catalog').replaceChildren(...matches.map(lessonCard));
  if (!matches.length) element('catalog').textContent = 'No matching lessons.';
}

function navigate() {
  window.speechSynthesis?.cancel();
  const route = location.hash.slice(1).split('/');
  let page = route[0];
  if (!['lesson','skills'].includes(page)) page = 'home';
  if (!garden) page = 'gate';
  if (page === 'lesson') lesson = garden.lessons.find(item => item.id === route[1]) || garden.lessons[0];
  for (const id of ['gate','home','skills','lesson']) element(id).hidden = id !== page;
  element('nav').hidden = !garden;
  if (page === 'home') {
    const featured = garden.lessons.find(item => item.id === garden.featuredLessonId) || garden.lessons[0];
    element('title').textContent = featured.title;
    element('summary').textContent = featured.summary;
    element('start').textContent = isComplete(featured) ? 'Play again' : 'Start lesson';
    element('start').href = '#lesson/'+featured.id;
    element('path').replaceChildren(...garden.lessons.map(lessonCard));
  }
  if (page === 'skills') search();
  if (page === 'lesson') {
    roundIndex = 0;
    element('lessonTitle').textContent = lesson.title;
    startTracker();
    renderRound();
  } else stopTimer();
  window.scrollTo(0,0);
}

async function unlock(token,remember) {
  element('open').disabled = true;
  element('status').textContent = 'Opening your garden…';
  try {
    const response = await fetch(url,{
      headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github.raw+json'},
      cache:'no-store',credentials:'omit',redirect:'error'
    });
    if (!response.ok) throw new Error([401,403,404].includes(response.status)
      ? 'Access unavailable. Check the token’s expiry and read access to the lessons repository.'
      : 'GitHub is unavailable. Please try again.');
    const data = await response.json();
    if (!Array.isArray(data.lessons) || !data.lessons.length) throw new Error('The lessons could not be loaded.');
    garden = data;
    store(tokenKey,remember ? token : null);
    element('key').value = '';
    element('status').textContent = '';
    navigate();
  } catch (error) {
    element('status').textContent = error instanceof TypeError ? 'Could not connect. Check your internet connection and try again.' : error.message;
  } finally { element('open').disabled = false; }
}

element('unlock').onsubmit = event => {
  event.preventDefault();
  unlock(element('key').value.trim(),element('remember').checked);
};
element('lock').onclick = () => {
  store(tokenKey,null);
  location.replace(location.pathname);
};
element('next').onclick = () => {
  if (roundIndex === lesson.rounds.length-1) location.hash = 'home';
  else {
    roundIndex++;
    renderRound();
    speak(lesson.rounds[roundIndex].prompt+' '+lesson.rounds[roundIndex].instruction);
  }
};
element('listen').onclick = () => speak(element('prompt').textContent+' '+element('feedback').textContent);
element('search').oninput = search;
window.addEventListener('hashchange',navigate);
navigate();
const remembered = stored(tokenKey);
if (remembered) unlock(remembered,true);
