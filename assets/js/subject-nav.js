// ============================================================
// TỰ HỌC — điều hướng theo ngày + theo dõi tiến độ cho trang môn học.
// Mỗi trang môn học phải gán window.TUHOC_SUBJECT = {id, totalDays}
// TRƯỚC KHI nạp script này (xem subjects/_template.html).
// Yêu cầu progress-store.js đã được nạp trước.
// ============================================================
(function(){
  const SUBJECT = window.TUHOC_SUBJECT;
  const store = window.TuhocStore;
  if(!SUBJECT || !SUBJECT.id || !SUBJECT.totalDays){
    console.error('TUHOC_SUBJECT chưa được khai báo trước khi nạp subject-nav.js');
    return;
  }
  if(!store){
    console.error('progress-store.js phải được nạp trước subject-nav.js');
    return;
  }
  const SUBJECT_ID = SUBJECT.id;
  const TOTAL_DAYS = SUBJECT.totalDays;

  let currentDay = 1;

  window.showDay = function(n){
    n = Math.min(Math.max(parseInt(n, 10) || 1, 1), TOTAL_DAYS);
    const section = document.getElementById('day-' + n);
    const nav = document.getElementById('nav-' + n);
    if(!section || !nav) return;
    document.querySelectorAll('.day-section').forEach(function(el){ el.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(el){ el.classList.remove('active'); });
    section.classList.add('active');
    nav.classList.add('active');
    currentDay = n;
    store.recordVisit(SUBJECT_ID, n);
    window.scrollTo(0, 0);
  };

  function setDayDone(day, done){
    store.setDayDone(SUBJECT_ID, day, done);
    renderProgress();
  }

  function renderProgress(){
    let doneCount = 0;
    for(let d = 1; d <= TOTAL_DAYS; d++){
      const done = store.isDayDone(SUBJECT_ID, d);
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
        setDayDone(day, !store.isDayDone(SUBJECT_ID, day));
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
    btn.addEventListener('click', function(){ setDayDone(day, !store.isDayDone(SUBJECT_ID, day)); });
    wrap.appendChild(btn);
    page.appendChild(wrap);
  });

  window.addEventListener('tuhoc:remote-progress', renderProgress);

  // ---- Đếm thời gian học, hoàn toàn thụ động ----
  // Chỉ cộng giờ khi tab đang hiển thị. Ghi im lặng vào localStorage mỗi
  // 30 giây, chỉ đẩy lên Firestore khi rời trang / ẩn tab — tránh việc
  // ghi mạng liên tục.
  let lastTick = Date.now();
  let pending = 0;

  function accumulate(){
    const now = Date.now();
    if(!document.hidden){
      const delta = (now - lastTick) / 1000;
      if(delta > 0 && delta < 120){       // bỏ qua khoảng nghỉ dài (máy ngủ)
        pending += delta;
      }
    }
    lastTick = now;
    if(pending >= 30){
      store.addSeconds(pending);
      pending = 0;
    }
  }
  function commit(){
    accumulate();
    if(pending > 0){
      store.addSeconds(pending);
      pending = 0;
    }
    store.flush();
  }

  setInterval(accumulate, 15000);
  document.addEventListener('visibilitychange', function(){
    if(document.hidden) commit();
    else lastTick = Date.now();
  });
  window.addEventListener('pagehide', commit);

  // ---- Khởi động: mở đúng ngày theo URL (#day-3), mặc định ngày 1 ----
  const m = /^#day-(\d+)$/.exec(window.location.hash || '');
  const startDay = m ? parseInt(m[1], 10) : 1;

  renderProgress();
  showDay(startDay);

  window.addEventListener('hashchange', function(){
    const h = /^#day-(\d+)$/.exec(window.location.hash || '');
    if(h) showDay(parseInt(h[1], 10));
  });
})();
