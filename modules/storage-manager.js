/**
 * 存储管理模块
 * 负责单词数据的 CRUD 操作
 */

export const StorageManager = {
  /**
   * 保存单词到存储
   * @param {Object} wordData - 单词数据
   * @returns {Promise<Object>} 保存后的单词对象
   */
  async saveWord(wordData) {
    try {
      const timestamp = Date.now();
      const word = {
        id: `word_${timestamp}`,
        text: wordData.text.trim(),
        sentence: wordData.sentence || '',
        url: wordData.url || '',
        pageTitle: wordData.pageTitle || '',
        timestamp: timestamp,
        translation: wordData.translation || '',
        sentenceTranslation: wordData.sentenceTranslation || '',
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
          timestamp: word.timestamp,
          translation: word.translation || words[existingIndex].translation,
          sentenceTranslation: word.sentenceTranslation || words[existingIndex].sentenceTranslation
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
  },

  /**
   * 获取所有单词
   * @returns {Promise<Array>} 单词数组
   */
  async getAllWords() {
    try {
      const result = await chrome.storage.local.get(['words']);
      return result.words || [];
    } catch (error) {
      console.error('获取单词列表时出错:', error);
      return [];
    }
  },

  /**
   * 根据 ID 获取单词
   * @param {string} wordId - 单词 ID
   * @returns {Promise<Object|null>} 单词对象
   */
  async getWordById(wordId) {
    try {
      const words = await this.getAllWords();
      return words.find(w => w.id === wordId) || null;
    } catch (error) {
      console.error('获取单词时出错:', error);
      return null;
    }
  },

  /**
   * 更新单词
   * @param {string} wordId - 单词 ID
   * @param {Object} updates - 要更新的字段
   * @returns {Promise<Object|null>} 更新后的单词对象
   */
  async updateWord(wordId, updates) {
    try {
      const result = await chrome.storage.local.get(['words']);
      const words = result.words || [];
      const index = words.findIndex(w => w.id === wordId);
      
      if (index >= 0) {
        words[index] = { ...words[index], ...updates };
        await chrome.storage.local.set({ words });
        console.log('单词已更新:', wordId);
        return words[index];
      }
      
      console.warn('未找到要更新的单词:', wordId);
      return null;
    } catch (error) {
      console.error('更新单词时出错:', error);
      throw error;
    }
  },

  /**
   * 删除单词
   * @param {string} wordId - 单词 ID
   * @returns {Promise<boolean>} 是否成功删除
   */
  async deleteWord(wordId) {
    try {
      const result = await chrome.storage.local.get(['words']);
      const words = result.words || [];
      const filteredWords = words.filter(w => w.id !== wordId);
      
      if (filteredWords.length < words.length) {
        await chrome.storage.local.set({ words: filteredWords });
        console.log('单词已删除:', wordId);
        return true;
      }
      
      console.warn('未找到要删除的单词:', wordId);
      return false;
    } catch (error) {
      console.error('删除单词时出错:', error);
      throw error;
    }
  },

  /**
   * 批量删除单词
   * @param {Array<string>} wordIds - 单词 ID 数组
   * @returns {Promise<number>} 删除的单词数量
   */
  async deleteWords(wordIds) {
    try {
      const result = await chrome.storage.local.get(['words']);
      const words = result.words || [];
      const idsSet = new Set(wordIds);
      const filteredWords = words.filter(w => !idsSet.has(w.id));
      
      const deletedCount = words.length - filteredWords.length;
      await chrome.storage.local.set({ words: filteredWords });
      console.log(`已删除 ${deletedCount} 个单词`);
      
      return deletedCount;
    } catch (error) {
      console.error('批量删除单词时出错:', error);
      throw error;
    }
  },

  /**
   * 清空所有单词
   * @returns {Promise<boolean>}
   */
  async clearAllWords() {
    try {
      await chrome.storage.local.set({ words: [] });
      console.log('所有单词已清空');
      return true;
    } catch (error) {
      console.error('清空单词时出错:', error);
      throw error;
    }
  },

  /**
   * 获取或初始化设置
   * @returns {Promise<Object>} 设置对象
   */
  async getSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      return result.settings || {
        translationAPI: 'google',
        apiKey: '',
        autoOpenSidebar: true,
        captureContext: true,
        adaptiveTheme: true,
        showTranslationTooltip: true // 新增：是否显示翻译提示
      };
    } catch (error) {
      console.error('获取设置时出错:', error);
      return {};
    }
  },

  /**
   * 保存设置
   * @param {Object} settings - 设置对象
   * @returns {Promise<boolean>}
   */
  async saveSettings(settings) {
    try {
      await chrome.storage.local.set({ settings });
      console.log('设置已保存');
      return true;
    } catch (error) {
      console.error('保存设置时出错:', error);
      throw error;
    }
  },

  /**
   * 获取或设置主题
   * @param {Object} theme - 主题对象（可选，如果提供则保存）
   * @returns {Promise<Object|null>} 主题对象
   */
  async manageTheme(theme = null) {
    try {
      if (theme) {
        // 保存主题
        await chrome.storage.local.set({ currentTheme: theme });
        console.log('主题已保存');
        return theme;
      } else {
        // 获取主题
        const result = await chrome.storage.local.get(['currentTheme']);
        return result.currentTheme || null;
      }
    } catch (error) {
      console.error('主题管理出错:', error);
      return null;
    }
  }
};
