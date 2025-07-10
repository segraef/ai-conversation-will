# AI Conversation Assistant - Local Development Guide

## Running the App Locally

To run the app locally in VSCode for testing, follow these steps:

1. **Open a terminal in VSCode**
   - Use the Terminal menu and select "New Terminal"
   - Or use the keyboard shortcut (Ctrl+` on Windows/Linux, ⌘+` on Mac)

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **Access the app**
   - The app will start on a local development server (typically http://localhost:5173)
   - Vite will display the URL in the terminal
   - You can Ctrl+click the URL in the terminal to open it directly

## Configuration for Real Azure Services

The app now supports both real Azure services and fallback functionality:

1. **Configure Azure Speech-to-Text settings** in the app's settings panel:
   - Endpoint URL (e.g., https://eastus.stt.speech.microsoft.com)
   - Subscription key
   - Use the "Test Connection" button to validate your settings

2. **Configure Azure OpenAI settings** in the app's settings panel:
   - Endpoint URL (e.g., https://your-resource.openai.azure.com)
   - Subscription key
   - Deployment name (e.g., gpt-4)
   - Use the "Test Connection" button to validate your settings

3. **Choose audio source**:
   - Microphone (requires browser permissions)
   - System audio (may require additional browser or OS settings)

## Testing the Recording Feature

When testing the recording feature:

1. Make sure your browser has permission to access your microphone
2. Click the "Listen" button to start/stop recording
3. **Real Speech Recognition**: The app uses the Web Speech API as a fallback for live speech recognition
4. **Real Azure Integration**: When properly configured, the app will use real Azure OpenAI for summaries and Q&A

## Troubleshooting

If the recording doesn't work:

1. Check browser console for errors (F12 or right-click > Inspect > Console)
2. Ensure Azure credentials are entered correctly in settings and test connections
3. Verify microphone permissions in your browser settings
4. Check that Web Speech API is supported in your browser (Chrome, Edge recommended)
5. If testing with real Azure services, check your subscription status and quota

## Development Notes

- **Speech Recognition**: Uses Web Speech API for live transcription
- **Azure Integration**: Real Azure OpenAI API calls for summaries and Q&A when configured
- **Connection Testing**: Built-in connection testing for both STT and OpenAI services
- **Dark Mode**: Toggle available in the header, persists across sessions
- The `useKV` hook uses localStorage for data persistence
