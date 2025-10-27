/**
 * 悬浮提示 UI 模块
 * 负责在页面上显示翻译提示框
 */

export class TooltipUI {
  constructor() {
    this.tooltip = null;
    this.theme = null;
    this.hideTimer = null;
    this.eventListenersAdded = false;
    this.mouseMoveBound = this.handleMouseMove.bind(this);
    this.clickBound = this.handleClick.bind(this);
  }

  /**
   * 设置主题
   * @param {Object} theme - 主题对象
   */
  setTheme(theme) {
    this.theme = theme;
    if (this.tooltip) {
      this.applyThemeStyles();
    }
  }

  /**
   * 创建提示框元素
   * @returns {HTMLElement} 提示框元素
   */
  createTooltipElement() {
    const tooltip = document.createElement('div');
    tooltip.id = 'wordget-translation-tooltip';
    tooltip.className = 'wordget-tooltip';
    this.applyThemeStyles(tooltip);
    return tooltip;
  }

  /**
   * 应用主题样式到提示框
   * @param {HTMLElement} [element=this.tooltip] - 提示框元素
   */
  applyThemeStyles(element = this.tooltip) {
    if (!element) return;

    const isDark = this.theme?.isDark || false;
    
    if (isDark) {
      element.classList.add('dark-theme');
    } else {
      element.classList.remove('dark-theme');
    }

    // 使用 CSS 变量来设置颜色
    const primary = this.theme?.primary || (isDark ? '#8b9dc3' : '#667eea');
    element.style.setProperty('--wordget-primary-color', primary);
  }

  /**
   * 显示翻译提示
   * @param {Object} params - 参数对象
   */
  show({ word, wordTranslation, sentence, sentenceTranslation, x, y }) {
    // 移除旧的事件监听器
    this.removeEventListeners();
    
    // 如果提示框不存在，则创建
    if (!this.tooltip) {
      this.tooltip = this.createTooltipElement();
      document.body.appendChild(this.tooltip);
    } else {
      // 如果已存在，确保主题最新
      this.applyThemeStyles();
    }
    
    // 构建 HTML 内容
    const isDark = this.theme?.isDark || false;
    const accent = this.theme?.accent || (isDark ? '#68d391' : '#48bb78');
    
    let html = `
      <div class="wordget-tooltip-word-container">
        <div class="wordget-tooltip-word" style="color: ${accent};">
          ${this.escapeHtml(word)}
        </div>
        <div class="wordget-tooltip-translation">
          ${this.escapeHtml(wordTranslation)}
        </div>
      </div>
    `;
    
    if (sentence && sentenceTranslation) {
      html += `
        <div class="wordget-tooltip-sentence-container">
          <div class="wordget-tooltip-sentence-label">例句：</div>
          <div class="wordget-tooltip-sentence-original">
            ${this.escapeHtml(sentence)}
          </div>
          <div class="wordget-tooltip-sentence-translation">
            ${this.escapeHtml(sentenceTranslation)}
          </div>
        </div>
      `;
    }
    
    this.tooltip.innerHTML = html;
    
    // 计算位置
    this.updatePosition(x, y);
    
    // 触发显示动画
    requestAnimationFrame(() => {
      if (this.tooltip) {
        this.tooltip.classList.add('visible');
      }
    });
    
    // 延迟添加事件监听器，避免与触发显示的点击事件冲突
    setTimeout(() => {
      this.addEventListeners();
    }, 100);
  }

  /**
   * 更新提示框位置
   */
  updatePosition(x, y) {
    if (!this.tooltip) return;

    const rect = this.tooltip.getBoundingClientRect();
    let left = x + 15;
    let top = y + 15;
    
    if (left + rect.width > window.innerWidth - 10) {
      left = x - rect.width - 15;
    }
    if (top + rect.height > window.innerHeight - 10) {
      top = y - rect.height - 15;
    }
    
    left = Math.max(10, left);
    top = Math.max(10, top);
    
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  /**
   * 隐藏提示框
   */
  hide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    
    this.removeEventListeners();
    
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
      
      // 动画结束后可以安全移除
      this.hideTimer = setTimeout(() => {
        if (this.tooltip && this.tooltip.parentNode) {
          this.tooltip.parentNode.removeChild(this.tooltip);
          this.tooltip = null;
        }
      }, 300);
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListeners() {
    if (this.eventListenersAdded) return;
    
    document.addEventListener('mousemove', this.mouseMoveBound);
    document.addEventListener('click', this.clickBound, true);
    this.eventListenersAdded = true;
  }

  /**
   * 移除事件监听器
   */
  removeEventListeners() {
    if (!this.eventListenersAdded) return;
    
    document.removeEventListener('mousemove', this.mouseMoveBound);
    document.removeEventListener('click', this.clickBound, true);
    this.eventListenersAdded = false;
  }

  /**
   * 处理鼠标移动（如果离得远则隐藏提示框）
   */
  handleMouseMove(event) {
    if (!this.tooltip) return;
    
    const rect = this.tooltip.getBoundingClientRect();
    const buffer = 30;
    
    const isNearTooltip = (
      event.clientX >= rect.left - buffer &&
      event.clientX <= rect.right + buffer &&
      event.clientY >= rect.top - buffer &&
      event.clientY <= rect.bottom + buffer
    );
    
    if (!isNearTooltip) {
      this.hide();
    }
  }

  /**
   * 处理点击（隐藏提示框）
   */
  handleClick(event) {
    if (this.tooltip && !this.tooltip.contains(event.target)) {
      this.hide();
    }
  }

  /**
   * 转义 HTML 特殊字符
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
