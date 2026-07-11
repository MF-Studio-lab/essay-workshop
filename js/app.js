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

  // 匯出
  const btnExport = document.getElementById('btn-export');
  const exportMenu = document.getElementById('export-menu');

  // AI 潤稿
  const polishStyle = document.getElementById('polish-style');
  const btnPolish = document.getElementById('btn-polish');
  const polishStatus = document.getElementById('polish-status');
  const polishOutput = document.getElementById('polish-output');
  const polishResult = document.getElementById('polish-result');
  const btnPolishApply = document.getElementById('btn-polish-apply');
  const btnPolishDiscard = document.getElementById('btn-polish-discard');

  // ==================== 狀態 ====================
  let currentTab = 'list';
  let editingId = null;
  let saveTimer = null;
  let lastSavedContent = '';
  let polishTimer = null;       // 潤稿 debounce
  let polishedText = '';        // 潤稿結果暫存

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
    const cleaned = text.replace(/\s/g, '');
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

    essayList.querySelectorAll('.essay-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete"]')) return;
        const id = parseInt(card.dataset.id);
        openEditor(id);
      });
    });

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
    polishedText = '';

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
    resetPolishUI();
    switchTab('editor');

    setTimeout(() => essayEditor.focus(), 100);
  }

  function deleteEssay(id) {
    if (!confirm('確定要刪除這篇作文嗎？此操作無法復原。')) return;

    let essays = loadEssays();
    essays = essays.filter(e => e.id !== id);
    saveAllEssays(essays);

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
      const idx = essays.findIndex(e => e.id === editingId);
      if (idx !== -1) {
        essays[idx].title = title;
        essays[idx].content = content;
        essays[idx].wordCount = wordCount;
        essays[idx].updatedAt = now;
      }
    } else {
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

  // ==================== 自動儲存 ====================
  function autoSave() {
    const content = essayEditor.value;
    if (content === lastSavedContent) return;

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

  // ==================== 匯出功能 ====================
  function exportEssay(format) {
    const title = titleInput.value.trim() || '無標題';
    const content = essayEditor.value;

    if (!content) {
      alert('沒有內容可供匯出。');
      return;
    }

    let text, filename, mimeType;

    if (format === 'md') {
      text = `# ${title}\n\n${content}`;
      filename = `${sanitizeFilename(title)}.md`;
      mimeType = 'text/markdown';
    } else {
      text = `${title}\n${'='.repeat(Math.min(title.length, 40))}\n\n${content}`;
      filename = `${sanitizeFilename(title)}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob(['\uFEFF' + text], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    polishStatus.textContent = `已匯出 ${format.toUpperCase()}`;
    polishStatus.classList.add('success');
    setTimeout(() => {
      polishStatus.textContent = '';
      polishStatus.classList.remove('success');
    }, 2000);
  }

  function sanitizeFilename(str) {
    return str.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 40) || 'essay';
  }

  function toggleExportMenu(e) {
    e.stopPropagation();
    exportMenu.classList.toggle('hidden');
  }

  function closeExportMenu(e) {
    if (!exportMenu.contains(e.target) && e.target !== btnExport) {
      exportMenu.classList.add('hidden');
    }
  }

// ==================== AI 潤稿功能 ====================
  const POLISH_PROMPTS = {
    fluency: '請在不改變原意的情況下，優化以下中文文章的語句流暢度和用詞。保持原有結構，只潤飾文句。直接回傳潤飾後的全文，不要加入任何說明：',
    concise: '請精簡以下中文文章，移除重複或冗餘的句子，但保留所有重要觀點。直接回傳精簡後的全文，不要加入任何說明：',
    expand: '請在不改變原意的情況下，為以下中文文章補充更多細節與描寫，使內容更豐富。直接回傳擴寫後的全文，不要加入任何說明：',
    formal: '請將以下中文文章轉換為較正式的書面語氣，適合投稿或學術用途。直接回傳轉換後的全文，不要加入任何說明：'
  };

  function resetPolishUI() {
    polishOutput.classList.add('hidden');
    polishResult.innerHTML = '';
    polishedText = '';
    polishStatus.textContent = '';
    polishStatus.classList.remove('loading', 'error', 'success');
  }

  async function doPolish() {
    const content = essayEditor.value;
    if (!content) {
      alert('請先輸入作文內容再進行潤稿。');
      return;
    }

    const style = polishStyle.value;
    const prompt = POLISH_PROMPTS[style] + '\n\n' + content;

    // UI loading state
    btnPolish.disabled = true;
    polishStatus.textContent = 'AI 潤稿中...';
    polishStatus.classList.add('loading');
    polishOutput.classList.add('hidden');

    try {
      const resp = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'openai',
          seed: Math.floor(Math.random() * 1000000)
        })
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`API 錯誤 (${resp.status}): ${errBody.slice(0, 200)}`);
      }

      const result = await resp.text();

      if (!result.trim()) {
        throw new Error('模型未回傳結果，請稍後再試。');
      }

      polishedText = result.trim();
      polishResult.textContent = polishedText;
      polishOutput.classList.remove('hidden');
      polishStatus.textContent = '潤稿完成 ✓';
      polishStatus.classList.remove('loading');
      polishStatus.classList.add('success');

    } catch (err) {
      polishStatus.textContent = err.message;
      polishStatus.classList.remove('loading');
      polishStatus.classList.add('error');
    } finally {
      btnPolish.disabled = false;
    }
  }

  function applyPolish() {
    if (!polishedText) return;
    essayEditor.value = polishedText;
    lastSavedContent = polishedText;
    updateWordCount();
    saveStatus.textContent = '未儲存';
    saveStatus.classList.add('unsaved');
    resetPolishUI();
  }

  function discardPolish() {
    resetPolishUI();
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
        openEditor(null);
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
    resetPolishUI();
  });

  titleInput.addEventListener('input', () => {
    scheduleAutoSave();
    saveStatus.textContent = '未儲存';
    saveStatus.classList.add('unsaved');
  });

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

  // 匯出事件
  btnExport.addEventListener('click', toggleExportMenu);
  exportMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-format]');
    if (btn) {
      exportEssay(btn.dataset.format);
      exportMenu.classList.add('hidden');
    }
  });
  document.addEventListener('click', closeExportMenu);

  // AI 潤稿事件
  btnPolish.addEventListener('click', doPolish);
  btnPolishApply.addEventListener('click', applyPolish);
  btnPolishDiscard.addEventListener('click', discardPolish);

  // ==================== 初始化 ====================
  renderEssayList();
  updateWordCount();

  // ==================== 暴露必要函數到 window ====================
  window.switchTab = switchTab;
})();