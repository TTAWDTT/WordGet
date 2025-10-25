// Background service worker for WordGet extension

// Initialize storage schema on installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('WordGet extension installed');
  
  // Initialize default settings
  const defaultSettings = {
    translationAPI: 'google',
    apiKey: '',
    autoOpenSidebar: true,
    captureContext: true
  };
  
  await chrome.storage.local.set({ settings: defaultSettings });
});

// Handle keyboard shortcut for saving words
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-word') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to get selected text
    chrome.tabs.sendMessage(tab.id, { action: 'getSelection' }, async (response) => {
      if (response && response.text) {
        await saveWord(response);
        
        // Open sidebar
        await chrome.sidePanel.open({ windowId: tab.windowId });
        
        // Notify sidebar to show the word
        chrome.runtime.sendMessage({ 
          action: 'showWord', 
          data: response 
        });
      }
    });
  }
});

// Save word to storage
async function saveWord(wordData) {
  const timestamp = Date.now();
  const word = {
    id: `word_${timestamp}`,
    text: wordData.text.trim(),
    sentence: wordData.sentence || '',
    url: wordData.url || '',
    pageTitle: wordData.pageTitle || '',
    timestamp: timestamp,
    translation: '',
    sentenceTranslation: '',
    notes: '',
    reviewed: false
  };
  
  // Get existing words
  const result = await chrome.storage.local.get(['words']);
  const words = result.words || [];
  
  // Check if word already exists
  const existingIndex = words.findIndex(w => w.text.toLowerCase() === word.text.toLowerCase());
  
  if (existingIndex >= 0) {
    // Update existing word
    words[existingIndex] = { ...words[existingIndex], ...word, id: words[existingIndex].id };
  } else {
    // Add new word
    words.unshift(word);
  }
  
  await chrome.storage.local.set({ words });
  return word;
}

// Handle messages from content script and sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveWord') {
    saveWord(request.data).then(word => {
      sendResponse({ success: true, word });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getWords') {
    chrome.storage.local.get(['words']).then(result => {
      sendResponse({ words: result.words || [] });
    });
    return true;
  }
  
  if (request.action === 'updateWord') {
    chrome.storage.local.get(['words']).then(async result => {
      const words = result.words || [];
      const index = words.findIndex(w => w.id === request.wordId);
      
      if (index >= 0) {
        words[index] = { ...words[index], ...request.updates };
        await chrome.storage.local.set({ words });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Word not found' });
      }
    });
    return true;
  }
  
  if (request.action === 'deleteWord') {
    chrome.storage.local.get(['words']).then(async result => {
      const words = result.words || [];
      const filtered = words.filter(w => w.id !== request.wordId);
      await chrome.storage.local.set({ words: filtered });
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'translate') {
    translateText(request.text, request.targetLang || 'zh-CN').then(translation => {
      sendResponse({ translation });
    });
    return true;
  }
});

// Translation function using free translation API
async function translateText(text, targetLang = 'zh-CN') {
  try {
    // Using Google Translate's unofficial API
    // Note: For production, consider using official APIs with API keys
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
    
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// Context menu for quick word saving
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveToWordGet',
    title: '保存到 WordGet',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveToWordGet' && info.selectionText) {
    const wordData = {
      text: info.selectionText,
      url: tab.url,
      pageTitle: tab.title
    };
    
    await saveWord(wordData);
    await chrome.sidePanel.open({ windowId: tab.windowId });
    
    chrome.runtime.sendMessage({ 
      action: 'showWord', 
      data: wordData 
    });
  }
});
