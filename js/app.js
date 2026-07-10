/**
 * 作文工坊 — SPA 應用邏輯
 * 使用 IIFE 封裝，避免全局變量污染
 */
(function () {
  'use strict';

  // ==================== DOM 引用 ====================
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabList = document.getElementById('tab-list');
  const tabEditor = document.getElementById('tab-editor');
  const essayList = document.getElementById('essay-list');
  const essayCount = document.getElementById('essay-count');
  const titleInput = document.getElementById('essay-title');
  const essayEditor = document.getElementById('essay-editor');
  const wordCountEl = document.getElementById('word-count');
  const wordMinHint = document.getElementById('word-min-hint');
  const saveStatus = document.getElementById('save-status');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');

  // ==================== 狀態 ====================
  let currentTab = 'list';
  let editingId = null;        // 正在編輯的作文 ID（null = 新增）
  let saveTimer = null;        // 自動儲存 debounce
  let lastSavedContent = '';   // 上次儲存的內容

  // ==================== LocalStorage 管理 ====================
  const STORAGE_KEY = 'essay-workshop-data';

  function loadEssays() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data;
    } catch (e) {
      return [];
    }
  }

  function saveAllEssays(essays) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(essays));
      return true;
    } catch (e) {
      console.error('儲存失敗：', e);
      return false;
    }
  }

  // ==================== 字數計算 ====================
  function countWords(text) {
    if (!text) return 0;
    // 移除空白後計算字數：包含中文、英文、數字、標點
    const cleaned = text.replace(/\s/g, '');
    // 使用 Array.from 正確處理 Unicode（含中日韓字元）
    return Array.from(cleaned).length;
  }

  // ==================== Tab 切換 ====================
  function switchTab(tabName) {
    currentTab = tabName;

    navTabs.forEach(t => t.classList.remove('active'));
    const activeNav = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeNav) activeNav.classList.add('active');

    tabList.classList.toggle('active', tabName === 'list');
    tabEditor.classList.toggle('active', tabName === 'editor');

    if (tabName === 'list') {
      renderEssayList();
    }
  }

  // ==================== 渲染作文列表 ====================
  function renderEssayList() {
    const essays = loadEssays();
    essayCount.textContent = `${essays.length} 篇`;

    if (essays.length === 0) {
      essayList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>還沒有任何作文</p>
          <p class="empty-hint">點擊上方「撰寫新篇」開始寫作吧！</p>
        </div>`;
      return;
    }

    essayList.innerHTML = essays
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(e => {
        const date = new Date(e.updatedAt).toLocaleDateString('zh-TW', {
          year: 'numeric', month: 'short', day: 'numeric'
        });
        const preview = e.content.replace(/\s/g, '').slice(0, 60);
        return `
        <div class="essay-card" data-id="${e.id}">
          <div class="essay-card-title">${escapeHtml(e.title || '無標題')}${e.wordCount < 400 ? ' <span class="draft-badge">草稿</span>' : ''}</div>
          <div class="essay-card-meta">
            <span>${e.wordCount} 字</span>
            <span>${date}</span>
          </div>
          <div class="essay-card-meta" style="margin-top: 0.25rem;">
            <span style="font-size: 0.82rem; color: #9ca3af;">${escapeHtml(preview)}${preview.length < countWords(e.content) ? '...' : ''}</span>
          </div>
          <div class="essay-card-actions">
            <button class="btn-sm btn-sm-danger" data-action="delete" data-id="${e.id}">刪除</button>
          </div>
        </div>`;
      }).join('');

    // 綁定點擊事件：點擊卡片進入編輯
    essayList.querySelectorAll('.essay-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // 如果點到刪除按鈕就不進入編輯
        if (e.target.closest('[data-action="delete"]')) return;
        const id = parseInt(card.dataset.id);
        openEditor(id);
      });
    });

    // 綁定刪除按鈕
    essayList.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        deleteEssay(id);
      });
    });
  }

  // ==================== 編輯器操作 ====================
  function openEditor(id) {
    const essays = loadEssays();
    const essay = id !== null ? essays.find(e => e.id === id) : null;

    editingId = essay ? essay.id : null;

    if (essay) {
      titleInput.value = essay.title || '';
      essayEditor.value = essay.content || '';
    } else {
      titleInput.value = '';
      essayEditor.value = '';
    }

    lastSavedContent = essayEditor.value;
    updateWordCount();
    saveStatus.textContent = '已儲存';
    saveStatus.classList.remove('unsaved');
    switchTab('editor');

    // 聚焦編輯器
    setTimeout(() => essayEditor.focus(), 100);
  }

  function deleteEssay(id) {
    if (!confirm('確定要刪除這篇作文嗎？此操作無法復原。')) return;

    let essays = loadEssays();
    essays = essays.filter(e => e.id !== id);
    saveAllEssays(essays);

    // 如果在編輯該作文，清空編輯器
    if (editingId === id) {
      editingId = null;
      titleInput.value = '';
      essayEditor.value = '';
      updateWordCount();
    }

    renderEssayList();
  }

  function saveCurrentEssay() {
    const title = titleInput.value.trim();
    const content = essayEditor.value;

    if (!content) {
      alert('請輸入作文內容。');
      return;
    }

    const wordCount = countWords(content);

    if (wordCount < 400) {
      if (!confirm(`⚠️ 目前只有 ${wordCount} 個字，尚未達到完整作文的 400 字門檻。\n\n仍可儲存為草稿，之後再回來補完。\n確定要儲存嗎？`)) {
        return;
      }
    }

    const essays = loadEssays();
    const now = Date.now();

    if (editingId !== null) {
      // 更新現有作文
      const idx = essays.findIndex(e => e.id === editingId);
      if (idx !== -1) {
        essays[idx].title = title;
        essays[idx].content = content;
        essays[idx].wordCount = wordCount;
        essays[idx].updatedAt = now;
      }
    } else {
      // 新增作文
      const newId = essays.length > 0 ? Math.max(...essays.map(e => e.id)) + 1 : 1;
      essays.push({
        id: newId,
        title: title || '無標題',
        content: content,
        wordCount: wordCount,
        createdAt: now,
        updatedAt: now
      });
      editingId = newId;
    }

    if (saveAllEssays(essays)) {
      lastSavedContent = content;
      saveStatus.textContent = '已儲存';
      saveStatus.classList.remove('unsaved');
      updateWordCount();
    } else {
      alert('儲存失敗，請檢查瀏覽器儲存空間。');
    }
  }

  // ==================== 自動儲存（debounce） ====================
  function autoSave() {
    const content = essayEditor.value;
    if (content === lastSavedContent) return; // 內容未變

    const essays = loadEssays();
    const title = titleInput.value.trim();
    const wordCount = countWords(content);
    const now = Date.now();

    if (editingId !== null) {
      const idx = essays.findIndex(e => e.id === editingId);
      if (idx !== -1) {
        essays[idx].title = title;
        essays[idx].content = content;
        essays[idx].wordCount = wordCount;
        essays[idx].updatedAt = now;
      }
    } else if (content.trim()) {
      // 草稿模式：尚未手動儲存，但已有內容 — 建立臨時記錄
      const newId = essays.length > 0 ? Math.max(...essays.map(e => e.id)) + 1 : 1;
      essays.push({
        id: newId,
        title: title || '無標題',
        content: content,
        wordCount: wordCount,
        createdAt: now,
        updatedAt: now
      });
      editingId = newId;
    }

    if (saveAllEssays(essays)) {
      lastSavedContent = content;
      saveStatus.textContent = '已儲存';
      saveStatus.classList.remove('unsaved');
    }
  }

  function scheduleAutoSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(autoSave, 1500);
  }

  // ==================== 字數更新 ====================
  function updateWordCount() {
    const count = countWords(essayEditor.value);
    wordCountEl.textContent = `字數：${count}`;

    if (count < 400) {
      wordMinHint.textContent = `（尚缺 ${400 - count} 字，可先儲存草稿）`;
      wordMinHint.classList.add('warn');
    } else {
      wordMinHint.textContent = '（已達 400 字）';
      wordMinHint.classList.remove('warn');
    }
  }

  // ==================== 工具函數 ====================
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== 事件綁定 ====================
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (tabName === 'editor') {
        openEditor(null); // 新增模式
      } else {
        switchTab(tabName);
      }
    });
  });

  essayEditor.addEventListener('input', () => {
    updateWordCount();
    scheduleAutoSave();
    saveStatus.textContent = '未儲存';
    saveStatus.classList.add('unsaved');
  });

  titleInput.addEventListener('input', () => {
    scheduleAutoSave();
    saveStatus.textContent = '未儲存';
    saveStatus.classList.add('unsaved');
  });

  // Ctrl+S / Cmd+S 快速儲存
  essayEditor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentEssay();
    }
  });

  btnSave.addEventListener('click', saveCurrentEssay);

  btnCancel.addEventListener('click', () => {
    if (confirm('確定要取消嗎？未儲存的變更將遺失。')) {
      editingId = null;
      titleInput.value = '';
      essayEditor.value = '';
      lastSavedContent = '';
      updateWordCount();
      switchTab('list');
    }
  });

  // ==================== 初始化 ====================
  renderEssayList();
  updateWordCount();

  // ==================== 暴露必要函數到 window（供 HTML onclick 等使用） ====================
  window.switchTab = switchTab;
})();