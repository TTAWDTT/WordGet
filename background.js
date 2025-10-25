// Background service worker for WordGet extension

// Theme adapter for color detection
const themeAdapter = {
  extractPageColors: function() {
    const colors = [];
    const elements = document.querySelectorAll('*');
    const sampleSize = Math.min(elements.length, 100);
    const step = Math.floor(elements.length / sampleSize) || 1;
    
    for (let i = 0; i < elements.length && colors.length < 150; i += step) {
      const element = elements[i];
      const styles = window.getComputedStyle(element);
      const bgColor = styles.backgroundColor;
      
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        colors.push(bgColor);
      }
    }

    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const bodyColor = window.getComputedStyle(document.body).color;
    
    return { colors, bodyBg, bodyColor };
  },
  
  analyzeTheme: function(colorData) {
    if (!colorData) return null;
    
    // Parse body background
    const bgRgb = this.parseColor(colorData.bodyBg);
    const isDark = bgRgb ? this.isColorDark(bgRgb) : false;
    
    // Find dominant non-grayscale colors
    const dominantColors = this.findDominantColors(colorData.colors);
    
    return {
      isDark,
      primary: dominantColors[0] || (isDark ? '#8b9dc3' : '#667eea'),
      secondary: dominantColors[1] || (isDark ? '#9d7cb8' : '#764ba2'),
      accent: dominantColors[2] || (isDark ? '#68d391' : '#48bb78')
    };
  },
  
  parseColor: function(colorString) {
    const match = colorString?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  },
  
  isColorDark: function(rgb) {
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
  },
  
  isGrayscale: function(rgb) {
    const diff = Math.max(
      Math.abs(rgb.r - rgb.g),
      Math.abs(rgb.g - rgb.b),
      Math.abs(rgb.b - rgb.r)
    );
    return diff < 30;
  },
  
  findDominantColors: function(colors) {
    const colorMap = {};
    
    colors.forEach(color => {
      const rgb = this.parseColor(color);
      if (rgb && !this.isGrayscale(rgb)) {
        const key = `${Math.floor(rgb.r / 20)}_${Math.floor(rgb.g / 20)}_${Math.floor(rgb.b / 20)}`;
        if (!colorMap[key]) {
          colorMap[key] = { count: 0, rgb };
        }
        colorMap[key].count++;
      }
    });
    
    const sorted = Object.values(colorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    return sorted.map(item => `rgb(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b})`);
  }
};

// Initialize storage schema on installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('WordGet extension installed');
  
  // Initialize default settings
  const defaultSettings = {
    translationAPI: 'google',
    apiKey: '',
    autoOpenSidebar: true,
    captureContext: true,
    adaptiveTheme: true
  };
  
  await chrome.storage.local.set({ settings: defaultSettings });
  
  // Set side panel behavior to open on action click
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(err => console.log('Side panel behavior setting not supported:', err));
});

// Helper function to reliably open side panel
async function openSidePanel(windowId, tabId) {
  try {
    console.log('Attempting to open side panel for window:', windowId);
    
    // Method 1: Try the standard API
    await chrome.sidePanel.open({ windowId: windowId });
    console.log('Side panel opened successfully');
    return true;
  } catch (error) {
    console.log('Standard method failed:', error.message);
    
    // Method 2: Try with tabId if available
    if (tabId) {
      try {
        await chrome.sidePanel.open({ tabId: tabId });
        console.log('Side panel opened with tabId');
        return true;
      } catch (err2) {
        console.log('TabId method also failed:', err2.message);
      }
    }
    
    // Method 3: Try setting panel options first
    try {
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: 'sidebar.html',
        enabled: true
      });
      await chrome.sidePanel.open({ windowId: windowId });
      console.log('Side panel opened after setting options');
      return true;
    } catch (err3) {
      console.error('All methods to open side panel failed:', err3);
      return false;
    }
  }
}

// Detect and apply page theme (with timeout and error handling)
async function detectAndApplyTheme(tabId) {
  try {
    const { settings } = await chrome.storage.local.get(['settings']);
    if (settings?.adaptiveTheme === false) return;
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1000));
    
    const scriptPromise = chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: themeAdapter.extractPageColors
    }).catch(err => {
      console.log('Cannot inject theme script:', err.message);
      return null;
    });
    
    const results = await Promise.race([scriptPromise, timeoutPromise]);

    if (results && results[0]?.result) {
      const theme = themeAdapter.analyzeTheme(results[0].result);
      
      if (theme) {
        await chrome.storage.local.set({ currentTheme: theme });
        
        chrome.runtime.sendMessage({ 
          action: 'applyTheme', 
          theme: theme 
        }).catch(() => {
          // Sidebar not open, ignore
        });
      }
    }
  } catch (error) {
    console.log('Theme detection skipped:', error.message);
  }
}

// Handle extension icon click to open sidebar
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const opened = await openSidePanel(tab.windowId, tab.id);
    
    if (opened) {
      // Detect theme after opening (non-blocking)
      setTimeout(() => {
        detectAndApplyTheme(tab.id).catch(err => {
          console.log('Theme detection skipped');
        });
      }, 100);
    } else {
      console.error('Failed to open sidebar, trying alternative method...');
      // Fallback: try to activate the tab and open again
      await chrome.tabs.update(tab.id, { active: true });
      setTimeout(async () => {
        await openSidePanel(tab.windowId, tab.id);
      }, 100);
    }
  } catch (error) {
    console.error('Error in icon click handler:', error);
  }
});

// Handle keyboard shortcut for saving words
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-word') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        console.error('No active tab found');
        return;
      }
      
      console.log('Save word command triggered for tab:', tab.id);
      
      // First, try to get selection from content script
      let response = null;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
      } catch (error) {
        console.error('Content script not responding:', error.message);
        
        // Try to inject content script if it's not loaded
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content.css']
          });
          
          console.log('Content script injected, retrying...');
          
          // Wait a bit for script to initialize
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Retry getting selection
          response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
        } catch (injectError) {
          console.error('Cannot inject content script:', injectError.message);
          alert('无法在此页面保存单词。某些特殊页面（如浏览器设置页）不支持此功能。');
          return;
        }
      }
      
      if (!response || !response.text) {
        console.log('No text selected');
        return;
      }
      
      console.log('Selected text:', response.text);
      
      // Save the word
      const word = await saveWord(response);
      console.log('Word saved successfully:', word);
      
      // Detect theme in parallel (don't wait)
      detectAndApplyTheme(tab.id).catch(err => {
        console.log('Theme detection skipped:', err.message);
      });
      
      // Get settings to check if auto-open is enabled
      const { settings } = await chrome.storage.local.get(['settings']);
      const autoOpen = settings?.autoOpenSidebar !== false;
      
      console.log('Auto-open sidebar setting:', autoOpen);
      
      if (autoOpen) {
        console.log('Attempting to open sidebar...');
        const opened = await openSidePanel(tab.windowId, tab.id);
        
        if (!opened) {
          console.warn('Failed to open sidebar on first attempt, retrying...');
          // Retry after a short delay
          setTimeout(async () => {
            await openSidePanel(tab.windowId, tab.id);
          }, 200);
        }
      } else {
        console.log('Auto-open sidebar is disabled in settings');
      }
      
      // Notify sidebar to show the word
      setTimeout(() => {
        chrome.runtime.sendMessage({ 
          action: 'wordSaved', 
          word: word 
        }).catch(err => {
          console.log('Sidebar not ready for notification');
        });
      }, 200);
      
    } catch (error) {
      console.error('Error in save-word command:', error);
      alert('保存单词时出错: ' + error.message);
    }
  }
});

// Save word to storage
async function saveWord(wordData) {
  try {
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
    
    console.log('Saving word:', word.text);
    
    // Get existing words
    const result = await chrome.storage.local.get(['words']);
    const words = result.words || [];
    
    // Check if word already exists
    const existingIndex = words.findIndex(w => w.text.toLowerCase() === word.text.toLowerCase());
    
    if (existingIndex >= 0) {
      console.log('Updating existing word');
      // Update existing word but keep its ID and other data
      words[existingIndex] = { 
        ...words[existingIndex], 
        sentence: word.sentence || words[existingIndex].sentence,
        url: word.url,
        pageTitle: word.pageTitle,
        timestamp: word.timestamp
      };
      word.id = words[existingIndex].id;
    } else {
      console.log('Adding new word');
      // Add new word at the beginning
      words.unshift(word);
    }
    
    // Save to storage
    await chrome.storage.local.set({ words });
    console.log('Word saved to storage, total words:', words.length);
    
    return word;
  } catch (error) {
    console.error('Error saving word:', error);
    throw error;
  }
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
    try {
      console.log('Context menu save triggered');
      
      const wordData = {
        text: info.selectionText,
        url: tab.url,
        pageTitle: tab.title,
        sentence: '' // Context menu doesn't capture sentence
      };
      
      const word = await saveWord(wordData);
      console.log('Word saved from context menu:', word);
      
      // Detect theme in parallel (don't wait)
      detectAndApplyTheme(tab.id).catch(err => {
        console.log('Theme detection skipped');
      });
      
      // Get settings
      const { settings } = await chrome.storage.local.get(['settings']);
      const autoOpen = settings?.autoOpenSidebar !== false;
      
      console.log('Auto-open sidebar setting (context menu):', autoOpen);
      
      if (autoOpen) {
        console.log('Attempting to open sidebar from context menu...');
        const opened = await openSidePanel(tab.windowId, tab.id);
        
        if (!opened) {
          console.warn('Failed to open sidebar, retrying...');
          setTimeout(async () => {
            await openSidePanel(tab.windowId, tab.id);
          }, 200);
        }
      }
      
      // Notify sidebar
      setTimeout(() => {
        chrome.runtime.sendMessage({ 
          action: 'wordSaved', 
          word: word 
        }).catch(err => {
          console.log('Sidebar not ready for notification');
        });
      }, 200);
      
    } catch (error) {
      console.error('Error saving from context menu:', error);
      alert('保存单词时出错: ' + error.message);
    }
  }
});
