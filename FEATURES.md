# WordGet - 新功能文档

## 🎉 v2.0 更新内容

### 📦 模块化重构

项目已进行全面模块化重构，代码结构更清晰，可维护性更强。

#### 新增模块结构

```
WordGet/
├── modules/
│   ├── theme-detector.js      # 主题检测模块
│   ├── translator.js          # 翻译器模块
│   ├── storage-manager.js     # 存储管理模块
│   └── tooltip-ui.js          # 悬浮提示UI模块
├── background.js              # 后台服务（已优化）
├── content.js                 # 内容脚本（已重构）
├── sidebar.js                 # 侧边栏脚本
└── manifest.json              # 扩展配置
```

### ✨ 新功能：即时翻译显示

#### 功能描述

用户选中单词后按 **Ctrl+Shift+S**（Mac: **Command+Shift+S**），在鼠标位置显示：
- 单词翻译
- 句子翻译（如果有上下文）

**特性：**
- 🎨 **自适应主题**：根据当前页面配色自动调整提示框样式
- 🖱️ **鼠标跟随**：提示框在鼠标位置显示，不遮挡内容
- ⚡ **自动消失**：鼠标移动或点击后自动隐藏
- 🌈 **精美设计**：渐变背景、阴影效果、流畅动画

#### 使用方法

1. **保存单词**：选中文本 → 按 **Alt+S**（Mac: **Option+S**）
   - 自动保存到单词本
   - 自动打开侧边栏
   - 提取例句和上下文

2. **查看翻译**：选中文本 → 按 **Ctrl+Shift+S**（Mac: **Command+Shift+S**）
   - 即时显示翻译
   - 包含单词和句子翻译
   - 无需打开侧边栏

#### 快捷键对照

| 功能 | Windows/Linux | macOS |
|------|---------------|--------|
| 保存单词 | Alt+S | Option+S |
| 显示翻译 | Ctrl+Shift+S | Command+Shift+S |

---

## 📚 模块详解

### 1. 主题检测模块 (`theme-detector.js`)

**功能：**
- 自动检测页面配色方案
- 判断明暗模式
- 提取主色调
- 生成自适应样式

**主要 API：**
```javascript
// 提取页面颜色
ThemeDetector.extractPageColors()

// 分析主题
ThemeDetector.analyzeTheme(colorData)

// 生成 CSS 样式
ThemeDetector.generateAdaptiveStyles(theme)
```

### 2. 翻译器模块 (`translator.js`)

**功能：**
- Google 翻译 API 集成
- 批量翻译支持
- 语言自动检测

**主要 API：**
```javascript
// 翻译文本
Translator.translate(text, targetLang, sourceLang)

// 批量翻译
Translator.translateBatch(texts, targetLang)

// 翻译单词和句子
Translator.translateWordAndSentence(word, sentence, targetLang)

// 检测语言
Translator.detectLanguage(text)
```

### 3. 存储管理模块 (`storage-manager.js`)

**功能：**
- 单词 CRUD 操作
- 设置管理
- 主题持久化

**主要 API：**
```javascript
// 保存单词
StorageManager.saveWord(wordData)

// 获取所有单词
StorageManager.getAllWords()

// 更新单词
StorageManager.updateWord(wordId, updates)

// 删除单词
StorageManager.deleteWord(wordId)

// 获取/保存设置
StorageManager.getSettings()
StorageManager.saveSettings(settings)
```

### 4. 悬浮提示UI模块 (`tooltip-ui.js`)

**功能：**
- 创建美观的提示框
- 自适应主题样式
- 智能位置计算
- 自动隐藏机制

**主要 API：**
```javascript
// 创建实例
const tooltip = new TooltipUI()

// 设置主题
tooltip.setTheme(theme)

// 显示提示
tooltip.show({
  word, 
  wordTranslation, 
  sentence, 
  sentenceTranslation, 
  x, 
  y
})

// 隐藏提示
tooltip.hide()
```

---

## 🎨 UI 设计特点

### 提示框样式

- **自适应配色**：根据页面明暗模式调整
- **渐变背景**：使用页面主色调
- **边框高亮**：左侧强调色边框
- **阴影效果**：提升层次感
- **毛玻璃效果**：背景模糊
- **平滑动画**：淡入淡出效果

### 样式示例

**明亮模式：**
- 白色背景
- 深色文字
- 鲜艳强调色

**深色模式：**
- 深灰背景
- 浅色文字
- 柔和强调色

---

## 🔧 技术细节

### Chrome Extension Manifest V3

使用最新的 Manifest V3 规范，包括：
- Service Worker 后台脚本
- ES6 模块导入
- Web Accessible Resources

### 模块化架构

- **ES6 模块**：使用 `import/export`
- **动态导入**：`import()` 按需加载
- **单一职责**：每个模块专注一个功能
- **松耦合**：模块间独立，易于测试

### 性能优化

- **并行翻译**：单词和句子同时翻译
- **异步加载**：模块动态导入
- **事件委托**：减少监听器数量
- **防抖节流**：避免频繁操作

---

## 🐛 调试指南

### 查看日志

1. 打开 Chrome 开发者工具 (F12)
2. 切换到 **Console** 标签
3. 查看带 emoji 的日志：
   - ✅ 成功操作
   - ⚠️ 警告信息
   - ❌ 错误信息
   - 🎨 主题相关
   - 🌍 翻译相关

### 常见问题

**Q: 翻译提示不显示？**
A: 
- 检查是否选中了文本
- 确认按下了 Ctrl+Shift+S
- 查看控制台是否有错误
- 尝试刷新页面

**Q: 主题不匹配？**
A:
- 等待页面完全加载
- 检查页面是否有特殊样式
- 尝试重新加载扩展

**Q: 模块加载失败？**
A:
- 检查 `web_accessible_resources` 配置
- 确认模块文件存在
- 查看控制台错误信息

---

## 🚀 未来计划

- [ ] 支持更多翻译引擎（DeepL、有道等）
- [ ] 添加单词本同步功能
- [ ] 导出/导入单词列表
- [ ] 支持语音朗读
- [ ] 添加生词复习功能
- [ ] 优化 PDF 支持
- [ ] 添加快捷键自定义

---

## 📝 更新日志

### v2.0.0 (2025-10-27)

**新增：**
- ✨ 即时翻译显示功能
- 📦 完整模块化重构
- 🎨 自适应主题系统
- ⌨️ 新快捷键 Ctrl+Shift+S

**优化：**
- 🔧 代码结构更清晰
- ⚡ 性能提升
- 🐛 修复侧边栏打开问题
- 📚 完善文档

**变更：**
- 保存快捷键改为 Alt+S
- 新增翻译快捷键 Ctrl+Shift+S
- 模块化文件结构

---

## 👨‍💻 开发者指南

### 添加新功能

1. **创建新模块**：在 `modules/` 目录下创建
2. **导出 API**：使用 `export` 导出函数/类
3. **在 content.js 或 background.js 中导入**
4. **更新 manifest.json**：添加到 `web_accessible_resources`

### 代码风格

- 使用 ES6+ 语法
- 添加详细注释
- 使用 JSDoc 文档
- 保持函数简短
- 遵循单一职责原则

### 测试流程

1. 修改代码后重新加载扩展
2. 在不同页面测试功能
3. 检查控制台日志
4. 验证主题适配
5. 测试边界情况

---

## 📄 许可证

本项目使用 MIT 许可证。
