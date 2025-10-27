/**
 * 悬浮提示 UI 模块
 * 负责在页面上显示翻译提示框
 */

export class TooltipUI {
  constructor() {
    this.tooltip = null;
    this.theme = null;
    this.mouseMoveBound = this.handleMouseMove.bind(this);
    this.clickBound = this.handleClick.bind(this);
  }

  /**
   * 设置主题
   * @param {Object} theme - 主题对象
   */
  setTheme(theme) {
    this.theme = theme;
  }

  /**
   * 创建提示框元素
   * @returns {HTMLElement} 提示框元素
   */
  createTooltipElement() {
    const tooltip = document.createElement('div');
    tooltip.id = 'wordget-translation-tooltip';
    tooltip.className = 'wordget-tooltip';
    
    // 应用主题样式
    this.applyThemeStyles(tooltip);
    
    return tooltip;
  }

  /**
   * 应用主题样式到提示框
   * @param {HTMLElement} element - 提示框元素
   */
  applyThemeStyles(element) {
    const isDark = this.theme?.isDark || false;
    const primary = this.theme?.primary || (isDark ? '#8b9dc3' : '#667eea');
    const secondary = this.theme?.secondary || (isDark ? '#9d7cb8' : '#764ba2');
    
    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#e0e0e0' : '#333333';
    const borderColor = isDark ? '#404040' : '#e0e0e0';
    const shadowColor = isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.15)';
    
    element.style.cssText = `
      position: absolute;
      z-index: 999999;
      background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor} 100%);
      border: 1px solid ${borderColor};
      border-left: 3px solid ${primary};
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 20px ${shadowColor};
      color: ${textColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      max-width: 400px;
      min-width: 200px;
      pointer-events: none;
      opacity: 0;
      transform: translateY(-5px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      backdrop-filter: blur(10px);
    `;
  }

  /**
   * 显示翻译提示
   * @param {Object} params - 参数对象
   * @param {string} params.word - 单词
   * @param {string} params.wordTranslation - 单词翻译
   * @param {string} params.sentence - 句子（可选）
   * @param {string} params.sentenceTranslation - 句子翻译（可选）
   * @param {number} params.x - 鼠标 X 坐标
   * @param {number} params.y - 鼠标 Y 坐标
   */
  show({ word, wordTranslation, sentence, sentenceTranslation, x, y }) {
    // 移除已存在的提示框
    this.hide();

    // 创建新提示框
    this.tooltip = this.createTooltipElement();
    
    // 构建 HTML 内容
    const isDark = this.theme?.isDark || false;
    const accent = this.theme?.accent || (isDark ? '#68d391' : '#48bb78');
    const mutedColor = isDark ? '#888888' : '#666666';
    const dividerColor = isDark ? '#333333' : '#eeeeee';
    
    let html = `
      <div style="margin-bottom: 8px;">
        <div style="font-weight: 600; color: ${accent}; font-size: 15px; margin-bottom: 4px;">
          ${this.escapeHtml(word)}
        </div>
        <div style="color: ${this.theme?.primary || '#667eea'}; font-size: 13px;">
          ${this.escapeHtml(wordTranslation)}
        </div>
      </div>
    `;
    
    if (sentence && sentenceTranslation) {
      html += `
        <div style="border-top: 1px solid ${dividerColor}; margin: 8px 0; padding-top: 8px;">
          <div style="font-size: 12px; color: ${mutedColor}; margin-bottom: 4px;">
            例句：
          </div>
          <div style="font-size: 12px; font-style: italic; margin-bottom: 4px; color: ${mutedColor};">
            ${this.escapeHtml(sentence)}
          </div>
          <div style="font-size: 12px; color: ${this.theme?.text || '#333333'};">
            ${this.escapeHtml(sentenceTranslation)}
          </div>
        </div>
      `;
    }
    
    this.tooltip.innerHTML = html;
    
    // 添加到页面
    document.body.appendChild(this.tooltip);
    
    // 计算位置（避免超出视口）
    const rect = this.tooltip.getBoundingClientRect();
    let left = x + 10;
    let top = y + 10;
    
    // 水平边界检查
    if (left + rect.width > window.innerWidth) {
      left = x - rect.width - 10;
    }
    
    // 垂直边界检查
    if (top + rect.height > window.innerHeight) {
      top = y - rect.height - 10;
    }
    
    // 确保不超出左上边界
    left = Math.max(10, left);
    top = Math.max(10, top);
    
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    
    // 触发动画
    requestAnimationFrame(() => {
      if (this.tooltip) {
        this.tooltip.style.opacity = '1';
        this.tooltip.style.transform = 'translateY(0)';
      }
    });
    
    // 监听鼠标移动和点击事件
    document.addEventListener('mousemove', this.mouseMoveBound);
    document.addEventListener('click', this.clickBound);
  }

  /**
   * 隐藏提示框
   */
  hide() {
    if (this.tooltip) {
      // 先淡出
      this.tooltip.style.opacity = '0';
      this.tooltip.style.transform = 'translateY(-5px)';
      
      // 延迟移除
      setTimeout(() => {
        if (this.tooltip && this.tooltip.parentNode) {
          this.tooltip.parentNode.removeChild(this.tooltip);
        }
        this.tooltip = null;
      }, 200);
    }
    
    // 移除事件监听
    document.removeEventListener('mousemove', this.mouseMoveBound);
    document.removeEventListener('click', this.clickBound);
  }

  /**
   * 处理鼠标移动（隐藏提示框）
   */
  handleMouseMove() {
    this.hide();
  }

  /**
   * 处理点击（隐藏提示框）
   */
  handleClick() {
    this.hide();
  }

  /**
   * 转义 HTML 特殊字符
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.hide();
    this.theme = null;
  }
}
