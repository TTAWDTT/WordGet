# GitHub 翻译功能调试指南

## 问题诊断

如果在 GitHub 页面上翻译功能无法正常工作，请按以下步骤排查：

### 1. 检查扩展是否正确加载

打开浏览器开发者工具（F12），在 Console 中查看是否有以下消息：
- ✅ 应该没有红色错误信息
- ✅ 不应该有 CSP（内容安全策略）相关的错误

### 2. 检查翻译模式是否开启

1. 按 `Ctrl+Q` 开启翻译阅读模式
2. 页面右上角应该出现蓝色指示器
3. 扩展图标上应该显示 "T" 徽章

### 3. 测试选择功能

在 GitHub README 页面尝试：
1. 选择普通段落文字 ✅
2. 选择代码块中的文字 ✅
3. 选择标题文字 ✅
4. 选择表格中的文字 ✅

### 4. 常见问题解决

#### 问题 A: 提示框不出现
**可能原因**：
- 翻译模式未开启
- 网络连接问题
- 选中的文本过长（>5000字符）

**解决方法**：
1. 确认右上角有蓝色指示器
2. 检查网络连接
3. 选择较短的文本测试

#### 问题 B: CSP 错误
**症状**：控制台显示 "Response should include 'x-content-type-options' header"

**说明**：这是 GitHub 的安全策略警告，不影响扩展功能。这些是 GitHub 自身的安全头缺失警告，与 WordGet 扩展无关。

#### 问题 C: 翻译超时
**症状**：提示框显示"⏱️ 翻译超时"

**解决方法**：
1. 检查网络连接
2. 稍等片刻后重试
3. 如果在中国大陆，可能需要特殊网络环境

### 5. 手动测试步骤

#### 在 GitHub 上测试：
```
1. 访问 https://github.com/facebook/react
2. 按 Ctrl+Q 开启翻译模式
3. 选择 README 中的一句话，例如：
   "React is a JavaScript library for building user interfaces"
4. 松开鼠标，等待 0.2-0.5 秒
5. 应该出现翻译提示框
```

#### 在测试页面上测试：
```
1. 打开 test-github-style.html
2. 按 Ctrl+Q 开启翻译模式
3. 依次测试各个区域
4. 确认所有区域都能正常翻译
```

### 6. 调试模式

如果需要查看详细的执行流程，可以在控制台中运行：

```javascript
// 检查模块是否加载
console.log('Translator:', typeof Translator);
console.log('TooltipUI:', typeof TooltipUI);
console.log('ThemeDetector:', typeof ThemeDetector);

// 检查翻译模式状态
console.log('翻译模式激活:', translateModeActive);

// 手动测试翻译功能
if (Translator) {
  Translator.translate('hello', 'zh-CN').then(result => {
    console.log('翻译结果:', result);
  });
}
```

### 7. 性能优化建议

为了获得最佳体验：
- ✅ 选择文本长度控制在 200 字符以内
- ✅ 等待翻译完成后再选择下一段文本
- ✅ 避免频繁快速选择文本
- ✅ 在网络良好的环境下使用

### 8. 已知限制

1. **跨域 iframe**：无法翻译跨域 iframe 中的内容（浏览器安全限制）
2. **图片内文字**：无法翻译图片中的文字
3. **Canvas 内容**：无法翻译 Canvas 渲染的文字
4. **PDF 内嵌**：某些 PDF 嵌入方式可能不支持

### 9. 报告问题

如果问题依然存在，请提供以下信息：
- 浏览器版本
- 操作系统
- 扩展版本
- 具体的问题页面 URL
- 控制台中的错误信息（截图）
- 网络状态（是否使用代理/VPN）

## 技术说明

### CSP 警告说明
您在截图中看到的 CSP 相关警告：
```
Response should include 'x-content-type-options' header
Response should not include disallowed headers: x-runtime
```

这些是 **GitHub 服务器响应头的问题**，不是 WordGet 扩展导致的。这些警告：
- ❌ 不会影响翻译功能
- ❌ 不会阻止扩展运行
- ✅ 是 GitHub 自身的安全配置建议
- ✅ 所有访问 GitHub 的用户都会看到

### 翻译 API 说明

WordGet 使用 Google 翻译的非官方 API：
- 优点：免费、无需 API 密钥
- 缺点：可能在某些地区受限
- 备选：可以配置使用其他翻译服务

### 数据隐私

所有翻译请求：
- ✅ 直接发送到 Google 翻译服务器
- ✅ 不经过任何中间服务器
- ✅ 不保存翻译历史（除非主动保存单词）
- ✅ 完全在本地运行

---

**如有其他问题，欢迎反馈！** 📧 2451989@tongji.edu.cn
