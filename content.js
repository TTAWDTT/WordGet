// Content script for WordGet - handles text selection and context extraction

console.log('WordGet content script loaded on:', window.location.href);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action);
  
  if (request.action === 'getSelection') {
    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      console.log('Selected text:', selectedText);
      
      if (selectedText) {
        const sentence = extractSentence(selection);
        
        const response = {
          text: selectedText,
          sentence: sentence,
          url: window.location.href,
          pageTitle: document.title
        };
        
        console.log('Sending response:', response);
        sendResponse(response);
        
        // Show visual feedback
        showSavedNotification(selectedText);
      } else {
        console.log('No text selected');
        sendResponse({ text: '' });
      }
    } catch (error) {
      console.error('Error in getSelection:', error);
      sendResponse({ text: '', error: error.message });
    }
    
    return true; // Keep channel open for async response
  }
  
  return false;
});

// Extract sentence containing the selected text
function extractSentence(selection) {
  if (!selection.rangeCount) return '';
  
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  
  // Get the text content of the parent element
  let parentElement = container.nodeType === Node.TEXT_NODE 
    ? container.parentElement 
    : container;
  
  // Try to find a paragraph or sentence boundary
  while (parentElement && !['P', 'DIV', 'LI', 'TD', 'ARTICLE', 'SECTION'].includes(parentElement.tagName)) {
    parentElement = parentElement.parentElement;
  }
  
  if (!parentElement) return '';
  
  const fullText = parentElement.textContent;
  const selectedText = selection.toString();
  
  // Find sentences using basic punctuation
  const sentences = fullText.split(/(?<=[.!?])\s+/);
  
  // Find the sentence containing the selected text
  for (const sentence of sentences) {
    if (sentence.includes(selectedText)) {
      return sentence.trim();
    }
  }
  
  // If no sentence found, return a portion of text around selection
  const selectedIndex = fullText.indexOf(selectedText);
  if (selectedIndex >= 0) {
    const start = Math.max(0, selectedIndex - 50);
    const end = Math.min(fullText.length, selectedIndex + selectedText.length + 50);
    return fullText.substring(start, end).trim();
  }
  
  return '';
}

// Show notification when word is saved
function showSavedNotification(word) {
  const notification = document.createElement('div');
  notification.className = 'wordget-notification';
  notification.textContent = `已保存: ${word}`;
  document.body.appendChild(notification);
  
  // Fade in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Fade out and remove
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

// Support for PDF.js viewer
function isPDFViewer() {
  return window.location.href.includes('pdf') || 
         document.querySelector('#viewerContainer') !== null ||
         document.querySelector('embed[type="application/pdf"]') !== null;
}

// Enhanced selection for PDF
if (isPDFViewer()) {
  console.log('PDF viewer detected, enabling PDF support');
  
  // PDF.js specific handling
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      // Selection is available, can be captured with keyboard shortcut
    }
  });
}
