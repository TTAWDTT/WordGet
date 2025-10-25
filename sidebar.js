// Sidebar JavaScript for WordGet

let currentWords = [];
let currentFilter = 'all';
let currentSearch = '';
let currentWordId = null;
let currentTheme = null;
let isLoading = false;

// Initialize sidebar
document.addEventListener('DOMContentLoaded', () => {
  console.log('Sidebar initializing...');
  loadWords();
  setupEventListeners();
  loadSettings();
  loadAndApplyTheme();
});

// Setup all event listeners
function setupEventListeners() {
  // Header actions
  document.getElementById('refreshBtn').addEventListener('click', loadWords);
  document.getElementById('settingsBtn').addEventListener('click', showSettings);
  
  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    filterAndDisplayWords();
  });
  
  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      filterAndDisplayWords();
    });
  });
  
  // Back buttons
  document.getElementById('backToList').addEventListener('click', showWordList);
  document.getElementById('backFromSettings').addEventListener('click', showWordList);
  
  // Word detail actions
  document.getElementById('pronounceBtn').addEventListener('click', pronounceWord);
  document.getElementById('markReviewedBtn').addEventListener('click', toggleReviewed);
  document.getElementById('deleteWordBtn').addEventListener('click', deleteCurrentWord);
  document.getElementById('detailNotes').addEventListener('blur', saveNotes);
  
  // Settings actions
  document.getElementById('exportBtn').addEventListener('click', exportWords);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importWords);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllWords);
  
  // Settings inputs
  document.getElementById('translationAPI').addEventListener('change', saveSettings);
  document.getElementById('apiKey').addEventListener('blur', saveSettings);
  document.getElementById('autoOpenSidebar').addEventListener('change', saveSettings);
  document.getElementById('captureContext').addEventListener('change', saveSettings);
  
  // Add adaptive theme listener if element exists
  const adaptiveThemeCheckbox = document.getElementById('adaptiveTheme');
  if (adaptiveThemeCheckbox) {
    adaptiveThemeCheckbox.addEventListener('change', saveSettings);
  }
}

// Load words from storage
async function loadWords() {
  if (isLoading) {
    console.log('Already loading words, skipping...');
    return;
  }
  
  isLoading = true;
  
  try {
    console.log('Loading words from storage...');
    const response = await chrome.runtime.sendMessage({ action: 'getWords' });
    currentWords = response.words || [];
    console.log('Loaded', currentWords.length, 'words');
    filterAndDisplayWords();
  } catch (error) {
    console.error('Error loading words:', error);
    // Show error message to user
    const container = document.getElementById('wordListContainer');
    if (container) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: #dc3545;">加载单词失败，请刷新页面重试</div>';
    }
  } finally {
    isLoading = false;
  }
}

// Filter and display words based on current filters
function filterAndDisplayWords() {
  let filtered = currentWords;
  
  // Apply filter
  if (currentFilter === 'reviewed') {
    filtered = filtered.filter(w => w.reviewed);
  } else if (currentFilter === 'unreviewed') {
    filtered = filtered.filter(w => !w.reviewed);
  }
  
  // Apply search
  if (currentSearch) {
    filtered = filtered.filter(w => 
      w.text.toLowerCase().includes(currentSearch) ||
      (w.translation && w.translation.toLowerCase().includes(currentSearch)) ||
      (w.sentence && w.sentence.toLowerCase().includes(currentSearch))
    );
  }
  
  displayWords(filtered);
}

// Display words in the list
function displayWords(words) {
  const container = document.getElementById('wordListContainer');
  const emptyState = document.getElementById('emptyState');
  const totalWords = document.getElementById('totalWords');
  
  totalWords.textContent = words.length;
  
  if (words.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  
  container.innerHTML = words.map(word => `
    <div class="word-item" data-word-id="${word.id}" data-reviewed="${word.reviewed || false}">
      <div class="word-item-header">
        <div class="word-item-text">
          ${escapeHtml(word.text)}
          ${word.reviewed ? '<span class="reviewed-badge">已掌握</span>' : ''}
        </div>
        <div class="word-item-meta">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
            <polyline points="12 6 12 12 16 14" stroke-width="2" stroke-linecap="round"/>
          </svg>
          ${formatDate(word.timestamp)}
        </div>
      </div>
      ${word.translation ? `<div class="word-item-translation">${escapeHtml(word.translation)}</div>` : ''}
      ${word.sentence ? `<div class="word-item-sentence">"${escapeHtml(truncate(word.sentence, 80))}"</div>` : ''}
    </div>
  `).join('');
  
  // Add click handlers
  container.querySelectorAll('.word-item').forEach(item => {
    item.addEventListener('click', () => {
      showWordDetail(item.dataset.wordId);
    });
  });
}

// Show word detail view
async function showWordDetail(wordId) {
  const word = currentWords.find(w => w.id === wordId);
  if (!word) return;
  
  currentWordId = wordId;
  
  document.getElementById('wordList').style.display = 'none';
  document.getElementById('wordDetail').classList.remove('hidden');
  
  // Populate word details
  document.getElementById('detailWordText').textContent = word.text;
  document.getElementById('detailNotes').value = word.notes || '';
  document.getElementById('detailSource').textContent = word.pageTitle || 'Unknown source';
  document.getElementById('detailUrl').href = word.url || '#';
  
  // Update reviewed button
  const reviewBtn = document.getElementById('markReviewedBtn');
  if (word.reviewed) {
    reviewBtn.classList.add('reviewed');
    reviewBtn.querySelector('.reviewed-text').style.display = 'none';
    reviewBtn.querySelector('.unreviewed-text').style.display = 'inline';
  } else {
    reviewBtn.classList.remove('reviewed');
    reviewBtn.querySelector('.reviewed-text').style.display = 'inline';
    reviewBtn.querySelector('.unreviewed-text').style.display = 'none';
  }
  
  // Load translation if not available
  if (word.translation) {
    document.getElementById('detailTranslation').innerHTML = escapeHtml(word.translation);
  } else {
    document.getElementById('detailTranslation').innerHTML = '<div class="loading">加载翻译中...</div>';
    const translation = await translateText(word.text);
    document.getElementById('detailTranslation').innerHTML = escapeHtml(translation);
    
    // Update word with translation
    await chrome.runtime.sendMessage({
      action: 'updateWord',
      wordId: word.id,
      updates: { translation }
    });
    word.translation = translation;
  }
  
  // Handle sentence section
  const sentenceSection = document.getElementById('sentenceSection');
  if (word.sentence) {
    sentenceSection.style.display = 'block';
    document.getElementById('detailSentence').textContent = word.sentence;
    
    if (word.sentenceTranslation) {
      document.getElementById('detailSentenceTranslation').innerHTML = escapeHtml(word.sentenceTranslation);
    } else {
      document.getElementById('detailSentenceTranslation').innerHTML = '<div class="loading">加载翻译中...</div>';
      const sentenceTranslation = await translateText(word.sentence);
      document.getElementById('detailSentenceTranslation').innerHTML = escapeHtml(sentenceTranslation);
      
      // Update word with sentence translation
      await chrome.runtime.sendMessage({
        action: 'updateWord',
        wordId: word.id,
        updates: { sentenceTranslation }
      });
      word.sentenceTranslation = sentenceTranslation;
    }
  } else {
    sentenceSection.style.display = 'none';
  }
}

// Translate text
async function translateText(text) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'translate',
      text: text,
      targetLang: 'zh-CN'
    });
    return response.translation || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// Pronounce word (using Web Speech API)
function pronounceWord() {
  const word = document.getElementById('detailWordText').textContent;
  
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }
}

// Toggle reviewed status
async function toggleReviewed() {
  if (!currentWordId) return;
  
  const word = currentWords.find(w => w.id === currentWordId);
  if (!word) return;
  
  const newReviewedStatus = !word.reviewed;
  
  await chrome.runtime.sendMessage({
    action: 'updateWord',
    wordId: currentWordId,
    updates: { reviewed: newReviewedStatus }
  });
  
  word.reviewed = newReviewedStatus;
  
  // Update button
  const reviewBtn = document.getElementById('markReviewedBtn');
  if (newReviewedStatus) {
    reviewBtn.classList.add('reviewed');
    reviewBtn.querySelector('.reviewed-text').style.display = 'none';
    reviewBtn.querySelector('.unreviewed-text').style.display = 'inline';
  } else {
    reviewBtn.classList.remove('reviewed');
    reviewBtn.querySelector('.reviewed-text').style.display = 'inline';
    reviewBtn.querySelector('.unreviewed-text').style.display = 'none';
  }
  
  await loadWords();
}

// Save notes
async function saveNotes() {
  if (!currentWordId) return;
  
  const notes = document.getElementById('detailNotes').value;
  
  await chrome.runtime.sendMessage({
    action: 'updateWord',
    wordId: currentWordId,
    updates: { notes }
  });
  
  const word = currentWords.find(w => w.id === currentWordId);
  if (word) {
    word.notes = notes;
  }
}

// Delete current word
async function deleteCurrentWord() {
  if (!currentWordId) return;
  
  if (!confirm('确定要删除这个单词吗？')) return;
  
  await chrome.runtime.sendMessage({
    action: 'deleteWord',
    wordId: currentWordId
  });
  
  await loadWords();
  showWordList();
}

// Show word list
function showWordList() {
  document.getElementById('wordDetail').classList.add('hidden');
  document.getElementById('settingsPanel').classList.add('hidden');
  document.getElementById('wordList').style.display = 'block';
}

// Show settings
function showSettings() {
  document.getElementById('wordList').style.display = 'none';
  document.getElementById('wordDetail').classList.add('hidden');
  document.getElementById('settingsPanel').classList.remove('hidden');
}

// Load settings
async function loadSettings() {
  const result = await chrome.storage.local.get(['settings']);
  const settings = result.settings || {};
  
  if (settings.translationAPI) {
    document.getElementById('translationAPI').value = settings.translationAPI;
  }
  if (settings.apiKey) {
    document.getElementById('apiKey').value = settings.apiKey;
  }
  document.getElementById('autoOpenSidebar').checked = settings.autoOpenSidebar !== false;
  document.getElementById('captureContext').checked = settings.captureContext !== false;
  
  // Add adaptive theme checkbox if it exists
  const adaptiveThemeCheckbox = document.getElementById('adaptiveTheme');
  if (adaptiveThemeCheckbox) {
    adaptiveThemeCheckbox.checked = settings.adaptiveTheme !== false;
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    translationAPI: document.getElementById('translationAPI').value,
    apiKey: document.getElementById('apiKey').value,
    autoOpenSidebar: document.getElementById('autoOpenSidebar').checked,
    captureContext: document.getElementById('captureContext').checked
  };
  
  // Add adaptive theme setting if checkbox exists
  const adaptiveThemeCheckbox = document.getElementById('adaptiveTheme');
  if (adaptiveThemeCheckbox) {
    settings.adaptiveTheme = adaptiveThemeCheckbox.checked;
  }
  
  await chrome.storage.local.set({ settings });
}

// Export words
async function exportWords() {
  const dataStr = JSON.stringify(currentWords, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `wordget-export-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Import words
async function importWords(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const importedWords = JSON.parse(text);
    
    if (!Array.isArray(importedWords)) {
      alert('无效的导入文件格式');
      return;
    }
    
    // Merge with existing words
    const existingWords = currentWords;
    const mergedWords = [...importedWords];
    
    // Add words that don't exist in imported data
    existingWords.forEach(existingWord => {
      const exists = importedWords.some(w => w.text.toLowerCase() === existingWord.text.toLowerCase());
      if (!exists) {
        mergedWords.push(existingWord);
      }
    });
    
    await chrome.storage.local.set({ words: mergedWords });
    await loadWords();
    
    alert(`成功导入 ${importedWords.length} 个单词`);
  } catch (error) {
    console.error('Import error:', error);
    alert('导入失败，请检查文件格式');
  }
  
  // Reset file input
  e.target.value = '';
}

// Clear all words
async function clearAllWords() {
  if (!confirm('确定要清空所有单词吗？此操作不可恢复！')) return;
  
  await chrome.storage.local.set({ words: [] });
  await loadWords();
  showWordList();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showWord' || request.action === 'wordSaved') {
    // Reload words and show the newly saved word
    loadWords().then(() => {
      let word;
      
      if (request.word) {
        // New format with word object
        word = currentWords.find(w => w.id === request.word.id);
      } else if (request.data) {
        // Old format with data
        word = currentWords.find(w => 
          w.text.toLowerCase() === request.data.text.toLowerCase()
        );
      }
      
      if (word) {
        showWordDetail(word.id);
      }
    });
  }
  
  if (request.action === 'applyTheme') {
    applyTheme(request.theme);
  }
  
  sendResponse({ received: true });
  return true;
});

// Load and apply saved theme
async function loadAndApplyTheme() {
  try {
    console.log('Loading theme...');
    const { currentTheme, settings } = await chrome.storage.local.get(['currentTheme', 'settings']);
    
    if (settings?.adaptiveTheme !== false && currentTheme) {
      console.log('Applying saved theme:', currentTheme);
      applyTheme(currentTheme);
    } else {
      console.log('Adaptive theme disabled or no theme saved');
    }
  } catch (error) {
    console.error('Could not load theme:', error);
  }
}

// Apply theme to sidebar
function applyTheme(theme) {
  if (!theme) {
    console.warn('No theme provided');
    return;
  }
  
  try {
    currentTheme = theme;
    const root = document.documentElement;
    
    // Parse primary color
    const primaryRgb = parseColor(theme.primary);
    const secondaryRgb = parseColor(theme.secondary);
    
    if (primaryRgb) {
      root.style.setProperty('--primary', theme.primary);
      
      // Generate darker version for hover
      const darker = adjustBrightness(primaryRgb, -20);
      root.style.setProperty('--primary-dark', `rgb(${darker.r}, ${darker.g}, ${darker.b})`);
    }
    
    if (secondaryRgb) {
      root.style.setProperty('--secondary', theme.secondary);
    }
    
    if (theme.accent) {
      root.style.setProperty('--success', theme.accent);
    }
    
    // Apply dark mode if needed
    if (theme.isDark) {
      root.style.setProperty('--text-primary', '#e8e8e8');
      root.style.setProperty('--text-secondary', '#b0b0b0');
      root.style.setProperty('--text-tertiary', '#888');
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#242424');
      root.style.setProperty('--bg-tertiary', '#2a2a2a');
      root.style.setProperty('--border', '#3a3a3a');
      root.style.setProperty('--shadow-sm', '0 1px 3px rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.4)');
      root.style.setProperty('--shadow-lg', '0 10px 20px rgba(0, 0, 0, 0.5)');
    } else {
      // Reset to light mode
      root.style.setProperty('--text-primary', '#1a1a1a');
      root.style.setProperty('--text-secondary', '#666');
      root.style.setProperty('--text-tertiary', '#999');
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--bg-tertiary', '#f0f2f5');
      root.style.setProperty('--border', '#e1e4e8');
      root.style.setProperty('--shadow-sm', '0 1px 3px rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.07)');
      root.style.setProperty('--shadow-lg', '0 10px 20px rgba(0, 0, 0, 0.1)');
    }
    
    console.log('Theme applied successfully:', theme);
  } catch (error) {
    console.error('Error applying theme:', error);
  }
}

// Parse color string to RGB
function parseColor(colorString) {
  if (!colorString) return null;
  
  const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    };
  }
  return null;
}

// Adjust color brightness
function adjustBrightness(rgb, amount) {
  return {
    r: Math.min(255, Math.max(0, rgb.r + amount)),
    g: Math.min(255, Math.max(0, rgb.g + amount)),
    b: Math.min(255, Math.max(0, rgb.b + amount))
  };
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  
  return date.toLocaleDateString('zh-CN');
}
