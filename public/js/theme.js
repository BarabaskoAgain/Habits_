// Тема без мигания: обычный (не module) скрипт в <head>, выполняется до отрисовки.
// Inline-скрипты запрещены CSP, поэтому отдельный файл. Выбор хранится в localStorage (и в настройках на сервере).
(function () {
  var t = 'system';
  try { t = localStorage.getItem('hb_theme') || 'system'; } catch (e) { /* приватный режим */ }
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function apply() {
    var dark = t === 'dark' || (t === 'system' && mq && mq.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#141110' : '#FAF6F2');
  }
  apply();
  if (mq && mq.addEventListener) mq.addEventListener('change', apply);
  window.hbTheme = function () { return t; };
  window.hbSetTheme = function (v) {
    t = v;
    try { localStorage.setItem('hb_theme', v); } catch (e) { /* ничего */ }
    apply();
  };
})();
