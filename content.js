// WordGet 的内容脚本 - 处理文本选择和上下文提取

console.log('WordGet content script 已加载于:', window.location.href);

// 动态导入模块
let ThemeDetector, TooltipUI, Translator;
let tooltipInstance = null;
let currentTheme = null;

// 翻译阅读模式状态
let translateModeActive = false;
let translateDebounceTimer = null;
let lastTranslateTrigger = { text: '', timestamp: 0 };
let modeIndicator = null;

// 初始化模块
(async function initModules() {
  try {
    // 导入主题检测模块
    const themeModule = await import(chrome.runtime.getURL('modules/theme-detector.js'));
    ThemeDetector = themeModule.ThemeDetector;
    
  // 导入悬浮提示UI模块
  const tooltipModule = await import(chrome.runtime.getURL('modules/tooltip-ui.js'));
  TooltipUI = tooltipModule.TooltipUI;

  // 导入翻译模块
  const translatorModule = await import(chrome.runtime.getURL('modules/translator.js'));
  Translator = translatorModule.Translator;
    
    // 初始化提示框实例
    tooltipInstance = new TooltipUI();
    
    // 检测并应用当前页面主题
    await detectAndApplyPageTheme();
    
    console.log('✅ 模块初始化完成');
  } catch (error) {
    console.error('❌ 模块初始化失败:', error);
  }
})();

// 检测并应用页面主题
async function detectAndApplyPageTheme() {
  try {
    if (!ThemeDetector) return;
    
    const colorData = ThemeDetector.extractPageColors();
    currentTheme = ThemeDetector.analyzeTheme(colorData);
    
    if (tooltipInstance && currentTheme) {
      tooltipInstance.setTheme(currentTheme);
      console.log('🎨 页面主题已应用:', currentTheme);
    }
  } catch (error) {
    console.error('主题检测失败:', error);
  }
}

// 存储最后一次鼠标位置
let lastMousePosition = { x: 0, y: 0 };

document.addEventListener('mousemove', (e) => {
  lastMousePosition.x = e.clientX;
  lastMousePosition.y = e.clientY;
});

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script 收到消息:', request.action);
  
  if (request.action === 'getSelection') {
    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      console.log('选中的文本:', selectedText);
      
      if (selectedText) {
        const sentence = extractSentence(selection);
        
        const response = {
          text: selectedText,
          sentence: sentence,
          url: window.location.href,
          pageTitle: document.title
        };
        
        console.log('发送响应:', response);
        sendResponse(response);
        
        // 显示视觉反馈
        showSavedNotification(selectedText);
      } else {
        console.log('没有选中文本');
        sendResponse({ text: '' });
      }
    } catch (error) {
      console.error('获取选择时出错:', error);
      sendResponse({ text: '', error: error.message });
    }
    
    return true; // 保持通道开放以支持异步响应
  }
  
  if (request.action === 'toggleTranslateMode') {
    handleTranslateModeToggle(request.active, request.reason);
    sendResponse({ success: true });
    return true;
  }
  
  return false;
});

async function handleTranslateModeToggle(shouldEnable, reason = 'manual') {
  if (shouldEnable) {
    await enableTranslateMode(reason);
  } else {
    disableTranslateMode(reason);
  }
}

async function enableTranslateMode(reason = 'manual') {
  if (translateModeActive) {
    return;
  }

  translateModeActive = true;

  // 确保模块可用
  if (!Translator) {
    try {
      const translatorModule = await import(chrome.runtime.getURL('modules/translator.js'));
      Translator = translatorModule.Translator;
    } catch (error) {
      console.error('无法加载翻译模块:', error);
      translateModeActive = false;
      return;
    }
  }

  if (!tooltipInstance && TooltipUI) {
    tooltipInstance = new TooltipUI();
    if (currentTheme) {
      tooltipInstance.setTheme(currentTheme);
    }
  }

  // 在 document 和所有 shadow roots 上添加事件监听
  document.addEventListener('mouseup', handleTranslateMouseUp, true);
  
  // 为已存在的 Shadow DOM 添加监听
  attachShadowDOMListeners();
  
  // 监听新创建的 Shadow DOM
  observeShadowDOMCreation();

  document.body.classList.add('wordget-translate-mode');
  showTranslateIndicator();

  if (reason !== 'restore') {
    showModeNotification('翻译阅读模式已开启');
  }
}

function disableTranslateMode(reason = 'manual') {
  if (!translateModeActive) {
    return;
  }

  translateModeActive = false;
  document.removeEventListener('mouseup', handleTranslateMouseUp, true);
  
  // 移除 Shadow DOM 监听
  removeShadowDOMListeners();
  
  // 停止 Shadow DOM 观察
  if (window.wordgetShadowObserver) {
    window.wordgetShadowObserver.disconnect();
    window.wordgetShadowObserver = null;
  }

  if (translateDebounceTimer) {
    clearTimeout(translateDebounceTimer);
    translateDebounceTimer = null;
  }

  lastTranslateTrigger = { text: '', timestamp: 0 };

  if (tooltipInstance && typeof tooltipInstance.hide === 'function') {
    tooltipInstance.hide();
  }

  document.body.classList.remove('wordget-translate-mode');
  hideTranslateIndicator();

  if (reason !== 'restore') {
    showModeNotification('翻译阅读模式已关闭');
  }
}

// 存储 Shadow DOM 监听器引用
let shadowRootListeners = new WeakMap();

// 为所有已存在的 Shadow DOM 附加监听器
function attachShadowDOMListeners() {
  const allElements = document.querySelectorAll('*');
  allElements.forEach(element => {
    if (element.shadowRoot) {
      attachListenerToShadowRoot(element.shadowRoot);
    }
  });
}

// 为单个 Shadow Root 附加监听器
function attachListenerToShadowRoot(shadowRoot) {
  if (shadowRootListeners.has(shadowRoot)) {
    return; // 已经附加过了
  }
  
  const listener = (event) => handleTranslateMouseUp(event);
  shadowRoot.addEventListener('mouseup', listener, true);
  shadowRootListeners.set(shadowRoot, listener);
  
  console.log('✅ Shadow DOM 监听器已附加');
}

// 移除所有 Shadow DOM 监听器
function removeShadowDOMListeners() {
  const allElements = document.querySelectorAll('*');
  allElements.forEach(element => {
    if (element.shadowRoot && shadowRootListeners.has(element.shadowRoot)) {
      const listener = shadowRootListeners.get(element.shadowRoot);
      element.shadowRoot.removeEventListener('mouseup', listener, true);
      shadowRootListeners.delete(element.shadowRoot);
    }
  });
}

// 监听新创建的 Shadow DOM
function observeShadowDOMCreation() {
  if (window.wordgetShadowObserver) {
    return; // 已经在监听了
  }
  
  // 使用 MutationObserver 监听 DOM 变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 检查新添加的节点是否有 Shadow Root
          if (node.shadowRoot) {
            attachListenerToShadowRoot(node.shadowRoot);
          }
          
          // 检查新添加节点的所有子节点
          const shadowHosts = node.querySelectorAll('*');
          shadowHosts.forEach(element => {
            if (element.shadowRoot) {
              attachListenerToShadowRoot(element.shadowRoot);
            }
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  window.wordgetShadowObserver = observer;
  console.log('✅ Shadow DOM 创建监听器已启动');
}

function handleTranslateMouseUp(event) {
  if (!translateModeActive) {
    return;
  }

  // 延迟一点获取选择，确保选择已经完成
  setTimeout(() => {
    // 尝试多种方式获取选择内容
    let selection = null;
    let selectedText = '';
    
    // 方法1: 标准 window.getSelection()
    selection = window.getSelection();
    selectedText = selection?.toString().trim() || '';
    
    // 方法2: 如果标准方法没有结果，尝试从 Shadow DOM 获取
    if (!selectedText && event.target) {
      const shadowRoot = findShadowRoot(event.target);
      if (shadowRoot) {
        selection = shadowRoot.getSelection?.() || window.getSelection();
        selectedText = selection?.toString().trim() || '';
        console.log('📦 从 Shadow DOM 获取选择:', selectedText);
      }
    }
    
    // 方法3: 尝试从 document.activeElement 获取（适用于 iframe 和特殊容器）
    if (!selectedText && document.activeElement) {
      try {
        if (document.activeElement.contentWindow) {
          selection = document.activeElement.contentWindow.getSelection();
          selectedText = selection?.toString().trim() || '';
          console.log('🖼️ 从 iframe 获取选择:', selectedText);
        }
      } catch (e) {
        // Cross-origin iframe, 忽略
      }
    }
    
    if (!selectedText) {
      return;
    }

    if (selectedText.length > 5000) {
      console.log('选中的文本过长，跳过翻译');
      return;
    }

    const sentence = extractSentence(selection);
    const pointer = {
      x: event?.clientX ?? lastMousePosition.x,
      y: event?.clientY ?? lastMousePosition.y
    };

    if (translateDebounceTimer) {
      clearTimeout(translateDebounceTimer);
    }

    translateDebounceTimer = setTimeout(() => {
      processAutomaticTranslation({
        text: selectedText,
        sentence,
        pointer
      });
    }, 150);
  }, 50);
}

// 查找元素所在的 Shadow Root
function findShadowRoot(element) {
  let current = element;
  while (current) {
    if (current instanceof ShadowRoot) {
      return current;
    }
    current = current.parentNode || current.host;
  }
  return null;
}

async function processAutomaticTranslation({ text, sentence, pointer }) {
  if (!translateModeActive || !text) {
    return;
  }

  if (!Translator) {
    console.warn('翻译模块未准备就绪');
    showErrorNotification('翻译模块未加载');
    return;
  }

  if (!tooltipInstance) {
    console.warn('提示框实例未准备就绪');
    showErrorNotification('提示框未初始化');
    return;
  }

  const now = Date.now();
  if (text === lastTranslateTrigger.text && now - lastTranslateTrigger.timestamp < 400) {
    return;
  }

  lastTranslateTrigger = { text, timestamp: now };

  const cleanSentence = (sentence && sentence.trim()) || text;
  const limitedSentence = cleanSentence.length > 500 ? cleanSentence.slice(0, 500) : cleanSentence;

  const pointerX = pointer?.x ?? lastMousePosition.x;
  const pointerY = pointer?.y ?? lastMousePosition.y;

  // 显示加载状态
  tooltipInstance.show({
    word: text,
    wordTranslation: '⏳ 翻译中...',
    sentence: limitedSentence,
    sentenceTranslation: '',
    x: pointerX,
    y: pointerY
  });

  try {
    const translations = await Translator.translateWordAndSentence(text, limitedSentence, 'zh-CN');
    
    // 检查是否还在翻译模式且文本未变化
    if (!translateModeActive || lastTranslateTrigger.text !== text) {
      return;
    }
    
    const wordTranslation = translations.wordTranslation || text;
    const sentenceTranslation = translations.sentenceTranslation || translations.wordTranslation;

    tooltipInstance.show({
      word: text,
      wordTranslation,
      sentence: limitedSentence,
      sentenceTranslation,
      x: pointerX,
      y: pointerY
    });
  } catch (error) {
    console.error('翻译阅读模式翻译失败:', error);

    // 仍然显示提示框，但显示错误信息
    const errorMessage = error.message === '翻译请求超时' 
      ? '⏱️ 翻译超时，请重试'
      : '❌ 翻译失败，请检查网络';

    if (tooltipInstance) {
      tooltipInstance.show({
        word: text,
        wordTranslation: errorMessage,
        sentence: limitedSentence,
        sentenceTranslation: '',
        x: pointerX,
        y: pointerY
      });
    }
  }
}

// 显示错误通知
function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'wordget-notification';
  notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

// 模式通知
function showModeNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'wordget-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 1500);
}

function showTranslateIndicator() {
  if (modeIndicator) {
    return;
  }

  modeIndicator = document.createElement('div');
  modeIndicator.className = 'wordget-translate-indicator';
  modeIndicator.textContent = '翻译阅读模式已开启';
  document.body.appendChild(modeIndicator);

  requestAnimationFrame(() => {
    if (modeIndicator) {
      modeIndicator.classList.add('show');
    }
  });
}

function hideTranslateIndicator() {
  if (!modeIndicator) {
    return;
  }

  modeIndicator.classList.remove('show');
  setTimeout(() => {
    if (modeIndicator) {
      modeIndicator.remove();
      modeIndicator = null;
    }
  }, 200);
}

// 提取包含选中文本的句子（增强版，支持 Shadow DOM）
function extractSentence(selection) {
  if (!selection || !selection.rangeCount) return '';
  
  try {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const selectedText = selection.toString().trim();
    
    // 获取父元素的文本内容
    let parentElement = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container;
    
    // 如果在 Shadow DOM 中，需要特殊处理
    const shadowRoot = findShadowRoot(container);
    if (shadowRoot && shadowRoot.host) {
      // 尝试从 Shadow Root 的 host 元素开始查找
      parentElement = shadowRoot.host;
    }
    
    // 尝试找到段落或句子边界
    let depth = 0;
    const maxDepth = 10;
    while (parentElement && depth < maxDepth) {
      const tagName = parentElement.tagName;
      
      // 扩展识别的容器标签，包括 GitHub 等平台常用的标签
      if (tagName && [
        'P', 'DIV', 'LI', 'TD', 'TH', 'ARTICLE', 'SECTION', 
        'BLOCKQUOTE', 'PRE', 'CODE', 'SPAN', 'H1', 'H2', 'H3', 
        'H4', 'H5', 'H6', 'DD', 'DT', 'FIGCAPTION'
      ].includes(tagName)) {
        
        const fullText = parentElement.textContent || parentElement.innerText || '';
        
        if (fullText && fullText.trim().length > selectedText.length) {
          // 使用更智能的句子分割
          return extractSentenceFromText(fullText, selectedText);
        }
      }
      
      parentElement = parentElement.parentElement || parentElement.parentNode;
      depth++;
    }
    
    // 如果找不到合适的父元素，返回选中的文本
    return selectedText;
  } catch (error) {
    console.error('提取句子时出错:', error);
    return selection.toString().trim();
  }
}

// 从完整文本中提取包含选中文本的句子
function extractSentenceFromText(fullText, selectedText) {
  // 清理文本（保留基本结构）
  const cleanedFullText = fullText.replace(/\s+/g, ' ').trim();
  const cleanedSelectedText = selectedText.replace(/\s+/g, ' ').trim();
  
  // 方法1：使用标点符号分割
  const sentenceEnders = /[.!?。！？]/g;
  let sentences = cleanedFullText.split(sentenceEnders);
  
  // 查找包含选中文本的句子
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (sentence.includes(cleanedSelectedText)) {
      // 找到了，返回这个句子（可能需要加上标点）
      let result = sentence;
      
      // 尝试恢复标点
      const endIndex = cleanedFullText.indexOf(sentence) + sentence.length;
      if (endIndex < cleanedFullText.length) {
        const nextChar = cleanedFullText[endIndex];
        if (/[.!?。！？]/.test(nextChar)) {
          result += nextChar;
        }
      }
      
      return result.trim();
    }
  }
  
  // 方法2：如果用标点分割找不到，返回选中文本前后的上下文
  const selectedIndex = cleanedFullText.indexOf(cleanedSelectedText);
  if (selectedIndex >= 0) {
    const contextLength = 100; // 前后各100个字符
    const start = Math.max(0, selectedIndex - contextLength);
    const end = Math.min(cleanedFullText.length, selectedIndex + cleanedSelectedText.length + contextLength);
    
    let result = cleanedFullText.substring(start, end).trim();
    
    // 如果不是从头开始，添加省略号
    if (start > 0) {
      result = '...' + result;
    }
    if (end < cleanedFullText.length) {
      result = result + '...';
    }
    
    return result;
  }
  
  // 方法3：如果都失败了，返回原文的一部分
  return cleanedFullText.substring(0, Math.min(200, cleanedFullText.length));
}

// 单词保存时显示通知
function showSavedNotification(word) {
  const notification = document.createElement('div');
  notification.className = 'wordget-notification';
  notification.textContent = `已保存: ${word}`;
  document.body.appendChild(notification);
  
  // 淡入
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // 淡出并移除
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

// PDF.js 查看器支持
function isPDFViewer() {
  return window.location.href.includes('pdf') || 
         document.querySelector('#viewerContainer') !== null ||
         document.querySelector('embed[type="application/pdf"]') !== null;
}

// PDF 增强选择
if (isPDFViewer()) {
  console.log('检测到 PDF 查看器，启用 PDF 支持');
  
  // PDF.js 特定处理
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      // 选择可用，可以通过快捷键捕获
    }
  });
}
