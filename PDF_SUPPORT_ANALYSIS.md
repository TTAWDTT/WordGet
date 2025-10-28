# PDF 支持方式分析及其不可行性

## 📋 当前实现方式

### 1. 检测方式 (content.js)

```javascript
// PDF.js 查看器支持
function isPDFViewer() {
  return window.location.href.includes('pdf') || 
         document.querySelector('#viewerContainer') !== null ||
         document.querySelector('embed[type="application/pdf"]') !== null;
}

// PDF 增强选择
if (isPDFViewer()) {
  // PDF.js 特定处理
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      // 选择可用，可以通过快捷键捕获
    }
  });
}
```

**检测逻辑**：
1. URL 包含 "pdf" 字符串
2. 页面存在 `#viewerContainer` 元素（PDF.js 特征）
3. 页面存在 `<embed type="application/pdf">` 元素

### 2. 文本捕获方式 (background.js)

```javascript
// 回退方案：使用 executeScript 捕获选择（处理 PDF 等）
async function captureSelectionFallback(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      world: 'MAIN',
      func: () => {
        const selection = window.getSelection();
        if (!selection || !selection.toString().trim()) {
          return { text: '' };
        }
        const text = selection.toString().trim();
        // ... 提取上下文逻辑
        return { text, sentence, url, pageTitle };
      }
    });
  } catch (error) {
    // ...
  }
}
```

**捕获策略**：
1. 使用 `chrome.scripting.executeScript` 注入代码
2. 设置 `allFrames: true` 支持 iframe
3. 使用 `window.getSelection()` 获取选中文本
4. 提取上下文作为例句

### 3. manifest.json 配置

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "all_frames": true
    }
  ],
  "permissions": [
    "scripting",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

---

## ❌ 为什么这种方式不可行

### 核心问题：Chrome 扩展无法访问 PDF 内容

#### 1. **PDF 不是 HTML 文档** 🚫

**问题**：
- PDF 是二进制格式文件，不是 HTML/DOM 结构
- 浏览器使用**原生 PDF 渲染器**（如 Chrome PDF Viewer）
- 原生渲染器运行在**独立的沙箱进程**中
- Content scripts **无法访问**这个沙箱环境

**技术细节**：
```
用户打开 PDF
    ↓
Chrome 使用内置 PDF Viewer（独立进程）
    ↓
PDF Viewer 是特权进程，不暴露 DOM
    ↓
Content Script 无法注入 ❌
    ↓
无法捕获文本选择 ❌
```

#### 2. **chrome:// 协议限制** 🔒

当浏览器打开 PDF 时，实际 URL 是：
```
chrome-extension://[extension-id]/[path-to-pdf]
或
chrome://pdf-viewer/[encoded-url]
```

**manifest.json 限制**：
```javascript
// 这些前缀的页面无法注入 content script
const restrictedPrefixes = [
  'chrome:',
  'chrome-extension:',
  'edge:',
  'about:',
  // ...
];
```

**结果**：
- Content scripts **被浏览器阻止**注入
- `chrome.scripting.executeScript` 会抛出权限错误
- 即使有 `<all_urls>` 权限也无法访问

#### 3. **PDF.js 方案的局限性** 📄

项目代码中检测 `#viewerContainer` 是为了支持 **PDF.js**（Mozilla 的开源 PDF 查看器）：

**PDF.js 工作原理**：
```
PDF 文件 → JavaScript 解析 → Canvas 渲染 → HTML DOM
```

**可行性分析**：

✅ **理论上可行**：
- PDF.js 将 PDF 渲染成 HTML 页面
- 有真实的 DOM 结构
- Content script 可以注入
- `window.getSelection()` 可以工作

❌ **实际上困难重重**：
1. **用户必须主动使用 PDF.js**
   - 大多数用户使用 Chrome 内置查看器
   - 需要手动安装 PDF.js 扩展或使用在线服务
   - 用户体验差

2. **文本层问题**
   - PDF.js 的文本层是透明覆盖在 Canvas 上
   - 选择行为可能不稳定
   - 复杂 PDF（扫描件、多列）识别困难

3. **性能问题**
   - PDF.js 是 JavaScript 实现，大文件很慢
   - 不如原生查看器流畅

#### 4. **`<embed>` 和 `<object>` 标签的限制** 🖼️

```javascript
document.querySelector('embed[type="application/pdf"]')
```

当 PDF 通过 `<embed>` 或 `<object>` 嵌入时：

**问题**：
```html
<embed src="document.pdf" type="application/pdf">
```

- `<embed>` 内部是**插件内容**，不是 DOM
- 浏览器使用原生 PDF 插件渲染
- Content script 只能访问外层 HTML，无法访问 embed 内部
- `window.getSelection()` 只返回外层页面的选择，不包括 PDF 内容

**实际场景**：
```javascript
// 这段代码只能检测到 <embed> 元素的存在
const embed = document.querySelector('embed[type="application/pdf"]');
console.log(embed); // <embed> 元素

// 但无法访问其内部
const selection = window.getSelection();
console.log(selection.toString()); // "" (空字符串)
// 因为选择发生在插件内部，JavaScript 无法访问
```

#### 5. **iframe 的跨域限制** 🌐

即使 PDF 在 iframe 中：
```html
<iframe src="document.pdf"></iframe>
```

**问题**：
- PDF iframe 内容是 **chrome:// 协议**
- 跨域安全策略阻止访问
- `allFrames: true` 也无法穿透安全边界

```javascript
// 尝试访问 PDF iframe
const iframe = document.querySelector('iframe');
try {
  const iframeDoc = iframe.contentDocument;
  // ❌ SecurityError: Blocked a frame with origin from accessing a cross-origin frame
} catch (error) {
  console.error(error);
}
```

---

## 📊 支持矩阵对比

| PDF 查看方式 | Content Script 可注入 | getSelection() 可用 | 实际可行性 |
|-------------|---------------------|-------------------|----------|
| **Chrome 原生查看器** | ❌ | ❌ | ❌ 完全不可行 |
| **Edge 原生查看器** | ❌ | ❌ | ❌ 完全不可行 |
| **`<embed>` 标签** | ⚠️ 外层可以 | ❌ | ❌ 不可行 |
| **`<object>` 标签** | ⚠️ 外层可以 | ❌ | ❌ 不可行 |
| **iframe 嵌入** | ❌ 跨域限制 | ❌ | ❌ 不可行 |
| **PDF.js 扩展** | ✅ | ✅ | ⚠️ 理论可行，但需用户配合 |
| **在线 PDF.js 服务** | ✅ | ✅ | ⚠️ 依赖第三方服务 |

---

## 🔍 代码中的"假象"

### 为什么代码看起来支持 PDF？

```javascript
// content.js
if (isPDFViewer()) {
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      // 选择可用，可以通过快捷键捕获
    }
  });
}
```

**分析**：
1. **这段代码永远不会执行成功**
   - 在原生 PDF 查看器中，`isPDFViewer()` 可能返回 true
   - 但 content script 根本无法注入，代码不会运行

2. **只是一个"占位符"**
   - 开发者可能误以为这样就能支持 PDF
   - 实际测试会发现完全不工作
   - README 中也标注为"待解决的问题"

### background.js 的回退方案同样无效

```javascript
// 方法3：使用回退方案（支持 PDF 文本层）
const fallback = await captureSelectionFallback(tab.id);
```

**为什么无效**：
```javascript
await chrome.scripting.executeScript({
  target: { tabId: tabId, allFrames: true },
  world: 'MAIN',
  func: () => {
    const selection = window.getSelection();
    // ...
  }
});
```

- 在 PDF 标签页执行会**直接抛出异常**
- Chrome 不允许在 PDF 查看器进程中执行脚本
- `allFrames: true` 也无法突破限制

---

## ✅ 可行的替代方案

### 方案 1: 要求用户使用 PDF.js 扩展 ⭐

**实现**：
1. 用户安装 [PDF.js](https://github.com/mozilla/pdf.js) 扩展
2. 设置为默认 PDF 查看器
3. PDF.js 将 PDF 渲染为 HTML
4. WordGet 可以正常工作

**优点**：
- 完全可行
- 可以捕获文本和上下文

**缺点**：
- 需要用户额外安装
- 性能不如原生查看器
- 用户体验下降

### 方案 2: 提供在线 PDF 服务集成 🌐

**实现**：
1. 集成 Google Drive PDF Viewer
2. 或自建基于 PDF.js 的在线查看器
3. 用户上传 PDF 到这些服务查看

**优点**：
- 技术可行
- 用户不需要安装额外扩展

**缺点**：
- 依赖网络
- 隐私问题（需要上传文件）
- 本地 PDF 无法直接使用

### 方案 3: 开发桌面应用 💻

**实现**：
使用 Electron 等框架开发桌面应用：
```javascript
// Electron 可以完全控制 PDF 渲染
const { BrowserWindow } = require('electron');
const pdfWindow = new BrowserWindow({
  webPreferences: {
    plugins: true
  }
});
```

**优点**：
- 完全控制权
- 可以实现任何功能

**缺点**：
- 不是浏览器扩展
- 开发和维护成本高

### 方案 4: 使用浏览器 Native Messaging 🔌

**实现**：
```javascript
// manifest.json
{
  "permissions": ["nativeMessaging"]
}

// background.js
chrome.runtime.sendNativeMessage(
  'com.wordget.pdfhelper',
  { action: 'extractText', path: pdfPath },
  response => {
    console.log('PDF 文本:', response.text);
  }
);
```

配合原生应用（Python/C++）处理 PDF：
```python
# native_app.py
import PyPDF2

def extract_text(pdf_path):
    with open(pdf_path, 'rb') as file:
        pdf = PyPDF2.PdfReader(file)
        text = ''
        for page in pdf.pages:
            text += page.extract_text()
    return text
```

**优点**：
- 可以处理本地 PDF 文件
- 功能强大

**缺点**：
- 需要安装原生应用
- 安装和配置复杂
- 跨平台兼容性问题
- 无法处理在线 PDF

---

## 🎯 结论

### 当前实现的问题

1. **代码存在但不工作**
   ```javascript
   // ❌ 这段代码在 PDF 中永远不会执行
   if (isPDFViewer()) {
     // ...
   }
   ```

2. **README 中的承诺是虚假的**
   - "📖 PDF支持 - 在阅读PDF文档时也能保存单词" ❌
   - 实际上完全不支持

3. **待办事项明确标注了问题**
   - "pdf不能识别并保存" ✅ 诚实

### 为什么不可行的根本原因

```
Chrome 浏览器扩展权限模型
    ↓
为了安全，严格隔离特权内容
    ↓
PDF 查看器是特权进程
    ↓
Content Scripts 无法访问
    ↓
无法注入代码 → 无法捕获文本
    ↓
PDF 支持从根本上不可行 ❌
```

### 建议

1. **移除 PDF 相关代码**
   ```javascript
   // 删除这些无效代码
   // - isPDFViewer()
   // - PDF.js 特定处理
   // - captureSelectionFallback 中的 PDF 注释
   ```

2. **更新文档**
   - README 移除 "PDF 支持" 声明
   - 添加明确的限制说明
   - 解释技术原因

3. **提供替代方案说明**
   ```markdown
   ## PDF 支持说明
   
   由于浏览器安全限制，扩展无法直接访问 Chrome 原生 PDF 查看器。
   
   如需在 PDF 中使用 WordGet，请：
   1. 使用 PDF.js 扩展打开 PDF 文件
   2. 或将 PDF 内容复制到文本编辑器
   3. 或使用在线 PDF 查看服务
   ```

4. **聚焦核心功能**
   - 专注于网页内容
   - 优化现有翻译功能
   - 提升用户体验

---

**技术限制是真实存在的，与其维护无效代码，不如坦诚说明并提供替代方案。** 🎯
