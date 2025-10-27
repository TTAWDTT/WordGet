// WordGet 的内容脚本 - 处理文本选择和上下文提取

console.log('WordGet content script 已加载于:', window.location.href);

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
  
  return false;
});

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
