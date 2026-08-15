// ============================================================
// TỰ HỌC — kho dữ liệu tiến độ dùng chung.
// Đây là NƠI DUY NHẤT được ghi vào localStorage key 'tuhoc-progress'.
// Trang chủ và trang môn học đều đi qua đây, không tự đọc/ghi nữa.
//
// Cấu trúc (tương thích ngược với dữ liệu cũ):
//   {
//     "dien-hoc": { "1": true, "8": false },     // giữ nguyên như trước
//     "_meta": {
//       "activeDays": { "2026-08-15": 1840 },    // ngày -> số giây đã học
//       "lastVisit":  { "s":"dien-hoc", "d":3, "t":1786... },
//       "exams":      { "dien-hoc": "2026-08-30" }
//     }
//   }
// Khoá "_meta" an toàn vì mọi nơi chỉ truy cập theo all[tênMôn].
//
// Đồng bộ Firestore: phát 'tuhoc:local-progress-changed' sau thay đổi
// đáng kể. Phần đếm giờ ghi im lặng rồi gộp lại, tránh spam ghi mạng.
// ============================================================
(function(){
  const KEY = 'tuhoc-progress';

  function read(){
    try{
      const raw = localStorage.getItem(KEY);
      const o = raw ? JSON.parse(raw) : {};
      return (o && typeof o === 'object') ? o : {};
    }catch(e){ return {}; }
  }
  function saveOnly(all){
    try{ localStorage.setItem(KEY, JSON.stringify(all)); }catch(e){ /* hết dung lượng */ }
  }
  function flush(){
    window.dispatchEvent(new CustomEvent('tuhoc:local-progress-changed'));
  }
  function save(all){ saveOnly(all); flush(); }

  function meta(all){
    if(!all._meta || typeof all._meta !== 'object') all._meta = {};
    const m = all._meta;
    if(!m.activeDays || typeof m.activeDays !== 'object') m.activeDays = {};
    if(!m.exams || typeof m.exams !== 'object') m.exams = {};
    return m;
  }

  function pad(n){ return n < 10 ? '0' + n : '' + n; }
  function dateKey(d){
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  }

  const store = {
    getAll: read,
    dateKey: dateKey,

    isDayDone: function(subject, day){
      const all = read();
      return !!(all[subject] && all[subject][day]);
    },

    setDayDone: function(subject, day, done){
      const all = read();
      if(!all[subject]) all[subject] = {};
      all[subject][day] = done;
      if(done) store._touchToday(all, 0);       // đánh dấu xong cũng tính là ngày có học
      save(all);
    },

    countDone: function(subject){
      const all = read();
      const days = all[subject] || {};
      let n = 0;
      Object.keys(days).forEach(function(k){ if(days[k]) n++; });
      return n;
    },

    // ---- lượt truy cập & thời gian học ----

    _touchToday: function(all, addSec){
      const m = meta(all);
      const k = dateKey(new Date());
      m.activeDays[k] = (m.activeDays[k] || 0) + (addSec || 0);
      return m;
    },

    recordVisit: function(subject, day){
      const all = read();
      const m = store._touchToday(all, 0);
      m.lastVisit = { s: subject, d: day, t: Date.now() };
      save(all);
    },

    // Ghi im lặng — dùng cho nhịp đếm giờ, không đẩy lên mạng mỗi lần.
    addSeconds: function(sec){
      if(!sec || sec < 1) return;
      const all = read();
      store._touchToday(all, Math.round(sec));
      saveOnly(all);
    },

    flush: flush,

    getLastVisit: function(){ return meta(read()).lastVisit || null; },
    getActiveDays: function(){ return meta(read()).activeDays; },

    // Số ngày học liên tiếp. Nếu hôm nay chưa học nhưng hôm qua có,
    // chuỗi vẫn được tính (chưa đứt cho tới hết hôm nay).
    getStreak: function(){
      const days = meta(read()).activeDays;
      const has = function(d){ return Object.prototype.hasOwnProperty.call(days, dateKey(d)); };
      const cur = new Date();
      if(!has(cur)) cur.setDate(cur.getDate() - 1);
      let streak = 0;
      while(has(cur)){
        streak++;
        cur.setDate(cur.getDate() - 1);
      }
      return streak;
    },

    getTotalSeconds: function(){
      const days = meta(read()).activeDays;
      let t = 0;
      Object.keys(days).forEach(function(k){ t += days[k] || 0; });
      return t;
    },

    // ---- ngày thi ----

    getExamDate: function(subject){ return meta(read()).exams[subject] || null; },

    setExamDate: function(subject, iso){
      const all = read();
      const m = meta(all);
      if(iso) m.exams[subject] = iso;
      else delete m.exams[subject];
      save(all);
    },

    // Số ngày còn lại (âm nếu đã qua), tính theo ngày lịch địa phương.
    daysUntil: function(iso){
      if(!iso) return null;
      const parts = iso.split('-');
      if(parts.length !== 3) return null;
      const target = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      const today = new Date();
      target.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return Math.round((target - today) / 86400000);
    }
  };

  window.TuhocStore = store;
})();
