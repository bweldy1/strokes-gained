// ═══════════════════════════════════════════════════════════════
// COURSES
// ═══════════════════════════════════════════════════════════════

function renderCourses() {
  const courses = getCourses(), el = document.getElementById('courses-list');
  if(courses.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏌️</div><div class="empty-state-text">No courses saved yet.<br>Add one below.</div></div>`;
    return;
  }
  el.innerHTML = courses.map(c => `<div class="course-card" onclick="startRound('${c.id}')">
    <div class="course-icon">⛳</div>
    <div class="course-info"><div class="course-name">${c.name}</div><div class="course-meta">${c.tees ? c.tees + ' tees · ' : ''}${c.holes.length} holes</div></div>
    <button class="course-action-btn" onclick="event.stopPropagation();openCourseEdit('${c.id}')">✎</button>
    <button class="course-action-btn course-del-btn" onclick="event.stopPropagation();deleteCourse('${c.id}')">×</button>
  </div>`).join('');
}

function openCourseEdit(id) {
  const c = getCourses().find(x => x.id === id); if(!c) return;
  state.editingCourseId = id;
  document.getElementById('course-edit-name').value = c.name || '';
  document.getElementById('course-edit-tees').value = c.tees || '';
  document.getElementById('course-edit-sheet').classList.add('open');
}

function saveCourseEdit() {
  if(!state.editingCourseId) return;
  const courses = getCourses(), idx = courses.findIndex(c => c.id === state.editingCourseId);
  if(idx === -1) return;
  courses[idx].name = document.getElementById('course-edit-name').value.trim() || courses[idx].name;
  courses[idx].tees = document.getElementById('course-edit-tees').value.trim();
  saveCourses(courses);
  state.editingCourseId = null;
  document.getElementById('course-edit-sheet').classList.remove('open');
  renderCourses();
  showToast('Course updated!');
}

function loadCourseHolesJSON() {
  if(!state.editingCourseId) return;
  const c = getCourses().find(x => x.id === state.editingCourseId); if(!c) return;
  document.getElementById('course-edit-sheet').classList.remove('open');
  document.getElementById('course-json-input').value = JSON.stringify({name:c.name, tees:c.tees, holes:c.holes}, null, 2);
  showToast('JSON loaded — edit and save below');
}

function deleteCourse(id) {
  const c = getCourses().find(x => x.id === id); if(!c) return;
  if(!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
  saveCourses(getCourses().filter(x => x.id !== id));
  renderCourses();
  showToast('Course deleted');
}

function handleCourseEditOverlayClick(e) {
  if(e.target === document.getElementById('course-edit-sheet')) {
    state.editingCourseId = null;
    document.getElementById('course-edit-sheet').classList.remove('open');
  }
}

function saveCourseJSON() {
  const raw = document.getElementById('course-json-input').value.trim();
  const errEl = document.getElementById('json-error'); errEl.classList.add('hidden');
  if(!raw) { errEl.textContent = 'Please paste course JSON.'; errEl.classList.remove('hidden'); return; }
  let parsed;
  try { parsed = JSON.parse(raw); } catch(e) { errEl.textContent = 'Invalid JSON: ' + e.message; errEl.classList.remove('hidden'); return; }
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const courses = getCourses(); let added = 0;
  for(const c of arr) {
    if(!c.name || !Array.isArray(c.holes)) { errEl.textContent = 'Each course needs "name" and "holes".'; errEl.classList.remove('hidden'); return; }
    for(const h of c.holes) { if(!h.hole || !h.par || !h.yards) { errEl.textContent = 'Each hole needs "hole", "par", "yards".'; errEl.classList.remove('hidden'); return; } }
    const existIdx = c.id ? courses.findIndex(x => x.id === c.id) : -1;
    if(existIdx >= 0) { courses[existIdx] = c; } else { c.id = c.id || ('course_' + Date.now() + '_' + added); courses.push(c); added++; }
  }
  saveCourses(courses);
  document.getElementById('course-json-input').value = '';
  renderCourses();
  showToast('Course saved!');
}

function showSampleJSON() {
  document.getElementById('course-json-input').value = JSON.stringify([{"name":"Wild Wood Golf Club","tees":"Blue","holes":[{"hole":1,"par":4,"yards":354},{"hole":2,"par":4,"yards":417},{"hole":3,"par":5,"yards":471},{"hole":4,"par":4,"yards":353},{"hole":5,"par":3,"yards":154},{"hole":6,"par":5,"yards":514},{"hole":7,"par":4,"yards":342},{"hole":8,"par":3,"yards":197},{"hole":9,"par":4,"yards":397},{"hole":10,"par":4,"yards":383},{"hole":11,"par":4,"yards":377},{"hole":12,"par":4,"yards":371},{"hole":13,"par":3,"yards":135},{"hole":14,"par":4,"yards":346},{"hole":15,"par":4,"yards":342},{"hole":16,"par":4,"yards":326},{"hole":17,"par":3,"yards":201},{"hole":18,"par":5,"yards":465}]}], null, 2);
}

function startRound(courseId) {
  const course = getCourses().find(c => c.id === courseId); if(!course) return;
  const round = {
    id: 'round_' + Date.now(),
    date: new Date().toISOString(),
    courseName: course.name,
    courseId: course.id,
    holes: course.holes.map(h => ({hole:h.hole, par:h.par, yards:h.yards, yardsOverride:null, shots:[]}))
  };
  updateRound(round);
  state.currentRoundId = round.id;
  state.currentHole = 1;
  state.excludedCategories = new Set();
  showScreen('hole');
}
