# Whisper Transcribe App - MVP

A mobile transcription application using OpenAI's Whisper model for local, privacy-focused speech-to-text conversion. Optimized for devices with 4GB RAM constraint.

## Features

### Core Functionality
- **Local Audio Recording**: Record audio directly in the app with pause/resume functionality
- **Real-time Transcription**: Convert speech to text using Whisper AI model
- **Privacy-First**: All processing done locally on device - no cloud uploads
- **Multiple Model Options**: Choose between Tiny, Base, and Small models based on accuracy/speed needs
- **Transcription Management**: Save, search, and organize all your transcriptions
- **Export Options**: Share transcriptions as text or JSON files

### Technical Specifications
- **Platform**: React Native (iOS & Android)
- **Model**: OpenAI Whisper (whisper.cpp implementation)
- **Memory Usage**: Optimized for 4GB RAM devices
- **Audio Format**: M4A/AAC at 16kHz sample rate
- **Language Support**: 80+ languages with auto-detection

## Model Comparison

| Model | Size | RAM Usage | Accuracy | Speed |
|-------|------|-----------|----------|-------|
| Tiny | 39 MB | ~500 MB | Good | Fast |
| Base | 74 MB | ~1 GB | Better | Medium |
| Small | 244 MB | ~2 GB | Best | Slower |

## Installation

### Prerequisites
- Node.js 16+
- React Native development environment
- Android Studio (for Android) or Xcode (for iOS)
- 4GB+ RAM device

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd whisper-transcribe-app
```

2. Install dependencies:
```bash
npm install
```

3. iOS specific setup (Mac only):
```bash
cd ios && pod install
```

4. Run the app:
```bash
# Android
npm run android

# iOS
npm run ios
```

## Project Structure

```
whisper-transcribe-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens (Record, Transcriptions, Settings)
│   ├── services/       # Core services (Whisper, Audio, Storage)
│   ├── models/         # TypeScript interfaces
│   └── utils/          # Helper functions
├── android/            # Android-specific code
├── ios/               # iOS-specific code
└── App.tsx            # Main app entry point
```

## Key Services

### WhisperService
- Manages Whisper model initialization and loading
- Handles audio transcription processing
- Configurable model size and language settings
- Memory-optimized chunk processing

### AudioRecorderService
- Platform-specific audio recording
- Real-time recording progress tracking
- Pause/resume functionality
- Automatic permission handling

### StorageService
- Local transcription persistence
- Audio file management
- Export functionality
- Settings storage

## UI Screens

### Record Screen
- Large recording button with visual feedback
- Real-time timer display
- Pause/resume controls
- Instant transcription display
- Recording tips and guidelines

### Transcriptions Screen
- List of all saved transcriptions
- Search functionality
- Export and delete options
- Metadata display (duration, size, date)

### Settings Screen
- Model selection (Tiny/Base/Small)
- Recording preferences
- Storage management
- Clear data option
- App information

## Performance Optimizations

### Memory Management
- Audio chunk processing (30-second segments)
- Model lazy loading
- Automatic cleanup of old recordings
- Efficient state management

### 4GB RAM Optimization
- Default to Tiny model (39MB)
- Single-channel audio recording
- 16kHz sample rate
- Limited transcription cache

## Privacy & Security
- **No Internet Required**: All processing happens locally
- **No Data Collection**: Your recordings never leave your device
- **Local Storage**: All data stored in app's private directory
- **User Control**: Clear all data anytime from settings

## Development

### Build for Production

**Android:**
```bash
cd android
./gradlew assembleRelease
```

**iOS:**
```bash
cd ios
xcodebuild -workspace WhisperTranscribeApp.xcworkspace -scheme WhisperTranscribeApp -configuration Release
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Limitations

### Current MVP Limitations
- Maximum 5-minute recordings
- English UI only (transcription supports 80+ languages)
- Basic export formats (Text/JSON)
- No cloud backup
- No real-time transcription during recording

### Device Requirements
- Minimum 4GB RAM
- Android 6.0+ / iOS 12.0+
- 500MB free storage space

## Future Enhancements

### Phase 2
- Real-time transcription display
- Cloud backup option
- More export formats (SRT, VTT, PDF)
- Speaker diarization
- Custom vocabulary

### Phase 3
- Desktop sync
- Team collaboration features
- API integration
- Advanced editing tools
- Voice commands

## Troubleshooting

### Common Issues

**Model Download Fails:**
- Check internet connection
- Ensure sufficient storage space
- Try switching to a smaller model

**Recording Permission Denied:**
- Go to device settings
- Enable microphone permission for the app
- Restart the app

**Transcription Accuracy Issues:**
- Try using a larger model
- Ensure clear audio with minimal background noise
- Check language settings

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - See LICENSE file for details

## Acknowledgments

- OpenAI Whisper team for the amazing model
- whisper.cpp for the efficient C++ implementation
- React Native community for the excellent framework

## Support

For issues and feature requests, please open an issue on GitHub.

---

**Version:** 0.1.0 (MVP)  
**Last Updated:** 2025