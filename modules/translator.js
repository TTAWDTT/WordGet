/**
 * 翻译器模块
 * 负责文本翻译功能
 */

export const Translator = {
  /**
   * 翻译文本（使用 Google 翻译）
   * @param {string} text - 要翻译的文本
   * @param {string} targetLang - 目标语言代码（默认 zh-CN）
   * @param {string} sourceLang - 源语言代码（默认 auto）
   * @returns {Promise<string>} 翻译结果
   */
  async translate(text, targetLang = 'zh-CN', sourceLang = 'auto') {
    if (!text || !text.trim()) {
      return '';
    }

    try {
      // 使用 Google 翻译的非官方 API
      // 注意：生产环境建议使用官方 API 和 API 密钥
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`翻译请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data[0]) {
        // Google 翻译返回的格式：[[["翻译结果", "原文", null, null, 10]], ...]
        return data[0].map(item => item[0]).filter(Boolean).join('');
      }
      
      return text;
    } catch (error) {
      console.error('翻译错误:', error);
      
      // 如果是超时错误，返回更友好的提示
      if (error.name === 'AbortError') {
        throw new Error('翻译请求超时');
      }
      
      throw error;
    }
  },

  /**
   * 批量翻译多个文本
   * @param {Array<string>} texts - 文本数组
   * @param {string} targetLang - 目标语言
   * @returns {Promise<Array<string>>} 翻译结果数组
   */
  async translateBatch(texts, targetLang = 'zh-CN') {
    const promises = texts.map(text => this.translate(text, targetLang));
    return Promise.all(promises);
  },

  /**
   * 翻译单词和句子（并行翻译，带重试机制）
   * @param {string} word - 单词
   * @param {string} sentence - 句子
   * @param {string} targetLang - 目标语言
   * @returns {Promise<Object>} 包含 wordTranslation 和 sentenceTranslation 的对象
   */
  async translateWordAndSentence(word, sentence, targetLang = 'zh-CN') {
    try {
      // 并行翻译，提高速度
      const [wordTranslation, sentenceTranslation] = await Promise.all([
        this.translateWithRetry(word, targetLang, 2),
        sentence ? this.translateWithRetry(sentence, targetLang, 2) : Promise.resolve('')
      ]);

      return {
        wordTranslation,
        sentenceTranslation
      };
    } catch (error) {
      console.error('翻译单词和句子时出错:', error);
      return {
        wordTranslation: word,
        sentenceTranslation: sentence || ''
      };
    }
  },

  /**
   * 带重试机制的翻译
   * @param {string} text - 要翻译的文本
   * @param {string} targetLang - 目标语言
   * @param {number} maxRetries - 最大重试次数
   * @returns {Promise<string>} 翻译结果
   */
  async translateWithRetry(text, targetLang = 'zh-CN', maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // 重试前等待一小段时间
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
        
        const result = await this.translate(text, targetLang);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`翻译尝试 ${attempt + 1} 失败:`, error.message);
      }
    }
    
    // 所有重试都失败
    throw lastError || new Error('翻译失败');
  },

  /**
   * 检测文本语言
   * @param {string} text - 要检测的文本
   * @returns {Promise<string>} 语言代码
   */
  async detectLanguage(text) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Google 翻译会在响应中包含检测到的语言
      if (data && data[2]) {
        return data[2];
      }
      
      return 'unknown';
    } catch (error) {
      console.error('语言检测错误:', error);
      return 'unknown';
    }
  }
};
