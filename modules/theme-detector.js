/**
 * 主题检测模块
 * 负责检测页面颜色方案并生成自适应主题
 */

export const ThemeDetector = {
  /**
   * 从页面提取颜色数据
   * @returns {Object} 包含页面颜色信息的对象
   */
  extractPageColors() {
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
  
  /**
   * 分析主题（明暗模式和主色调）
   * @param {Object} colorData - 颜色数据
   * @returns {Object} 主题配置对象
   */
  analyzeTheme(colorData) {
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
  
  /**
   * 解析颜色字符串为 RGB 对象
   * @param {string} colorString - CSS 颜色字符串
   * @returns {Object|null} RGB 对象
   */
  parseColor(colorString) {
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
  
  /**
   * 判断颜色是否为深色
   * @param {Object} rgb - RGB 对象
   * @returns {boolean}
   */
  isColorDark(rgb) {
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
  },
  
  /**
   * 判断颜色是否为灰度色
   * @param {Object} rgb - RGB 对象
   * @returns {boolean}
   */
  isGrayscale(rgb) {
    const diff = Math.max(
      Math.abs(rgb.r - rgb.g),
      Math.abs(rgb.g - rgb.b),
      Math.abs(rgb.b - rgb.r)
    );
    return diff < 30;
  },
  
  /**
   * 从颜色列表中找出主导颜色
   * @param {Array} colors - 颜色字符串数组
   * @returns {Array} 主导颜色数组（最多3个）
   */
  findDominantColors(colors) {
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
  },

  /**
   * 生成自适应 CSS 样式
   * @param {Object} theme - 主题对象
   * @returns {string} CSS 样式字符串
   */
  generateAdaptiveStyles(theme) {
    if (!theme) return '';
    
    const { isDark, primary, secondary, accent } = theme;
    
    return `
      :root {
        --theme-primary: ${primary};
        --theme-secondary: ${secondary};
        --theme-accent: ${accent};
        --theme-bg: ${isDark ? '#1a1a1a' : '#ffffff'};
        --theme-text: ${isDark ? '#e0e0e0' : '#333333'};
        --theme-border: ${isDark ? '#404040' : '#e0e0e0'};
        --theme-hover: ${isDark ? '#2a2a2a' : '#f5f5f5'};
        --theme-shadow: ${isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)'};
      }
    `;
  }
};

// 用于 Service Worker 环境（无 DOM）
export const ThemeDetectorForBackground = {
  /**
   * 通过注入脚本检测页面主题
   * @param {number} tabId - 标签页 ID
   * @returns {Promise<Object>} 主题对象
   */
  async detectThemeInTab(tabId) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: function() {
          // 这个函数会在目标页面执行
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
        }
      });

      if (results && results[0] && results[0].result) {
        return ThemeDetector.analyzeTheme(results[0].result);
      }
      return null;
    } catch (error) {
      console.log('主题检测失败:', error.message);
      return null;
    }
  }
};
