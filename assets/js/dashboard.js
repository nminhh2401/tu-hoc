// ============================================================
// TỰ HỌC — bảng điều khiển trang chủ ("Hôm nay").
// Đọc dữ liệu qua progress-store.js, lấy thông tin môn học từ chính
// các thẻ .card[data-subject-id] trong HTML (không khai báo trùng lặp).
// Yêu cầu progress-store.js nạp trước.
// ============================================================
(function(){
  const store = window.TuhocStore;
  if(!store){
    console.error('progress-store.js phải được nạp trước dashboard.js');
    return;
  }

  // Đọc danh sách môn học từ DOM — nguồn sự thật vẫn là index.html
  function subjects(){
    return [...document.querySelectorAll('.card[data-subject-id]')].map(function(card){
      return {
        id:    card.getAttribute('data-subject-id'),
        total: parseInt(card.getAttribute('data-total-days'), 10) || 0,
        href:  card.getAttribute('href'),
        title: (card.querySelector('h2') || {}).textContent || card.getAttribute('data-subject-id'),
        el:    card
      };
    });
  }

  // ---- thẻ môn học (giữ nguyên hành vi cũ của home.js) ----
  function renderSubjectCards(list){
    list.forEach(function(s){
      const done = store.countDone(s.id);
      const fill = s.el.querySelector('.progress-mini-fill');
      const label = s.el.querySelector('.progress-mini-label');
      if(s.total > 0){
        if(fill) fill.style.width = (done / s.total * 100) + '%';
        if(label) label.textContent = done + '/' + s.total;
      }
    });
  }

  // ---- "Học tiếp": ưu tiên chỗ đang dở, sau đó ngày chưa xong đầu tiên ----
  function nextUp(list){
    if(!list.length) return null;
    const last = store.getLastVisit();
    if(last){
      const s = list.filter(function(x){ return x.id === last.s; })[0];
      if(s){
        // nếu ngày đang dở đã xong rồi thì nhảy tới ngày chưa xong kế tiếp
        const day = store.isDayDone(s.id, last.d) ? firstUndone(s) : last.d;
        if(day) return { s: s, day: day, tiep: !store.isDayDone(s.id, last.d) };
      }
    }
    for(const s of list){
      const d = firstUndone(s);
      if(d) return { s: s, day: d, tiep: false };
    }
    return null;   // đã xong hết
  }
  function firstUndone(s){
    for(let d = 1; d <= s.total; d++){
      if(!store.isDayDone(s.id, d)) return d;
    }
    return null;
  }

  function fmtHours(sec){
    if(sec < 60) return '0 phút';
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if(h && m) return h + ' giờ ' + m + ' phút';
    if(h) return h + ' giờ';
    return m + ' phút';
  }

  // ---- ngày thi: hiển thị kỳ thi gần nhất còn hạn ----
  function nearestExam(list){
    let best = null;
    list.forEach(function(s){
      const iso = store.getExamDate(s.id);
      if(!iso) return;
      const d = store.daysUntil(iso);
      if(d === null || d < 0) return;
      if(!best || d < best.days) best = { s: s, iso: iso, days: d };
    });
    return best;
  }

  function render(){
    const list = subjects();
    renderSubjectCards(list);

    // --- Học tiếp ---
    const cta   = document.getElementById('today-cta');
    const ctaT  = document.getElementById('today-cta-title');
    const ctaS  = document.getElementById('today-cta-sub');
    const ctaL  = document.getElementById('today-cta-label');
    const up = nextUp(list);
    if(cta){
      if(up){
        cta.href = up.s.href + '#day-' + up.day;
        if(ctaL) ctaL.textContent = up.tiep ? 'ĐANG HỌC DỞ' : 'HỌC TIẾP';
        if(ctaT) ctaT.textContent = up.s.title;
        if(ctaS) ctaS.textContent = 'Ngày ' + up.day + ' / ' + up.s.total;
        cta.classList.remove('done');
      } else if(list.length){
        cta.href = list[0].href;
        if(ctaL) ctaL.textContent = 'HOÀN THÀNH';
        if(ctaT) ctaT.textContent = 'Xong hết rồi';
        if(ctaS) ctaS.textContent = 'Mở lại để ôn';
        cta.classList.add('done');
      }
    }

    // --- Chuỗi ngày ---
    const streak = store.getStreak();
    const elStreak = document.getElementById('stat-streak');
    if(elStreak) elStreak.textContent = streak;
    const elStreakLabel = document.getElementById('stat-streak-label');
    if(elStreakLabel) elStreakLabel.textContent = streak > 0 ? 'ngày liên tiếp' : 'chưa có chuỗi';

    // --- Tổng tiến độ ---
    let done = 0, total = 0;
    list.forEach(function(s){ done += store.countDone(s.id); total += s.total; });
    const elProg = document.getElementById('stat-progress');
    if(elProg) elProg.textContent = done + '/' + total;

    // --- Thời gian học ---
    const elTime = document.getElementById('stat-time');
    if(elTime) elTime.textContent = fmtHours(store.getTotalSeconds());

    // --- Đếm ngược kỳ thi ---
    const exam = nearestExam(list);
    const elExam = document.getElementById('stat-exam');
    const elExamLabel = document.getElementById('stat-exam-label');
    const input = document.getElementById('exam-input');
    if(elExam){
      if(exam){
        elExam.textContent = exam.days;
        if(elExamLabel) elExamLabel.textContent = exam.days === 0 ? 'thi hôm nay' : 'ngày đến kỳ thi';
        if(input) input.value = exam.iso;
      } else {
        elExam.textContent = '—';
        if(elExamLabel) elExamLabel.textContent = 'chưa đặt ngày thi';
      }
    }
  }

  // Ô đặt ngày thi — gắn cho môn đang ở "học tiếp", hoặc môn đầu tiên
  const input = document.getElementById('exam-input');
  if(input){
    input.addEventListener('change', function(){
      const list = subjects();
      if(!list.length) return;
      const up = nextUp(list);
      const target = up ? up.s.id : list[0].id;
      store.setExamDate(target, input.value || null);
      render();
    });
  }

  window.addEventListener('tuhoc:remote-progress', render);
  render();
})();
