// ============================================================
// TỰ HỌC — nút chuyển sáng/tối (đọc trạng thái đã lưu ở đầu <head>
// qua theme-init.js để tránh nháy sai theme khi tải trang).
// ============================================================
(function(){
  const btn = document.getElementById('theme-toggle-btn');
  if(!btn) return;
  btn.addEventListener('click', function(){
    const current = document.documentElement.getAttribute('data-theme');
    const isDark = current
      ? current === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try{ localStorage.setItem('tuhoc-theme', next); }catch(e){}
  });
})();
