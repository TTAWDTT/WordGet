# Changelog

All notable changes to the WordGet project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-10-24

### Added
- 🎉 Initial release of WordGet browser extension
- ⌨️ Keyboard shortcut (Ctrl+Shift+W) for quick word saving
- 🖱️ Right-click context menu integration
- 🔍 Automatic word translation using Google Translate API
- 📝 Smart sentence extraction from page context
- 🗂️ Beautiful sidebar interface with minimalist design
- 🔊 Text-to-speech pronunciation feature
- 📚 Comprehensive vocabulary list with search functionality
- 🏷️ Filter words by review status (All/Reviewed/Unreviewed)
- ✅ Mark words as reviewed/mastered
- 📒 Personal notes for each word
- 💾 Export vocabulary to JSON format
- 📥 Import vocabulary from JSON files
- 📖 PDF document support
- 🎨 Modern gradient UI design
- 🌐 Multi-browser support (Chrome, Firefox, Edge, Opera, Brave)
- 🔐 Privacy-focused: all data stored locally
- ⚙️ Settings panel for customization
- 🔔 Visual notification when words are saved
- 📱 Responsive design for various screen sizes

### Features
- **Word Management**
  - Save words with one keyboard shortcut
  - Automatic translation
  - Example sentence extraction
  - Source URL tracking
  - Timestamp recording
  
- **Learning Tools**
  - Search functionality
  - Review status tracking
  - Personal notes
  - Pronunciation support
  
- **Data Management**
  - Local storage using Chrome Storage API
  - Export to JSON
  - Import from JSON
  - Smart duplicate handling
  
- **User Interface**
  - Clean minimalist design
  - Smooth animations
  - Intuitive navigation
  - Dark text on light background for readability

### Technical Details
- Built with Manifest V3
- Uses Chrome Storage API for data persistence
- Side Panel API for modern sidebar experience
- Web Speech API for pronunciation
- Content scripts for page interaction
- Service worker for background operations

### Documentation
- Comprehensive README with feature overview
- Detailed installation guide
- Complete usage documentation
- Contributing guidelines
- Demo page for testing

### Browser Support
- Chrome 88+
- Edge 88+
- Firefox 109+
- Opera 74+
- Brave (latest)

---

## [Unreleased]

### Planned Features
- [ ] Oxford Dictionary API integration
- [ ] Spaced repetition review system
- [ ] Word grouping and tagging
- [ ] Learning statistics dashboard
- [ ] Cloud synchronization
- [ ] Anki format export
- [ ] Mobile browser support
- [ ] Offline translation cache
- [ ] Custom API configuration
- [ ] Dark mode theme
- [ ] Multiple language UI
- [ ] Voice input for words

### Improvements
- [ ] Enhanced PDF support
- [ ] Better sentence extraction algorithm
- [ ] Faster translation loading
- [ ] Keyboard navigation
- [ ] Batch operations
- [ ] Advanced search with regex
- [ ] Word frequency analysis

### Bug Fixes
- None reported yet

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute to this project.

## Links

- [GitHub Repository](https://github.com/TTAWDTT/WordGet)
- [Issue Tracker](https://github.com/TTAWDTT/WordGet/issues)
- [Documentation](README.md)
