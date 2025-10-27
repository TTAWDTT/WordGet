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

  document.addEventListener('mouseup', handleTranslateMouseUp, true);

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

function handleTranslateMouseUp(event) {
  if (!translateModeActive) {
    return;
  }

  // 延迟一点获取选择，确保选择已经完成
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) {
      return;
    }

    const selectedText = selection.toString().trim();
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

async function processAutomaticTranslation({ text, sentence, pointer }) {
  if (!translateModeActive || !text) {
    return;
  }

  if (!Translator) {
    console.warn('翻译模块未准备就绪');
    return;
  }

  if (!tooltipInstance && TooltipUI) {
    tooltipInstance = new TooltipUI();
    if (currentTheme) {
      tooltipInstance.setTheme(currentTheme);
    }
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

  if (tooltipInstance) {
    tooltipInstance.show({
      word: text,
      wordTranslation: '翻译加载中…',
      sentence: limitedSentence,
      sentenceTranslation: '',
      x: pointerX,
      y: pointerY
    });
  }

  try {
    const translations = await Translator.translateWordAndSentence(text, limitedSentence, 'zh-CN');
    const wordTranslation = translations.wordTranslation || text;
    const sentenceTranslation = translations.sentenceTranslation || translations.wordTranslation;

    if (tooltipInstance) {
      tooltipInstance.show({
        word: text,
        wordTranslation,
        sentence: limitedSentence,
        sentenceTranslation,
        x: pointerX,
        y: pointerY
      });
    }
  } catch (error) {
    console.error('翻译阅读模式翻译失败:', error);

    if (tooltipInstance) {
      tooltipInstance.show({
        word: text,
        wordTranslation: '翻译失败，请稍后重试',
        sentence: limitedSentence,
        sentenceTranslation: '',
        x: pointerX,
        y: pointerY
      });
    }
  }
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

// 提取包含选中文本的句子
function extractSentence(selection) {
  if (!selection.rangeCount) return '';
  
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  
  // 获取父元素的文本内容
  let parentElement = container.nodeType === Node.TEXT_NODE 
    ? container.parentElement 
    : container;
  
  // 尝试找到段落或句子边界
  while (parentElement && !['P', 'DIV', 'LI', 'TD', 'ARTICLE', 'SECTION'].includes(parentElement.tagName)) {
    parentElement = parentElement.parentElement;
  }
  
  if (!parentElement) return '';
  
  const fullText = parentElement.textContent;
  const selectedText = selection.toString();
  
  // 使用基本标点符号查找句子
  const sentences = fullText.split(/(?<=[.!?])\s+/);
  
  // 查找包含选中文本的句子
  for (const sentence of sentences) {
    if (sentence.includes(selectedText)) {
      return sentence.trim();
    }
  }
  
  // 如果找不到句子，返回选择周围的一部分文本
  const selectedIndex = fullText.indexOf(selectedText);
  if (selectedIndex >= 0) {
    const start = Math.max(0, selectedIndex - 50);
    const end = Math.min(fullText.length, selectedIndex + selectedText.length + 50);
    return fullText.substring(start, end).trim();
  }
  
  return '';
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
