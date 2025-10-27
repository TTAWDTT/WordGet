# 模块化开发指南

## 📂 项目结构

```
WordGet/
├── modules/                    # 功能模块目录
│   ├── theme-detector.js      # 主题检测
│   ├── translator.js          # 翻译功能
│   ├── storage-manager.js     # 数据存储
│   └── tooltip-ui.js          # UI组件
├── background.js              # 后台服务
├── content.js                 # 页面脚本
├── sidebar.js                 # 侧边栏
└── manifest.json              # 扩展配置
```

## 🔧 模块使用示例

### 1. 在 content.js 中使用模块

```javascript
// 动态导入模块
const themeModule = await import(chrome.runtime.getURL('modules/theme-detector.js'));
const ThemeDetector = themeModule.ThemeDetector;

// 使用模块功能
const colorData = ThemeDetector.extractPageColors();
const theme = ThemeDetector.analyzeTheme(colorData);
```

### 2. 在 background.js 中使用模块

由于 Service Worker 限制，background.js 直接包含了必要的功能代码。如需模块化，可以使用打包工具。

### 3. 创建新模块

```javascript
// modules/my-module.js
export const MyModule = {
  myFunction() {
    // 功能实现
  }
};
```

## 📝 开发规范

### 代码组织

- **单一职责**：每个模块只做一件事
- **明确接口**：使用 export 导出公共 API
- **文档注释**：使用 JSDoc 注释
- **错误处理**：所有异步操作使用 try-catch

### 命名规范

- **文件名**：kebab-case（如 `theme-detector.js`）
- **类名**：PascalCase（如 `TooltipUI`）
- **函数名**：camelCase（如 `extractPageColors`）
- **常量**：UPPER_CASE（如 `MAX_RETRIES`）

### 模块模板

```javascript
/**
 * 模块描述
 */

export const ModuleName = {
  /**
   * 函数描述
   * @param {string} param - 参数描述
   * @returns {Promise<Object>} 返回值描述
   */
  async functionName(param) {
    try {
      // 实现逻辑
      return result;
    } catch (error) {
      console.error('错误:', error);
      throw error;
    }
  }
};
```

## 🎯 最佳实践

### 1. 异步编程

```javascript
// ✅ 推荐：使用 async/await
async function getData() {
  const data = await fetchData();
  return data;
}

// ❌ 避免：回调地狱
function getData(callback) {
  fetchData(function(data) {
    callback(data);
  });
}
```

### 2. 错误处理

```javascript
// ✅ 推荐：完整的错误处理
try {
  const result = await operation();
  return result;
} catch (error) {
  console.error('操作失败:', error);
  return defaultValue;
}

// ❌ 避免：忽略错误
const result = await operation(); // 可能抛出未捕获的异常
```

### 3. 模块依赖

```javascript
// ✅ 推荐：按需导入
const { ThemeDetector } = await import('./modules/theme-detector.js');

// ❌ 避免：导入整个模块但只用一个函数
import * as Everything from './modules/theme-detector.js';
```

## 🧪 测试建议

### 单元测试

为每个模块编写独立测试：

```javascript
// test/theme-detector.test.js
import { ThemeDetector } from '../modules/theme-detector.js';

test('parseColor should parse RGB correctly', () => {
  const result = ThemeDetector.parseColor('rgb(255, 0, 0)');
  expect(result).toEqual({ r: 255, g: 0, b: 0 });
});
```

### 集成测试

测试模块间协作：

```javascript
// 测试主题检测和UI显示的配合
const theme = ThemeDetector.analyzeTheme(colorData);
const tooltip = new TooltipUI();
tooltip.setTheme(theme);
tooltip.show({ word: 'test', wordTranslation: '测试', x: 100, y: 100 });
```

## 📊 性能优化

### 1. 延迟加载

```javascript
// 只在需要时加载模块
document.getElementById('btn').addEventListener('click', async () => {
  const module = await import('./modules/heavy-module.js');
  module.doSomething();
});
```

### 2. 缓存模块

```javascript
// 缓存已加载的模块
let cachedModule = null;

async function getModule() {
  if (!cachedModule) {
    cachedModule = await import('./modules/module.js');
  }
  return cachedModule;
}
```

### 3. 并行加载

```javascript
// 并行加载多个模块
const [module1, module2] = await Promise.all([
  import('./modules/module1.js'),
  import('./modules/module2.js')
]);
```

## 🔍 调试技巧

### 1. 添加日志

```javascript
export const MyModule = {
  async process(data) {
    console.log('🔄 开始处理:', data);
    
    try {
      const result = await doSomething(data);
      console.log('✅ 处理成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 处理失败:', error);
      throw error;
    }
  }
};
```

### 2. 使用断点

在 Chrome 开发者工具中：
1. 打开 Sources 面板
2. 找到模块文件
3. 点击行号添加断点
4. 触发功能，查看变量值

### 3. 性能分析

```javascript
console.time('operation');
await expensiveOperation();
console.timeEnd('operation');
```

## 🚀 部署检查清单

发布前确认：

- [ ] 所有模块文件在 `modules/` 目录
- [ ] `manifest.json` 包含 `web_accessible_resources` 配置
- [ ] 所有 import 路径使用 `chrome.runtime.getURL()`
- [ ] 错误处理完整
- [ ] 日志输出清晰
- [ ] 在多个页面测试
- [ ] 检查控制台无错误
- [ ] 功能在不同浏览器测试（如果支持）

## 📚 参考资料

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Web Accessible Resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)
