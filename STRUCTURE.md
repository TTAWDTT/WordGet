# WordGet Project Structure

```
WordGet/
│
├── 📄 Core Extension Files
│   ├── manifest.json          # Extension configuration (Manifest V3)
│   ├── background.js          # Service worker (4.9 KB)
│   ├── content.js             # Page interaction script (3.3 KB)
│   └── content.css            # Notification styles (598 B)
│
├── 🎨 User Interface
│   ├── sidebar.html           # Sidebar structure (8.0 KB)
│   ├── sidebar.css            # UI styles (11 KB)
│   └── sidebar.js             # UI logic (14 KB)
│
├── 🖼️ Assets
│   └── icons/
│       ├── icon16.png         # 16×16 extension icon
│       ├── icon32.png         # 32×32 extension icon
│       ├── icon48.png         # 48×48 extension icon
│       └── icon128.png        # 128×128 extension icon
│
├── 📚 Documentation
│   ├── README.md              # Project overview
│   ├── INSTALLATION.md        # Installation guide
│   ├── USAGE.md               # Usage instructions
│   ├── CONTRIBUTING.md        # Contribution guide
│   ├── CHANGELOG.md           # Version history
│   └── LICENSE                # MIT license
│
├── 🧪 Testing & Config
│   ├── demo.html              # Demo/test page
│   ├── package.json           # Project metadata
│   ├── .gitignore             # Git ignore rules
│   ├── PROJECT_SUMMARY.txt    # Project summary
│   └── STRUCTURE.md           # This file
│
└── 📋 Project Info
    └── REQUEST.md             # Original requirements

```

## File Details

### Extension Core (manifest.json)
- **Version**: Manifest V3
- **Permissions**: storage, activeTab, sidePanel, contextMenus
- **Host Permissions**: <all_urls>
- **Commands**: save-word (Ctrl+Shift+S)

### Background Script (background.js)
**Functions:**
- `saveWord()` - Save word to storage
- `translateText()` - Translate using API
- Message handling between components
- Context menu management
- Keyboard shortcut handling

### Content Script (content.js)
**Functions:**
- `extractSentence()` - Extract context sentence
- `showSavedNotification()` - Visual feedback
- `isPDFViewer()` - Detect PDF pages
- Selection and text capture
- Communication with background

### Sidebar (sidebar.html + sidebar.js + sidebar.css)
**Features:**
- Word list display
- Search functionality
- Filter by status
- Word detail view
- Translation display
- Notes editor
- Settings panel
- Import/export UI

### Styling (sidebar.css + content.css)
**Design:**
- CSS Variables for theming
- Gradient header (purple)
- Minimalist cards
- Smooth animations
- Responsive layout
- Clean typography

## Data Flow

```
User Action (Select Text)
        ↓
Content Script (Capture)
        ↓
Background Script (Process)
        ↓
Chrome Storage (Save)
        ↓
Sidebar (Display)
        ↓
Translation API (Translate)
        ↓
Update Storage & UI
```

## Component Interactions

```
┌─────────────┐         ┌──────────────┐         ┌──────────┐
│   Content   │────────▶│  Background  │────────▶│ Storage  │
│   Script    │◀────────│    Script    │◀────────│   API    │
└─────────────┘         └──────────────┘         └──────────┘
      │                        │                        │
      │                        ▼                        │
      │                  ┌──────────┐                   │
      └─────────────────▶│ Sidebar  │◀──────────────────┘
                         │    UI    │
                         └──────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │ Translation  │
                      │     API      │
                      └──────────────┘
```

## Storage Schema

```javascript
{
  words: [
    {
      id: "word_1234567890",
      text: "vocabulary",
      translation: "词汇",
      sentence: "Learning new vocabulary...",
      sentenceTranslation: "学习新词汇...",
      url: "https://example.com",
      pageTitle: "Example Page",
      timestamp: 1234567890,
      notes: "User notes...",
      reviewed: false
    }
  ],
  settings: {
    translationAPI: "google",
    apiKey: "",
    autoOpenSidebar: true,
    captureContext: true
  }
}
```

## API Endpoints

**Translation:**
- Google Translate: `translate.googleapis.com/translate_a/single`
- Method: GET
- Parameters: client, sl, tl, dt, q

## Browser Compatibility

| Feature | Chrome | Firefox | Edge | Opera |
|---------|--------|---------|------|-------|
| Manifest V3 | ✅ | ✅ | ✅ | ✅ |
| Side Panel | ✅ | ⚠️ | ✅ | ✅ |
| Storage API | ✅ | ✅ | ✅ | ✅ |
| Speech API | ✅ | ✅ | ✅ | ✅ |
| Context Menu | ✅ | ✅ | ✅ | ✅ |

⚠️ Firefox: Side Panel requires Firefox 109+

## Build Process

No build process required - pure vanilla JavaScript!

1. **Development**: Edit files directly
2. **Testing**: Load unpacked in browser
3. **Reload**: Click reload in extension manager
4. **Deploy**: ZIP the directory (excluding .git)

## Performance

Estimated performance characteristics:
- **Initial Load**: Typically < 100ms
- **Word Save**: Typically < 50ms (local operation)
- **Translation**: 200-500ms (varies with network and API)
- **Storage Size**: Approximately 1KB per word
- **Memory Usage**: Generally < 10MB for typical usage

## Security

- ✅ No external dependencies
- ✅ No eval() or dangerous APIs
- ✅ Content Security Policy compliant
- ✅ HTTPS for translation API
- ✅ Local data storage only
- ✅ No telemetry or tracking

---

*Last updated: 2024-10-24*
