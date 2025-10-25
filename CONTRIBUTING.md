# 贡献指南

感谢您对 WordGet 项目的关注！我们欢迎各种形式的贡献。

## 🎯 贡献方式

### 报告问题 (Bug Reports)
- 使用 GitHub Issues 报告问题
- 提供详细的复现步骤
- 包含浏览器版本和操作系统信息
- 如果可能，提供截图或错误日志

### 功能建议 (Feature Requests)
- 在 Issues 中描述您的想法
- 说明该功能的用途和价值
- 如果有参考案例，请提供链接

### 代码贡献 (Pull Requests)
- Fork 项目到您的账号
- 创建特性分支
- 编写清晰的提交信息
- 确保代码符合项目风格
- 提交 PR 并描述改动

## 🛠️ 开发设置

### 克隆项目
```bash
git clone https://github.com/TTAWDTT/WordGet.git
cd WordGet
```

### 在浏览器中加载
1. 打开 Chrome/Edge
2. 访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

### 开发流程
1. 修改代码
2. 在扩展管理页面点击"重新加载"
3. 测试修改
4. 重复以上步骤

## 📝 代码规范

### JavaScript 风格
- 使用 ES6+ 语法
- 使用 async/await 处理异步操作
- 函数命名使用 camelCase
- 添加必要的注释
- 保持代码简洁清晰

### HTML/CSS 风格
- 使用语义化的 HTML 标签
- CSS 使用 BEM 命名或简洁的类名
- 保持样式模块化
- 使用 CSS 变量管理颜色和尺寸

### 提交信息格式
```
<type>: <subject>

<body>

<footer>
```

**类型 (type):**
- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例:**
```
feat: 添加单词分组功能

- 允许用户创建自定义分组
- 支持将单词添加到不同分组
- 添加分组管理界面

Closes #123
```

## 🧪 测试

### 手动测试清单
- [ ] 单词保存功能
- [ ] 翻译加载
- [ ] 例句提取
- [ ] 搜索和筛选
- [ ] 数据导入导出
- [ ] 设置保存
- [ ] 快捷键
- [ ] 右键菜单
- [ ] PDF 支持

### 跨浏览器测试
- [ ] Chrome
- [ ] Edge
- [ ] Firefox
- [ ] Opera

### 测试用例
使用 `demo.html` 进行基础测试：
1. 打开 demo.html
2. 测试各种单词保存场景
3. 验证翻译和例句
4. 测试所有 UI 交互

## 🎨 UI/UX 改进

### 设计原则
- **简约** - 保持界面简洁
- **直观** - 操作易于理解
- **流畅** - 动画自然过渡
- **一致** - 风格统一

### 提交设计改进
1. 说明改进目标
2. 提供设计稿或原型
3. 解释设计决策
4. 实现并测试

## 📚 文档贡献

### 文档类型
- README.md - 项目介绍
- INSTALLATION.md - 安装指南
- USAGE.md - 使用手册
- API.md - API 文档（如需要）

### 改进文档
- 修正错误和歧义
- 补充缺失内容
- 改进示例
- 翻译为其他语言

## 🔧 技术栈

### 核心技术
- **Chrome Extension Manifest V3**
- **Chrome Storage API**
- **Chrome Side Panel API**
- **Web Speech API**
- **Fetch API**

### 开发工具
- Node.js (用于验证)
- Git
- 文本编辑器/IDE

## 🐛 调试技巧

### 查看控制台
**Background Script:**
1. 打开 `chrome://extensions/`
2. 找到 WordGet
3. 点击"Service Worker"查看日志

**Content Script:**
1. 在网页上右键 → 检查
2. Console 标签查看日志

**Sidebar:**
1. 打开侧边栏
2. 右键点击侧边栏 → 检查

### 常用调试方法
```javascript
// 在关键位置添加日志
console.log('Debug:', variable);

// 捕获错误
try {
  // 可能出错的代码
} catch (error) {
  console.error('Error:', error);
}

// 检查 Chrome API 调用
chrome.runtime.sendMessage(msg, response => {
  if (chrome.runtime.lastError) {
    console.error('API Error:', chrome.runtime.lastError);
  }
});
```

## 🚀 发布流程

### 版本号规范
遵循语义化版本 (Semantic Versioning):
- **MAJOR.MINOR.PATCH**
- 1.0.0 → 1.0.1 (补丁)
- 1.0.0 → 1.1.0 (小版本)
- 1.0.0 → 2.0.0 (大版本)

### 发布检查清单
- [ ] 更新版本号
- [ ] 更新 CHANGELOG
- [ ] 测试所有功能
- [ ] 更新文档
- [ ] 创建 Git tag
- [ ] 发布 Release

## 💬 沟通渠道

- **Issues** - 问题报告和功能建议
- **Pull Requests** - 代码贡献
- **Discussions** - 一般讨论

## 📋 待办事项

查看 [Issues](https://github.com/TTAWDTT/WordGet/issues) 中标记为 `good first issue` 的任务，适合新贡献者。

### 功能开发建议
- [ ] Oxford Dictionary API 集成
- [ ] 单词复习提醒
- [ ] 单词分组和标签
- [ ] 学习统计和分析
- [ ] 云端同步
- [ ] 导出为 Anki 格式
- [ ] 移动端支持
- [ ] 多语言界面

### 优化建议
- [ ] 提高翻译速度
- [ ] 优化例句提取算法
- [ ] 改进 PDF 支持
- [ ] 添加键盘导航
- [ ] 优化性能

## ⚖️ 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。

## 🙏 致谢

感谢所有贡献者的付出！您的贡献让 WordGet 变得更好。

---

**Happy Coding!** 🎉
