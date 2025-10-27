// WordGet 扩展的后台服务 Worker

// 主题适配器 - 用于检测页面颜色
const themeAdapter = {
  extractPageColors: function() {
    const colors = [];
    const elements = document.querySelectorAll('*');
    const sampleSize = Math.min(elements.length, 100);
    const step = Math.floor(elements.length / sampleSize) || 1;
    
    // 采样页面元素的背景色
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
    
    // 解析背景色判断明暗模式
    const bgRgb = this.parseColor(colorData.bodyBg);
    const isDark = bgRgb ? this.isColorDark(bgRgb) : false;
    
    // 查找主要非灰度颜色
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
        // 颜色量化：将相似颜色归为一组
        const key = `${Math.floor(rgb.r / 20)}_${Math.floor(rgb.g / 20)}_${Math.floor(rgb.b / 20)}`;
        if (!colorMap[key]) {
          colorMap[key] = { count: 0, rgb };
        }
        colorMap[key].count++;
      }
    });
    
    // 按出现频率排序，取前3个
    const sorted = Object.values(colorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    return sorted.map(item => `rgb(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b})`);
  }
};

// 扩展安装时初始化存储结构
chrome.runtime.onInstalled.addListener(async () => {
  console.log('WordGet 扩展已安装');
  
  // 初始化默认设置
  const defaultSettings = {
    translationAPI: 'google',
    apiKey: '',
    autoOpenSidebar: true,
    captureContext: true,
    adaptiveTheme: true
  };
  
  await chrome.storage.local.set({ settings: defaultSettings });
  
  // 设置侧边栏行为：点击扩展图标时打开侧边栏
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log('侧边栏行为已设置');
  } catch (err) {
    console.log('当前浏览器版本不支持 setPanelBehavior:', err.message);
  }
});

// 辅助函数：可靠地打开侧边栏（多策略尝试）
async function openSidePanel(windowId, tabId) {
  console.log('🚪 开始尝试打开侧边栏...', { windowId, tabId });
  
  if (!chrome.sidePanel) {
    console.error('❌ 当前浏览器不支持 sidePanel API');
    return false;
  }

  // 策略1：先确保侧边栏已启用（全局设置）
  try {
    if (chrome.sidePanel.setOptions) {
      await chrome.sidePanel.setOptions({
        path: 'sidebar.html',
        enabled: true
      });
      console.log('✅ 全局侧边栏选项已设置');
    }
  } catch (error) {
    console.log('⚠️ 设置全局选项失败:', error.message);
  }

  // 策略2：为当前标签启用侧边栏
  if (tabId && chrome.sidePanel.setOptions) {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: 'sidebar.html',
        enabled: true
      });
      console.log('✅ 标签级侧边栏选项已设置');
    } catch (error) {
      console.log('⚠️ 设置标签选项失败:', error.message);
    }
  }

  // 策略3：使用 windowId 打开（最通用的方法）
  if (windowId) {
    try {
      await chrome.sidePanel.open({ windowId: windowId });
      console.log('✅ 侧边栏已通过 windowId 打开');
      return true;
    } catch (error) {
      console.log('⚠️ windowId 方式失败:', error.message);
    }
  }

  // 策略4：使用 tabId 打开（Chrome 116+ 支持）
  if (tabId) {
    try {
      await chrome.sidePanel.open({ tabId: tabId });
      console.log('✅ 侧边栏已通过 tabId 打开');
      return true;
    } catch (error) {
      console.log('⚠️ tabId 方式失败:', error.message);
    }
  }

  console.error('❌ 所有打开侧边栏的方法都失败了');
  return false;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 显示选择失败的警告（使用扩展图标徽章）
async function showSelectionWarning(message) {
  console.warn(message);

  if (!chrome.action || typeof chrome.action.setBadgeText !== 'function') {
    return;
  }

  try {
    // 设置红色徽章背景
    await chrome.action.setBadgeBackgroundColor({ color: '#d9534f' });
    // 显示感叹号
    await chrome.action.setBadgeText({ text: '!' });
  } catch (error) {
    console.log('无法更新徽章:', error.message);
    return;
  }

  // 2秒后自动清除徽章
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' }).catch(() => {});
  }, 2000);
}

// 从标签页获取选择的文本（支持 PDF 等特殊页面）
async function getSelectionData(tab) {
  if (!tab || !tab.id) {
    return null;
  }

  // 受限页面列表（无法注入脚本的页面）
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
    console.log('当前页面不允许捕获选择:', tabUrl);
    return null;
  }

  let response = null;

  // 方法1：尝试从已加载的 content script 获取
  try {
    response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
    if (response?.text) {
      return { ...response, viaContentScript: true };
    }
  } catch (messageError) {
    console.log('Content script 未响应:', messageError.message);
  }

  // 方法2：动态注入 content script 后重试
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css']
    });
    console.log('Content script 已动态注入');

    await sleep(80);
    response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
    if (response?.text) {
      return { ...response, viaContentScript: true };
    }
  } catch (injectError) {
    console.log('无法注入 content script:', injectError.message);
  }

  // 方法3：使用回退方案（支持 PDF 文本层）
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

// 回退方案：使用 executeScript 捕获选择（处理 PDF 等）
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
    console.log('回退方案捕获失败:', error.message);
  }

  return null;
}

// 检测并应用页面主题（带超时保护）
async function detectAndApplyTheme(tabId) {
  try {
    const { settings } = await chrome.storage.local.get(['settings']);
    if (settings?.adaptiveTheme === false) return;
    
    // 添加超时防止卡顿
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1000));
    
    const scriptPromise = chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: themeAdapter.extractPageColors
    }).catch(err => {
      console.log('无法注入主题脚本:', err.message);
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
          // 侧边栏未打开，忽略
        });
      }
    }
  } catch (error) {
    console.log('主题检测跳过:', error.message);
  }
}

// 处理扩展图标点击事件 - 打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  console.log('🖱️ 用户点击了扩展图标');
  
  try {
    const opened = await openSidePanel(tab.windowId, tab.id);
    
    if (opened) {
      console.log('✅ 侧边栏已打开');
      // 打开后检测主题（非阻塞）
      setTimeout(() => {
        detectAndApplyTheme(tab.id).catch(err => {
          console.log('主题检测跳过');
        });
      }, 100);
    } else {
      console.error('❌ 侧边栏打开失败，尝试备用方法...');
      // 备用方案：激活标签后重试
      await chrome.tabs.update(tab.id, { active: true });
      setTimeout(async () => {
        await openSidePanel(tab.windowId, tab.id);
      }, 100);
    }
  } catch (error) {
    console.error('图标点击处理错误:', error);
  }
});

// 处理键盘快捷键 - 保存单词
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-word') {
    console.log('⌨️ 用户按下了保存单词快捷键');
    
    try {
      // 1. 获取当前活动标签
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        console.error('未找到活动标签');
        return;
      }
      
      console.log('当前标签:', tab.id, tab.url);
      
      // 2. 获取选中的文本
      const selectionData = await getSelectionData(tab);

      if (!selectionData || !selectionData.text) {
        console.log('未检测到选中的文本');
        await showSelectionWarning('没有检测到可保存的文本，请确认已选中内容或页面允许扩展访问。');
        return;
      }

      console.log('选中的文本:', selectionData.text);
      
      // 3. 保存单词
      const word = await saveWord(selectionData);
      console.log('✅ 单词已保存:', word);
      
      // 4. 并行检测主题（不阻塞）
      detectAndApplyTheme(tab.id).catch(err => {
        console.log('主题检测跳过:', err.message);
      });
      
      // 5. 检查是否需要自动打开侧边栏
      const { settings } = await chrome.storage.local.get(['settings']);
      const autoOpen = settings?.autoOpenSidebar !== false;
      
      console.log('自动打开侧边栏设置:', autoOpen);
      
      if (autoOpen) {
        console.log('🚪 尝试自动打开侧边栏...');
        
        // 先尝试打开一次
        const opened = await openSidePanel(tab.windowId, tab.id);
        
        if (!opened) {
          console.warn('⚠️ 第一次尝试失败，200ms后重试...');
          // 失败后延迟重试
          setTimeout(async () => {
            const retryOpened = await openSidePanel(tab.windowId, tab.id);
            if (!retryOpened) {
              console.error('❌ 重试后仍然无法打开侧边栏');
              // 最后的备用方案：多次快速重试
              for (let i = 0; i < 3; i++) {
                await sleep(100);
                const finalTry = await openSidePanel(tab.windowId, tab.id);
                if (finalTry) {
                  console.log('✅ 最终重试成功！');
                  break;
                }
              }
            }
          }, 200);
        } else {
          console.log('✅ 侧边栏已自动打开');
        }
      } else {
        console.log('自动打开侧边栏功能已禁用');
      }
      
      // 6. 通知侧边栏显示新保存的单词
      setTimeout(() => {
        chrome.runtime.sendMessage({ 
          action: 'wordSaved', 
          word: word 
        }).catch(err => {
          console.log('侧边栏尚未准备好接收通知');
        });
      }, 200);
      
    } catch (error) {
      console.error('保存单词命令错误:', error);
      await showSelectionWarning(`保存单词时出错: ${error.message}`);
    }
  }
  
  // 新增：翻译显示命令
  if (command === 'translate-word') {
    console.log('🌍 用户按下了翻译显示快捷键');
    
    try {
      // 1. 获取当前活动标签
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        console.error('未找到活动标签');
        return;
      }
      
      console.log('当前标签:', tab.id, tab.url);
      
      // 2. 获取选中的文本
      const selectionData = await getSelectionData(tab);

      if (!selectionData || !selectionData.text) {
        console.log('未检测到选中的文本');
        await showSelectionWarning('没有检测到文本，请确认已选中内容。');
        return;
      }

      console.log('准备翻译:', selectionData.text);
      
      // 3. 翻译单词和句子（并行）
      const [wordTranslation, sentenceTranslation] = await Promise.all([
        translateText(selectionData.text, 'zh-CN'),
        selectionData.sentence ? translateText(selectionData.sentence, 'zh-CN') : Promise.resolve('')
      ]);
      
      console.log('翻译完成 - 单词:', wordTranslation, '句子:', sentenceTranslation);
      
      // 4. 发送给 content script 显示
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showTranslation',
          word: selectionData.text,
          wordTranslation: wordTranslation,
          sentence: selectionData.sentence,
          sentenceTranslation: sentenceTranslation
        });
        
        console.log('✅ 翻译提示已发送到页面');
      } catch (error) {
        console.error('发送翻译提示失败:', error);
        await showSelectionWarning('无法显示翻译，页面可能未准备好。');
      }
      
    } catch (error) {
      console.error('翻译命令错误:', error);
      await showSelectionWarning(`翻译时出错: ${error.message}`);
    }
  }
});

// 保存单词到存储
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
    
    console.log('正在保存单词:', word.text);
    
    // 获取现有单词列表
    const result = await chrome.storage.local.get(['words']);
    const words = result.words || [];
    
    // 检查单词是否已存在
    const existingIndex = words.findIndex(w => w.text.toLowerCase() === word.text.toLowerCase());
    
    if (existingIndex >= 0) {
      console.log('更新已存在的单词');
      // 更新已存在的单词，保留其 ID 和其他数据
      words[existingIndex] = { 
        ...words[existingIndex], 
        sentence: word.sentence || words[existingIndex].sentence,
        url: word.url,
        pageTitle: word.pageTitle,
        timestamp: word.timestamp
      };
      word.id = words[existingIndex].id;
    } else {
      console.log('添加新单词');
      // 在列表开头添加新单词
      words.unshift(word);
    }
    
    // 保存到存储
    await chrome.storage.local.set({ words });
    console.log('单词已保存，总单词数:', words.length);
    
    return word;
  } catch (error) {
    console.error('保存单词时出错:', error);
    throw error;
  }
}

// 处理来自 content script 和 sidebar 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveWord') {
    saveWord(request.data).then(word => {
      sendResponse({ success: true, word });
    });
    return true; // 保持消息通道开放以支持异步响应
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
        sendResponse({ success: false, error: '单词未找到' });
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

// 翻译功能（使用免费翻译 API）
async function translateText(text, targetLang = 'zh-CN') {
  try {
    // 使用 Google 翻译的非官方 API
    // 注意：生产环境建议使用官方 API 和 API 密钥
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
    
    return text;
  } catch (error) {
    console.error('翻译错误:', error);
    return text;
  }
}

// 右键菜单快速保存单词
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveToWordGet',
    title: '保存到 WordGet',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveToWordGet' && info.selectionText) {
    console.log('🖱️ 用户通过右键菜单保存单词');
    
    try {
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
        console.log('右键菜单触发但无法获取文本');
        await showSelectionWarning('未能读取选中的文本，请重试。');
        return;
      }

      const word = await saveWord(wordData);
      console.log('✅ 从右键菜单保存的单词:', word);
      
      // 并行检测主题（不阻塞）
      if (tab?.id) {
        detectAndApplyTheme(tab.id).catch(err => {
          console.log('主题检测跳过');
        });
      }
      
      // 获取设置
      const { settings } = await chrome.storage.local.get(['settings']);
      const autoOpen = settings?.autoOpenSidebar !== false;
      
      console.log('自动打开侧边栏设置（右键菜单）:', autoOpen);
      
      if (autoOpen && tab?.windowId && tab?.id) {
        console.log('🚪 尝试从右键菜单打开侧边栏...');
        const opened = await openSidePanel(tab.windowId, tab.id);
        
        if (!opened) {
          console.warn('⚠️ 侧边栏打开失败，重试中...');
          setTimeout(async () => {
            await openSidePanel(tab.windowId, tab.id);
          }, 200);
        }
      }
      
      // 通知侧边栏
      setTimeout(() => {
        chrome.runtime.sendMessage({ 
          action: 'wordSaved', 
          word: word 
        }).catch(err => {
          console.log('侧边栏尚未准备好接收通知');
        });
      }, 200);
      
    } catch (error) {
      console.error('从右键菜单保存时出错:', error);
      await showSelectionWarning(`保存单词时出错: ${error.message}`);
    }
  }
});