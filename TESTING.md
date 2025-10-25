# WordGet Testing Guide

This guide provides comprehensive testing procedures for the WordGet browser extension.

## 🧪 Testing Checklist

### Installation Testing
- [ ] Extension loads without errors in Chrome
- [ ] Extension loads without errors in Firefox
- [ ] Extension loads without errors in Edge
- [ ] All icons display correctly
- [ ] Extension appears in browser toolbar

### Core Functionality
- [ ] **Word Selection**: Select text on webpage
- [ ] **Keyboard Shortcut**: Ctrl+Shift+S saves word
- [ ] **Right-Click Menu**: Context menu appears with selection
- [ ] **Notification**: Visual feedback when word is saved
- [ ] **Sidebar Opens**: Sidebar appears after saving

### Word Saving
- [ ] Single word saves correctly
- [ ] Multiple words (phrases) save correctly
- [ ] Duplicate words are handled properly
- [ ] Word appears in sidebar list
- [ ] Timestamp is recorded

### Sentence Extraction
- [ ] Sentence is captured with the word
- [ ] Sentence appears in word detail view
- [ ] Works on paragraphs
- [ ] Works on list items
- [ ] Works on table cells

### Translation
- [ ] Word translation loads automatically
- [ ] Sentence translation loads automatically
- [ ] Translation displays correctly
- [ ] Translation is saved to storage
- [ ] Works with different languages

### Sidebar Interface
- [ ] Sidebar opens/closes properly
- [ ] Word list displays all saved words
- [ ] Search box filters words
- [ ] Filter tabs work (All/Reviewed/Unreviewed)
- [ ] Clicking word opens detail view
- [ ] Back button returns to list

### Word Detail View
- [ ] Word text displays correctly
- [ ] Translation shows properly
- [ ] Example sentence displays
- [ ] Source information is shown
- [ ] Notes textarea is editable
- [ ] Pronunciation button works
- [ ] Mark as reviewed/unreviewed toggles correctly
- [ ] Delete button removes word

### Data Management
- [ ] Export creates JSON file
- [ ] Export file contains all words
- [ ] Import loads JSON file
- [ ] Import merges with existing words
- [ ] Import handles duplicates
- [ ] Clear all removes all words

### Settings
- [ ] Settings panel opens
- [ ] Translation API selection saves
- [ ] API key field saves
- [ ] Auto-open sidebar toggle works
- [ ] Capture context toggle works
- [ ] Settings persist after reload

### PDF Support
- [ ] Extension works on PDF files
- [ ] Can select text in PDF
- [ ] Keyboard shortcut works in PDF
- [ ] Sentence extraction works in PDF

### Edge Cases
- [ ] Very long words (50+ characters)
- [ ] Very long sentences (500+ characters)
- [ ] Special characters (ñ, é, ü, etc.)
- [ ] Unicode characters (中文, 日本語, etc.)
- [ ] Numbers and symbols
- [ ] Empty selection handling
- [ ] Rapid consecutive saves
- [ ] No internet connection (translation fails gracefully)

## 📝 Test Scenarios

### Scenario 1: First-Time User
1. Install extension
2. Open demo.html
3. Select "comprehensive"
4. Press Ctrl+Shift+S
5. **Expected**: Notification appears, sidebar opens with word details
6. **Verify**: Translation loads, sentence is captured

### Scenario 2: Accumulate Vocabulary
1. Visit 5 different websites
2. Save 2-3 words from each
3. **Expected**: All words appear in sidebar
4. **Verify**: Each has correct source URL and page title

### Scenario 3: Review Words
1. Open sidebar
2. Mark several words as reviewed
3. Switch to "Reviewed" tab
4. **Expected**: Only reviewed words appear
5. **Verify**: Filter persists when searching

### Scenario 4: Data Management
1. Save 10 words
2. Add notes to 5 words
3. Export data
4. Clear all words
5. Import saved file
6. **Expected**: All 10 words restored with notes

### Scenario 5: PDF Reading
1. Open a PDF in browser
2. Select text in PDF
3. Press Ctrl+Shift+S
4. **Expected**: Word saves with correct context

### Scenario 6: Search and Filter
1. Save words: "implement", "comprehensive", "architecture"
2. Search for "impl"
3. **Expected**: Only "implement" appears
4. Clear search
5. Filter to "Unreviewed"
6. **Expected**: All words appear (none reviewed yet)

## 🔍 Browser Testing

### Chrome Testing
```bash
1. Load extension at chrome://extensions/
2. Test on various websites
3. Check console for errors
4. Verify storage at chrome://inspect/#service-workers
```

### Firefox Testing
```bash
1. Load extension at about:debugging
2. Test on various websites
3. Check console at about:debugging
4. Verify storage at about:debugging
```

### Edge Testing
```bash
1. Load extension at edge://extensions/
2. Test on various websites
3. Check console for errors
4. Verify functionality matches Chrome
```

## 🌐 Website Testing

Test on these types of websites:
- [ ] News sites (BBC, CNN, etc.)
- [ ] Wikipedia articles
- [ ] GitHub documentation
- [ ] MDN Web Docs
- [ ] Blog posts (Medium, etc.)
- [ ] Academic papers (PDF)
- [ ] Technical documentation
- [ ] E-commerce sites
- [ ] Social media (Twitter, Reddit)
- [ ] Local HTML files

## 🐛 Known Issues

### Current Limitations
1. **Side Panel API**: Requires Chrome 114+ or Firefox 109+
2. **PDF Support**: Limited to browser's built-in PDF viewer
3. **Translation**: Requires internet connection
4. **Context Menu**: May not appear on all pages (chrome://, about://)

### Browser-Specific
- **Firefox**: Side panel may behave differently than Chrome
- **Safari**: Not supported (Manifest V3 support limited)
- **Older Browsers**: Manifest V3 not supported in Chrome < 88

## 📊 Performance Testing

### Load Time
```javascript
// Measure extension load time
console.time('Extension Load');
// Extension loads
console.timeEnd('Extension Load');
// Expected: < 100ms
```

### Memory Usage
```bash
1. Open Chrome Task Manager (Shift+Esc)
2. Find WordGet extension
3. Monitor memory usage
4. Expected: < 20MB for typical usage
```

### Storage Size
```javascript
// Check storage size
chrome.storage.local.get(null, (items) => {
  const size = JSON.stringify(items).length;
  console.log(`Storage size: ${size} bytes`);
});
```

## 🔒 Security Testing

### Data Privacy
- [ ] No data sent to external servers (except translation API)
- [ ] All word data stored locally
- [ ] No telemetry or analytics
- [ ] No tracking scripts

### Permissions
- [ ] Only requested permissions are used
- [ ] No unnecessary permissions requested
- [ ] Content script only runs when needed
- [ ] Storage is scoped to extension

### XSS Protection
- [ ] User input is escaped in sidebar
- [ ] No eval() or innerHTML with user data
- [ ] CSP compliant
- [ ] Safe handling of external content

## 🎯 Regression Testing

After making changes, verify:
1. All core features still work
2. No console errors appear
3. UI remains responsive
4. Data persists correctly
5. Settings are maintained
6. Import/export still functions

## 📈 Test Coverage

Current test coverage areas:
- ✅ Word saving
- ✅ Translation
- ✅ Sentence extraction
- ✅ Storage operations
- ✅ UI interactions
- ✅ Search and filter
- ✅ Settings persistence
- ✅ Import/export

Areas needing automated tests:
- ⏳ Unit tests for utility functions
- ⏳ Integration tests for API calls
- ⏳ E2E tests for user workflows
- ⏳ Performance benchmarks

## 🤝 Manual Testing Team

If testing with a team:
1. Assign different browsers to different testers
2. Test on different operating systems
3. Use different languages/locales
4. Test with various network conditions
5. Document all issues found

## 📋 Test Report Template

```
Test Date: YYYY-MM-DD
Tester: Name
Browser: Chrome/Firefox/Edge Version X.X
OS: Windows/Mac/Linux

✅ Features Working:
- [List working features]

❌ Issues Found:
- [List issues with reproduction steps]

📝 Notes:
- [Additional observations]
```

## 🚀 Automated Testing (Future)

Consider implementing:
```javascript
// Example test structure
describe('WordGet Extension', () => {
  test('saves word correctly', () => {
    // Test implementation
  });
  
  test('translates word', async () => {
    // Test implementation
  });
  
  test('extracts sentence', () => {
    // Test implementation
  });
});
```

## 📞 Report Issues

If you find bugs during testing:
1. Check if issue already exists
2. Create detailed bug report
3. Include reproduction steps
4. Attach screenshots if relevant
5. Note browser and OS version

Submit at: https://github.com/TTAWDTT/WordGet/issues

---

**Happy Testing!** 🧪✨
