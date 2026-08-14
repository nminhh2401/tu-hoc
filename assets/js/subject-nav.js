// ============================================================
// TỰ HỌC — điều hướng theo ngày + theo dõi tiến độ cho trang môn học.
// Mỗi trang môn học phải gán window.TUHOC_SUBJECT = {id, totalDays}
// TRƯỚC KHI nạp script này (xem subjects/_template.html).
// ============================================================
(function(){
  const SUBJECT = window.TUHOC_SUBJECT;
  if(!SUBJECT || !SUBJECT.id || !SUBJECT.totalDays){
    console.error('TUHOC_SUBJECT chưa được khai báo trước khi nạp subject-nav.js');
    return;
  }
  const SUBJECT_ID = SUBJECT.id;
  const TOTAL_DAYS = SUBJECT.totalDays;
  const STORAGE_KEY = 'tuhoc-progress';

  window.showDay = function(n){
    document.querySelectorAll('.day-section').forEach(function(el){ el.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(el){ el.classList.remove('active'); });
    document.getElementById('day-' + n).classList.add('active');
    document.getElementById('nav-' + n).classList.add('active');
    window.scrollTo(0, 0);
  };

  function loadAllProgress(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveAllProgress(all){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); }catch(e){ /* lưu trữ không khả dụng */ }
  }
  function isDayDone(day){
    const all = loadAllProgress();
    return !!(all[SUBJECT_ID] && all[SUBJECT_ID][day]);
  }
  function setDayDone(day, done){
    const all = loadAllProgress();
    if(!all[SUBJECT_ID]) all[SUBJECT_ID] = {};
    all[SUBJECT_ID][day] = done;
    saveAllProgress(all);
    renderProgress();
    window.dispatchEvent(new CustomEvent('tuhoc:local-progress-changed'));
  }

  function renderProgress(){
    let doneCount = 0;
    for(let d = 1; d <= TOTAL_DAYS; d++){
      const done = isDayDone(d);
      if(done) doneCount++;
      const item = document.getElementById('nav-' + d);
      if(item){
        item.classList.toggle('done', done);
        const st = item.querySelector('.status');
        if(st) st.textContent = done ? '✓ Xong' : 'Đánh dấu';
      }
      const btn = document.getElementById('markdone-' + d);
      if(btn){
        btn.textContent = done ? '✓ Đã đánh dấu hoàn thành ngày ' + d : 'Đánh dấu hoàn thành ngày ' + d;
        btn.classList.toggle('done', done);
      }
    }
    const fill = document.getElementById('progress-bar-fill');
    const label = document.getElementById('progress-label');
    if(fill) fill.style.width = (doneCount / TOTAL_DAYS * 100) + '%';
    if(label) label.textContent = doneCount + '/' + TOTAL_DAYS + ' hoàn thành';
  }
  window.renderProgress = renderProgress;

  // Gắn sự kiện bấm cho từng chấm trạng thái trong sidebar (không điều hướng khi bấm)
  document.querySelectorAll('.nav-item').forEach(function(item, idx){
    const day = idx + 1;
    const st = item.querySelector('.status');
    if(st){
      st.addEventListener('click', function(evt){
        evt.stopPropagation();
        setDayDone(day, !isDayDone(day));
      });
    }
  });

  // Chèn nút "Đánh dấu hoàn thành" vào cuối nội dung mỗi ngày
  document.querySelectorAll('.day-section').forEach(function(section, idx){
    const day = idx + 1;
    const page = section.querySelector('.page');
    if(!page) return;
    const wrap = document.createElement('div');
    wrap.className = 'mark-done-wrap';
    const btn = document.createElement('button');
    btn.id = 'markdone-' + day;
    btn.className = 'mark-done-btn';
    btn.type = 'button';
    btn.addEventListener('click', function(){ setDayDone(day, !isDayDone(day)); });
    wrap.appendChild(btn);
    page.appendChild(wrap);
  });

  window.addEventListener('tuhoc:remote-progress', renderProgress);

  renderProgress();
})();
