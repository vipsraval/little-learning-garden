'use strict';
const element = id => document.getElementById(id);
const tokenKey = 'little-learning-garden.readonly';
const url = 'https://api.github.com/repos/vipsraval/little-learning-garden-lessons/contents/maths/garden.json?ref=main';
let lesson;
let roundIndex = 0;
let finishedRound = false;
let completed = false;
function stored(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function store(key,value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key,value);
  } catch { /* Reading and playing still work in memory. */ }
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
function renderRound() {
  const current = lesson.rounds[roundIndex];
  finishedRound = false;
  element('round').textContent = 'Garden '+(roundIndex+1)+' of '+lesson.rounds.length;
  element('prompt').textContent = current.prompt;
  element('feedback').textContent = current.instruction;
  element('next').hidden = true;
  const board = element('bugs');
  board.replaceChildren();
  let marked = 0;
  for (let i = 0; i < current.count; i++) {
    const piece = makeButton(lesson.symbol, () => {
      if (finishedRound || piece.getAttribute('aria-pressed') === 'true') return;
      marked++;
      piece.setAttribute('aria-pressed','true');
      piece.setAttribute('aria-label','Counted '+marked);
      piece.textContent = lesson.symbol+' '+marked;
      speak(String(marked));
    });
    piece.setAttribute('aria-label','Count object '+(i+1));
    piece.setAttribute('aria-pressed','false');
    board.append(piece);
  }
  const choices = element('choices');
  choices.replaceChildren();
  for (const value of current.choices) choices.append(makeButton(value, () => {
    if (finishedRound) return;
    if (value !== current.count) {
      announce(marked === current.count ? lesson.countedHint : current.hint);
      return;
    }
    finishedRound = true;
    announce(current.praise);
    const last = roundIndex === lesson.rounds.length-1;
    if (last) {
      completed = true;
      store('garden.done.'+lesson.id,'yes');
    }
    element('next').textContent = last ? 'Back to my garden' : 'Next garden';
    element('next').hidden = false;
  }));
}
function lessonLink() {
  const link = document.createElement('a');
  link.href = '#lesson';
  link.textContent = lesson.skill+' · '+(completed ? 'Completed' : 'Ready');
  return link;
}
function search() {
  const term = element('search').value.toLowerCase().trim();
  const matches = (lesson.title+' '+lesson.skill).toLowerCase().includes(term);
  element('catalog').replaceChildren(matches ? lessonLink() : 'No matching lessons.');
}
function navigate() {
  window.speechSynthesis?.cancel();
  let page = location.hash.slice(1);
  if (!['lesson','skills'].includes(page)) page = 'home';
  if (!lesson) page = 'gate';
  for (const id of ['gate','home','skills','lesson']) element(id).hidden = id !== page;
  element('nav').hidden = !lesson;
  if (page === 'home') {
    element('title').textContent = lesson.title;
    element('summary').textContent = lesson.summary;
    element('start').textContent = completed ? 'Play again' : 'Start lesson';
    const card = document.createElement('div');
    card.className = 'card';
    card.append(lesson.symbol+' ',lessonLink());
    element('path').replaceChildren(card);
  }
  if (page === 'skills') search();
  if (page === 'lesson') {
    roundIndex = 0;
    element('lessonTitle').textContent = lesson.title;
    renderRound();
  }
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
    if (!Array.isArray(data.rounds) || !data.rounds.length) throw new Error('The lesson could not be loaded.');
    lesson = data;
    completed = stored('garden.done.'+lesson.id) === 'yes';
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
  else { roundIndex++; renderRound(); speak(lesson.rounds[roundIndex].instruction); }
};
element('listen').onclick = () => speak(element('prompt').textContent+' '+element('feedback').textContent);
element('search').oninput = search;
window.addEventListener('hashchange',navigate);
navigate();
const remembered = stored(tokenKey);
if (remembered) unlock(remembered,true);
