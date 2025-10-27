# 🚀 快速测试指南 - Tooltip 位置修复验证

## 立即测试（5分钟）

### 方法 1: 使用专门测试页面 ⭐️ 推荐

1. **打开测试页面**
   ```
   在浏览器中打开: test-tooltip-position.html
   ```

2. **开启调试模式**
   - 点击页面上的"开启调试模式"按钮
   - 或在控制台运行: `window.wordgetDebug = true`

3. **开启翻译模式**
   - 点击"开启翻译模式"按钮
   - 或按快捷键: `Ctrl+Q`

4. **测试9个区域**
   - 在每个标记的区域选择英文文本
   - 观察tooltip是否在正确位置显示
   - 查看调试面板的详细信息

5. **测试滚动**
   - 滚动到页面底部的"Long Content"区域
   - 选择文本测试tooltip位置

### 方法 2: 使用真实网站

推荐测试网站：
- 📖 [Wikipedia](https://en.wikipedia.org) - 长文章测试
- 📚 [GitHub](https://github.com) - README和代码测试
- 📰 [Medium](https://medium.com) - 博客文章测试

**测试步骤**：
1. 打开任意上述网站
2. 按 `Ctrl+Q` 开启翻译模式
3. 在页面不同位置选择英文文本
4. 特别注意测试：
   - ✅ 页面顶部
   - ✅ 页面底部
   - ✅ 屏幕左右边缘
   - ✅ 滚动后的位置

## 验证检查清单

### ✅ 基础功能
- [ ] Tooltip能够正确显示
- [ ] 翻译内容正确
- [ ] 加载状态显示正常
- [ ] 动画效果流畅

### ✅ 位置准确性
- [ ] 中心区域：显示在右下方
- [ ] 右边缘：显示在左侧
- [ ] 底边缘：显示在上方
- [ ] 右下角：显示在左上方
- [ ] 没有超出视口边界

### ✅ 滚动场景
- [ ] 页面顶部位置正确
- [ ] 页面中部位置正确
- [ ] 页面底部位置正确
- [ ] 滚动后立即选择正常工作

### ✅ 边界情况
- [ ] 窗口缩放后仍然正常
- [ ] 小窗口也能正确显示
- [ ] 在iframe中工作正常
- [ ] Shadow DOM中工作正常

## 常见问题诊断

### 问题 1: Tooltip完全不显示

**诊断**：
```javascript
// 在控制台运行
window.wordgetDebug = true;
// 然后选择文本，查看日志
```

**可能原因**：
- 翻译模式未开启
- 扩展未正确加载
- JavaScript错误

**解决方法**：
1. 确认翻译模式图标已显示
2. 刷新页面重新加载扩展
3. 查看控制台错误信息

### 问题 2: Tooltip位置偏移

**诊断**：
```javascript
// 检查tooltip元素
const tooltip = document.querySelector('#wordget-translation-tooltip');
console.log({
  left: tooltip.style.left,
  top: tooltip.style.top,
  position: getComputedStyle(tooltip).position,
  视口位置: tooltip.getBoundingClientRect()
});
```

**检查点**：
- `position` 应该是 `fixed`
- `left` 和 `top` 应该是有效数字
- 视口位置应该在边界内

### 问题 3: Tooltip一闪而过

**可能原因**：
- 鼠标移动触发了隐藏逻辑
- 点击事件触发了隐藏

**测试方法**：
```javascript
// 禁用自动隐藏（临时测试）
const tooltip = document.querySelector('#wordget-translation-tooltip');
if (tooltip) {
  tooltip.style.pointerEvents = 'all';
  // 然后尝试与tooltip交互
}
```

## 调试命令速查

### 开启/关闭调试模式
```javascript
window.wordgetDebug = true;   // 开启
window.wordgetDebug = false;  // 关闭
```

### 检查tooltip状态
```javascript
const tooltip = document.querySelector('#wordget-translation-tooltip');
console.log('存在:', !!tooltip);
console.log('可见:', tooltip?.classList.contains('visible'));
console.log('位置:', {
  left: tooltip?.style.left,
  top: tooltip?.style.top
});
```

### 检查视口信息
```javascript
console.log('视口尺寸:', {
  width: window.innerWidth,
  height: window.innerHeight
});
console.log('滚动位置:', window.scrollY);
```

### 模拟测试
```javascript
// 创建测试选择
const range = document.createRange();
const textNode = document.querySelector('p').firstChild;
range.setStart(textNode, 0);
range.setEnd(textNode, 20);
window.getSelection().removeAllRanges();
window.getSelection().addRange(range);

// 触发翻译（需要翻译模式开启）
document.dispatchEvent(new MouseEvent('mouseup', {
  clientX: 500,
  clientY: 500,
  bubbles: true
}));
```

## 报告问题

如果仍然发现问题，请提供以下信息：

### 环境信息
- 浏览器: Chrome/Edge 版本号
- 操作系统: Windows/Mac/Linux
- 屏幕分辨率:
- 页面缩放级别:

### 重现步骤
1. 打开的网站URL
2. 具体操作步骤
3. 选择的文本内容
4. 鼠标点击的位置

### 调试信息
```javascript
// 运行以下命令并提供输出
window.wordgetDebug = true;

// 然后重现问题，复制控制台输出

// 同时提供:
const tooltip = document.querySelector('#wordget-translation-tooltip');
console.log('Tooltip调试信息:', {
  存在: !!tooltip,
  innerHTML: tooltip?.innerHTML,
  样式: {
    left: tooltip?.style.left,
    top: tooltip?.style.top,
    position: getComputedStyle(tooltip).position,
    zIndex: getComputedStyle(tooltip).zIndex,
    opacity: getComputedStyle(tooltip).opacity
  },
  视口位置: tooltip?.getBoundingClientRect()
});
```

## 预期结果 vs 实际结果

### ✅ 正常情况

**页面中心选择文本**:
```
预期: Tooltip显示在选择右下方约15px处
实际: [应该与预期一致]
```

**屏幕右边缘选择**:
```
预期: Tooltip显示在选择左侧
实际: [应该与预期一致]
```

**屏幕底部选择**:
```
预期: Tooltip显示在选择上方
实际: [应该与预期一致]
```

### ❌ 如果不一致

请记录：
1. 预期位置和实际位置的截图
2. 控制台的调试输出
3. 浏览器开发工具中tooltip元素的Computed样式

## 性能检查

### 响应时间测试
```javascript
// 测试从选择到显示的时间
let startTime;
document.addEventListener('mousedown', () => {
  startTime = performance.now();
});

// 使用 MutationObserver 检测tooltip创建
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.id === 'wordget-translation-tooltip') {
        const endTime = performance.now();
        console.log('显示延迟:', (endTime - startTime).toFixed(2), 'ms');
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
```

**预期延迟**: < 200ms（包括网络请求）

## 成功标准

测试通过的标准：

- ✅ 9个测试区域100%正确显示
- ✅ 长页面滚动测试全部通过
- ✅ 真实网站测试无明显偏差
- ✅ 边界检测完全正确
- ✅ 无任何超出视口的情况
- ✅ 动画流畅无闪烁
- ✅ 响应时间 < 200ms

如果以上全部通过，说明修复完全成功！🎉

---

**测试准备时间**: < 1分钟  
**基础测试时间**: 3-5分钟  
**完整测试时间**: 10-15分钟  

祝测试顺利！
