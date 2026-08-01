/* ========== 子页面中英文切换工具 ========== */
(function() {
  'use strict';
  if (window.__SUBPAGE_I18N_INIT__) return;
  window.__SUBPAGE_I18N_INIT__ = true;

  function getLang() {
    try { return localStorage.getItem('mathos_lang') || 'zh'; } catch(e) { return 'zh'; }
  }

  function applyTranslations(lang) {
    var dict = window.__PAGE_I18N__;
    if (!dict) return;
    var d = dict[lang] || dict.zh;
    if (!d) return;

    // data-i18n 元素
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (d[key] !== undefined) {
        // 保留子元素（如 .count span）
        var children = el.children;
        if (children.length > 0) {
          // 只替换第一个文本节点
          if (el.firstChild && el.firstChild.nodeType === 3) {
            el.firstChild.textContent = d[key];
          }
        } else {
          el.textContent = d[key];
        }
      }
    });

    // placeholder
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-ph');
      if (d[key]) el.placeholder = d[key];
    });

    // title 属性
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-title');
      if (d[key]) el.title = d[key];
    });

    // 返回按钮
    var backBtn = document.querySelector('.anime-back-btn, .back-btn, .home-btn');
    if (backBtn) {
      backBtn.textContent = lang === 'en' ? '\u2190 Back to Library' : '\u2190 \u8fd4\u56de\u7ed8\u672c\u9986';
    }

    // 页面 title
    if (d.page_title) {
      document.title = d.page_title;
    }

    // html lang
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }

  // 监听主页面的语言变更（跨 tab）
  window.addEventListener('storage', function(e) {
    if (e.key === 'mathos_lang' && e.newValue) {
      applyTranslations(e.newValue);
    }
  });

  // 页面获得焦点时同步（防止漏掉 storage 事件）
  window.addEventListener('focus', function() {
    applyTranslations(getLang());
  });

  // 初始化
  function init() {
    applyTranslations(getLang());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
