/* ========== 主题管理器 (Theme Manager) ==========
   从 localStorage 读取主题设置，应用到子页面。
   监听主页面的主题变更（跨 tab 同步）。
   在 anime-cartoon-theme.css 之后、subpage-i18n.js 之前加载。
*/
(function() {
  'use strict';
  if (window.__THEME_MANAGER_INIT__) return;
  window.__THEME_MANAGER_INIT__ = true;

  function applyTheme(theme) {
    if (theme === 'cyber') {
      document.documentElement.setAttribute('data-theme', 'cyber');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function getTheme() {
    try { return localStorage.getItem('pb_theme') || 'cartoon'; } catch(e) { return 'cartoon'; }
  }

  // 初始化
  applyTheme(getTheme());

  // 监听主页面的主题变更（跨 tab）
  window.addEventListener('storage', function(e) {
    if (e.key === 'pb_theme' && e.newValue) {
      applyTheme(e.newValue);
    }
  });

  // 页面获得焦点时同步
  window.addEventListener('focus', function() {
    applyTheme(getTheme());
  });
})();
