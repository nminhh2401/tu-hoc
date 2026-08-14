// ============================================================
// TỰ HỌC — trang chủ: đọc tiến độ đã lưu và hiển thị lên từng thẻ môn học.
// ============================================================
(function(){
  const STORAGE_KEY = 'tuhoc-progress';

  function renderSubjectCards(){
    let all = {};
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      all = raw ? JSON.parse(raw) : {};
    }catch(e){ all = {}; }
    document.querySelectorAll('.card[data-subject-id]').forEach(function(card){
      const id = card.getAttribute('data-subject-id');
      const total = parseInt(card.getAttribute('data-total-days'), 10) || 0;
      const days = all[id] || {};
      let done = 0;
      Object.keys(days).forEach(function(k){ if(days[k]) done++; });
      const fill = card.querySelector('.progress-mini-fill');
      const label = card.querySelector('.progress-mini-label');
      if(total > 0){
        if(fill) fill.style.width = (done / total * 100) + '%';
        if(label) label.textContent = done + '/' + total;
      }
    });
  }

  window.addEventListener('tuhoc:remote-progress', renderSubjectCards);
  renderSubjectCards();
})();
