// Theme Adapter - Automatically adapts sidebar theme to match current page

class ThemeAdapter {
  constructor() {
    this.defaultTheme = {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#48bb78',
      isDark: false
    };
    this.currentTheme = { ...this.defaultTheme };
  }

  /**
   * Extract dominant colors from the current page
   */
  async analyzePageTheme(tabId) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: this.extractPageColors
      });

      if (results && results[0] && results[0].result) {
        return results[0].result;
      }
    } catch (error) {
      console.log('Could not analyze page theme:', error);
    }
    return null;
  }

  /**
   * This function runs in the page context to extract colors
   */
  extractPageColors() {
    const colors = [];
    const elements = document.querySelectorAll('*');
    const sampleSize = Math.min(elements.length, 100); // Sample up to 100 elements
    
    // Sample elements evenly distributed across the page
    const step = Math.floor(elements.length / sampleSize);
    
    for (let i = 0; i < elements.length; i += step) {
      const element = elements[i];
      const styles = window.getComputedStyle(element);
      
      // Get background color
      const bgColor = styles.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        colors.push(bgColor);
      }
      
      // Get text color
      const textColor = styles.color;
      if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
        colors.push(textColor);
      }
      
      // Get border color
      const borderColor = styles.borderColor;
      if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
        colors.push(borderColor);
      }
    }

    // Analyze body background
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
    
    // Check if dark theme
    const isDark = this.isPageDark(bodyBg, htmlBg);
    
    // Get dominant colors
    const dominantColors = this.getDominantColors(colors);
    
    return {
      isDark: isDark,
      dominantColors: dominantColors,
      bodyBg: bodyBg,
      htmlBg: htmlBg
    };
  }

  /**
   * Determine if the page uses a dark theme
   */
  isPageDark(bodyBg, htmlBg) {
    const bg = bodyBg !== 'rgba(0, 0, 0, 0)' ? bodyBg : htmlBg;
    const rgb = this.parseColor(bg);
    
    if (rgb) {
      // Calculate relative luminance
      const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      return luminance < 0.5;
    }
    
    return false;
  }

  /**
   * Get dominant colors from array
   */
  getDominantColors(colors) {
    const colorMap = {};
    
    colors.forEach(color => {
      const rgb = this.parseColor(color);
      if (rgb && !this.isGrayscale(rgb)) {
        const key = `${Math.floor(rgb.r / 10)}_${Math.floor(rgb.g / 10)}_${Math.floor(rgb.b / 10)}`;
        colorMap[key] = colorMap[key] || { count: 0, rgb: rgb };
        colorMap[key].count++;
      }
    });
    
    // Sort by frequency
    const sorted = Object.values(colorMap).sort((a, b) => b.count - a.count);
    
    // Return top 3 colors
    return sorted.slice(0, 3).map(item => 
      `rgb(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b})`
    );
  }

  /**
   * Parse color string to RGB object
   */
  parseColor(colorString) {
    if (!colorString) return null;
    
    const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  }

  /**
   * Check if color is grayscale
   */
  isGrayscale(rgb) {
    const diff = Math.max(
      Math.abs(rgb.r - rgb.g),
      Math.abs(rgb.g - rgb.b),
      Math.abs(rgb.b - rgb.r)
    );
    return diff < 30;
  }

  /**
   * Generate theme based on page analysis
   */
  generateTheme(pageTheme) {
    if (!pageTheme) return this.defaultTheme;
    
    const theme = {
      isDark: pageTheme.isDark,
      primary: this.defaultTheme.primary,
      secondary: this.defaultTheme.secondary,
      accent: this.defaultTheme.accent
    };
    
    // Use dominant colors if available
    if (pageTheme.dominantColors && pageTheme.dominantColors.length > 0) {
      theme.primary = pageTheme.dominantColors[0];
      
      if (pageTheme.dominantColors.length > 1) {
        theme.secondary = pageTheme.dominantColors[1];
      }
      
      if (pageTheme.dominantColors.length > 2) {
        theme.accent = pageTheme.dominantColors[2];
      }
    }
    
    return theme;
  }

  /**
   * Apply theme to sidebar
   */
  applyTheme(theme) {
    const message = {
      action: 'applyTheme',
      theme: theme
    };
    
    chrome.runtime.sendMessage(message).catch(err => {
      console.log('Sidebar not open yet');
    });
  }

  /**
   * Convert RGB to HSL for color manipulation
   */
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /**
   * Adjust color brightness
   */
  adjustBrightness(rgb, amount) {
    return {
      r: Math.min(255, Math.max(0, rgb.r + amount)),
      g: Math.min(255, Math.max(0, rgb.g + amount)),
      b: Math.min(255, Math.max(0, rgb.b + amount))
    };
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeAdapter;
}
