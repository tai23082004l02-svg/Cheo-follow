// ==UserScript==
// @name         Kiem tra Tampermonkey Facebook
// @namespace    cheo-follow.debug
// @version      1.0.0
// @description  Hiển thị thông báo để kiểm tra script có chạy trên Facebook hay không.
// @match        *://facebook.com/*
// @match        *://www.facebook.com/*
// @match        *://web.facebook.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';
  console.log('[Tampermonkey test] Script is executing on', location.href);
  function show() {
    if (document.getElementById('tm-test-banner')) return;
    const box = document.createElement('div');
    box.id = 'tm-test-banner';
    box.textContent = 'TAMPERMONKEY ĐANG CHẠY ✓';
    box.style.cssText = 'position:fixed!important;top:110px!important;left:50%!important;transform:translateX(-50%)!important;z-index:2147483647!important;background:#dc2626!important;color:white!important;padding:22px!important;border:4px solid #fff!important;border-radius:12px!important;font:bold 22px Arial!important;box-shadow:0 4px 20px #0008!important;pointer-events:none!important';
    (document.body || document.documentElement).appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
  else show();
})();
