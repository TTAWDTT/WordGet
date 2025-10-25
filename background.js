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
  if (!chrome.sidePanel || typeof chrome.sidePanel.open !== 'function') {
    console.warn('chrome.sidePanel API unavailable in this browser');
    return false;
  }

  console.log('Preparing side panel for window:', windowId, 'tab:', tabId);

  if (tabId && typeof chrome.sidePanel.setOptions === 'function') {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: 'sidebar.html',
        enabled: true
      });
      console.log('Side panel options bound to tab');
    } catch (optionsError) {
      console.log('Failed to set tab-specific side panel options:', optionsError.message);
    }
  }

  if (tabId) {
    try {
      await chrome.sidePanel.open({ tabId: tabId });
      console.log('Side panel opened with tabId');
      return true;
    } catch (tabError) {
      console.log('tabId open attempt failed:', tabError.message);
    }
  }

  if (windowId) {
    try {
      await chrome.sidePanel.open({ windowId: windowId });
      console.log('Side panel opened with windowId');
      return true;
    } catch (windowError) {
      console.log('windowId open attempt failed:', windowError.message);
    }
  }

  if (typeof chrome.sidePanel.setOptions === 'function') {
    try {
      await chrome.sidePanel.setOptions({
        path: 'sidebar.html',
        enabled: true
      });

      if (windowId) {
        await chrome.sidePanel.open({ windowId: windowId });
        console.log('Side panel opened after global enable');
        return true;
      }
    } catch (globalError) {
      console.log('Global side panel enable failed:', globalError.message);
    }
  }

  console.error('Unable to open the side panel via available methods');
  return false;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function showSelectionWarning(message) {
  console.warn(message);

  if (!chrome.action || typeof chrome.action.setBadgeText !== 'function') {
    return;
  }

  try {
    await chrome.action.setBadgeBackgroundColor({ color: '#d9534f' });
    await chrome.action.setBadgeText({ text: '!' });
  } catch (error) {
    console.log('Unable to update badge for warning:', error.message);
    return;
  }

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' }).catch(() => {
      // ignore
    });
  }, 2000);
}

// Retrieve selection details from tab with fallbacks (supports PDF viewer)
async function getSelectionData(tab) {
  if (!tab || !tab.id) {
    return null;
  }

  const restrictedPrefixes = [
    'chrome:',
    'chrome-extension:',
    'chrome-untrusted:',
    'edge:',
    'about:',
    'opera:',
    'vivaldi:',
    'brave:',
    'ms-browser-extension:',
    'moz-extension:',
    'devtools:'
  ];
  const tabUrl = tab.url || '';
  const isRestricted = restrictedPrefixes.some(prefix => tabUrl.startsWith(prefix));

  if (isRestricted) {
    console.log('Selection capture not permitted on this page:', tabUrl);
    return null;
  }

  let response = null;

  try {
    response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
    if (response?.text) {
      return { ...response, viaContentScript: true };
    }
  } catch (messageError) {
    console.log('Content script selection attempt failed:', messageError.message);
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css']
    });
    console.log('Content script injected for selection retry');

    await sleep(80);
    response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
    if (response?.text) {
      return { ...response, viaContentScript: true };
    }
  } catch (injectError) {
    console.log('Content script injection unavailable:', injectError.message);
  }

  const fallback = await captureSelectionFallback(tab.id);
  if (fallback?.text) {
    return {
      text: fallback.text,
      sentence: fallback.sentence || fallback.text,
      url: tab.url || fallback.url || '',
      pageTitle: tab.title || fallback.pageTitle || '',
      viaContentScript: false
    };
  }

  if (response?.text) {
    return { ...response, viaContentScript: true };
  }

  return null;
}

// Fallback selection capture using executeScript (handles PDF text layer)
async function captureSelectionFallback(tabId) {
  if (!tabId) {
    return null;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      world: 'MAIN',
      func: () => {
        try {
          const selection = window.getSelection();
          if (!selection || !selection.toString().trim()) {
            return { text: '' };
          }

          const text = selection.toString().trim();
          let sentence = text;

          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let container = range.commonAncestorContainer;

            if (container && container.nodeType === Node.TEXT_NODE) {
              container = container.parentElement;
            }

            let depth = 0;
            let contextText = '';

            while (container && depth < 6) {
              const candidate = (container?.innerText || container?.textContent || '').replace(/\s+/g, ' ').trim();
              if (candidate && candidate.length > text.length) {
                contextText = candidate;
                break;
              }
              container = container.parentElement;
              depth++;
            }

            if (contextText) {
              const normalizedContext = contextText;
              const normalizedSelection = text.replace(/\s+/g, ' ');
              const lowerContext = normalizedContext.toLowerCase();
              const lowerSelection = normalizedSelection.toLowerCase();
              const index = lowerContext.indexOf(lowerSelection);

              if (index >= 0) {
                const start = Math.max(0, index - 80);
                const end = Math.min(normalizedContext.length, index + normalizedSelection.length + 80);
                sentence = normalizedContext.slice(start, end).trim();
              } else {
                sentence = normalizedContext.slice(0, 200).trim();
              }
            }
          }

          return {
            text,
            sentence,
            url: window.location.href,
            pageTitle: document.title
          };
        } catch (error) {
          return { text: '', error: error.message };
        }
      }
    });

    if (Array.isArray(results)) {
      for (const frame of results) {
        if (frame?.result?.text) {
          return frame.result;
        }
      }
    }
  } catch (error) {
    console.log('Fallback selection capture failed:', error.message);
  }

  return null;
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
      
      const selectionData = await getSelectionData(tab);

      if (!selectionData || !selectionData.text) {
        console.log('No selectable text found in active tab');
        await showSelectionWarning('没有检测到可保存的文本，请确认已选中内容或页面允许扩展访问。');
        return;
      }

      console.log('Selected text:', selectionData.text);
      
      // Save the word
      const word = await saveWord(selectionData);
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
      await showSelectionWarning(`保存单词时出错: ${error.message}`);
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
      
      let selectionData = null;
      if (tab && tab.id) {
        selectionData = await getSelectionData(tab);
      }

      const wordData = {
        text: (selectionData?.text || info.selectionText || '').trim(),
        sentence: selectionData?.sentence || '',
        url: tab?.url || selectionData?.url || '',
        pageTitle: tab?.title || selectionData?.pageTitle || ''
      };

      if (!wordData.text) {
        console.log('Context menu triggered without retrievable text');
        await showSelectionWarning('未能读取选中的文本，请重试。');
        return;
      }
      
      const word = await saveWord(wordData);
      console.log('Word saved from context menu:', word);
      
      // Detect theme in parallel (don't wait)
      if (tab?.id) {
        detectAndApplyTheme(tab.id).catch(err => {
          console.log('Theme detection skipped');
        });
      }
      
      // Get settings
      const { settings } = await chrome.storage.local.get(['settings']);
      const autoOpen = settings?.autoOpenSidebar !== false;
      
      console.log('Auto-open sidebar setting (context menu):', autoOpen);
      
      if (autoOpen && tab?.windowId && tab?.id) {
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
      await showSelectionWarning(`保存单词时出错: ${error.message}`);
    }
  }
});
