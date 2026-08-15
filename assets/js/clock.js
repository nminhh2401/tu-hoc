// ============================================================
// TỰ HỌC — đồng hồ hiển thị giờ hiện tại.
// Lấy giờ và múi giờ TRỰC TIẾP từ thiết bị đang mở trang, nên mỗi
// máy/điện thoại tự hiển thị đúng giờ địa phương của nó.
// Nhịp cập nhật bám mốc giây thật (tự bù sai lệch), không dùng
// setInterval(1000) vì sẽ trôi dần và nhảy số không đều.
// ============================================================
(function(){
  const elTime  = document.getElementById('clock-time');
  const elSecs  = document.getElementById('clock-secs');
  const elDate  = document.getElementById('clock-date');
  const elZone  = document.getElementById('clock-zone');
  const elGreet = document.getElementById('clock-greet');
  const elRing  = document.getElementById('clock-ring');
  const elPct   = document.getElementById('clock-pct');
  if(!elTime) return;

  const RING_LEN = 2 * Math.PI * 32;   // khớp r=32 trong theme.css

  const zone = (function(){
    try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }
    catch(e){ return ''; }
  })();

  const fmtTime = new Intl.DateTimeFormat('vi-VN', { hour:'2-digit', minute:'2-digit', hour12:false });
  const fmtDate = new Intl.DateTimeFormat('vi-VN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  function pad(n){ return n < 10 ? '0' + n : '' + n; }

  function greet(h){
    if(h < 5)  return 'KHUYA RỒI';
    if(h < 11) return 'CHÀO BUỔI SÁNG';
    if(h < 13) return 'CHÀO BUỔI TRƯA';
    if(h < 18) return 'CHÀO BUỔI CHIỀU';
    return 'CHÀO BUỔI TỐI';
  }

  let lastDate = '';
  let lastGreet = '';
  let lastPct = -1;
  let timer = null;

  function tick(){
    if(timer) clearTimeout(timer);       // tránh chạy song song nhiều chuỗi hẹn giờ
    const now = new Date();

    elTime.textContent = fmtTime.format(now);
    if(elSecs) elSecs.textContent = pad(now.getSeconds());

    const d = fmtDate.format(now);
    if(d !== lastDate){                  // ngày chỉ đổi 1 lần/ngày, không vẽ lại mỗi giây
      lastDate = d;
      if(elDate) elDate.textContent = d;
    }

    const g = greet(now.getHours());
    if(g !== lastGreet){
      lastGreet = g;
      if(elGreet) elGreet.textContent = g;
    }

    // Phần trăm thời gian đã trôi qua trong ngày
    const secsOfDay = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();
    const pct = Math.round(secsOfDay / 864);   // = /86400*100, làm tròn phần trăm
    if(pct !== lastPct){                        // chỉ vẽ lại vòng khi phần trăm đổi
      lastPct = pct;
      if(elPct) elPct.textContent = pct;
      if(elRing) elRing.style.strokeDashoffset = RING_LEN * (1 - pct/100);
    }

    timer = setTimeout(tick, 1000 - (Date.now() % 1000));   // bám đúng đầu giây kế tiếp
  }

  if(elZone){
    const offset = -new Date().getTimezoneOffset() / 60;
    const sign = offset >= 0 ? '+' : '−';
    elZone.textContent = (zone ? zone + ' · ' : '') + 'GMT' + sign + Math.abs(offset);
  }

  tick();

  // Trở lại tab sau khi ẩn lâu: vẽ lại ngay cho khỏi lệch
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) tick();
  });
})();
