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

## Configuration for Testing

Since the app requires Azure services, you'll need to:

1. **Configure Azure Speech-to-Text settings** in the app's settings panel:
   - Endpoint URL (e.g., https://eastus.stt.speech.microsoft.com)
   - Subscription key

2. **Configure Azure OpenAI settings** in the app's settings panel:
   - Endpoint URL (e.g., https://your-resource.openai.azure.com)
   - Subscription key

3. **Choose audio source**:
   - Microphone (requires browser permissions)
   - System audio (may require additional browser or OS settings)

## Testing the Recording Feature

When testing the recording feature:

1. Make sure your browser has permission to access your microphone
2. Click the "Record" button to start/stop recording
3. The app uses a mock implementation for demo purposes (see AzureSpeechService.ts)
4. In the demo mode, it will generate sample transcript segments every few seconds

## Troubleshooting

If the recording doesn't work:

1. Check browser console for errors (F12 or right-click > Inspect > Console)
2. Ensure Azure credentials are entered correctly in settings
3. Verify microphone permissions in your browser settings
4. If testing with real Azure services, check your subscription status

## Development Notes

- The app uses a mock implementation of Azure services for demo purposes
- The `useKV` hook is simulated using localStorage in this environment
- For real deployment, you would need valid Azure service credentials