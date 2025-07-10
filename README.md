# AI Conversation Assistant

A real-time AI conversation assistant that transcribes, summarizes, and answers questions from audio input using Azure Speech-to-Text and Azure OpenAI services.

## 🌐 Live Demo

**Try it now: [https://segraef.github.io/ai-conversation-will/](https://segraef.github.io/ai-conversation-will/)**

*Note: You'll need your own Azure Speech and OpenAI service credentials to use the application.*

## ✨ Features

- **🎤 Real-time Transcription**: Convert speech to text using Azure Speech SDK with continuous recognition
- **📝 Automatic Summarization**: Generate concise summaries of conversation chunks using Azure OpenAI
- **❓ Intelligent Q&A**: Automatically detect questions in conversation and provide AI-powered answers
- **💬 Manual Questions**: Ask any question and get contextual or general knowledge answers
- **⚙️ Connection Testing**: Test Azure service connections before starting
- **🌙 Dark Mode**: Beautiful dark/light theme toggle
- **💾 Persistent Settings**: Your settings and connection status are saved locally
- **📱 Responsive Design**: Works on desktop and mobile devices

## 🏗️ Technical Implementation

Built with modern web technologies:

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Speech Recognition**: Azure Speech SDK (microsoft-cognitiveservices-speech-sdk)
- **AI Services**: Azure OpenAI REST API
- **State Management**: React Context + localStorage persistence
- **Real-time Features**: Continuous speech recognition with event handling

## 🚀 Getting Started

### Prerequisites

You need an Azure subscription with:
1. **Azure Speech Service** - for speech-to-text transcription
2. **Azure OpenAI Service** - for summaries and question answering

### Installation

1. Clone the repository:
```bash
git clone https://github.com/segraef/ai-conversation-will.git
cd ai-conversation-will
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## 🚀 Deployment

### GitHub Pages (Live Demo)

The app is automatically deployed to GitHub Pages at: [https://segraef.github.io/ai-conversation-will/](https://segraef.github.io/ai-conversation-will/)

To deploy updates:
```bash
npm run deploy
```

This will build the project and deploy it to the `gh-pages` branch automatically.

### Other Deployment Options

- **Netlify**: Connect your GitHub repo for auto-deployment
- **Vercel**: Import your GitHub project for instant deployment  
- **Azure Static Web Apps**: Deploy directly to Azure

## ⚙️ Configuration

Configure your Azure services in the Settings panel:

### Azure Speech-to-Text
- **Region**: Your Azure region (e.g., `eastus`, `westeurope`)
- **Subscription Key**: Your Speech service key
- **Endpoint**: Speech service endpoint (e.g., `https://eastus.api.cognitive.microsoft.com/`)

### Azure OpenAI
- **Endpoint**: Your OpenAI resource endpoint (e.g., `https://your-resource.openai.azure.com`)
- **Subscription Key**: Your OpenAI service key  
- **Deployment Name**: Your model deployment name (e.g., `gpt-4`, `gpt-35-turbo`)

## 📖 Usage

1. **Setup**: Configure your Azure services in Settings and test connections
2. **Start Recording**: Click the "Listen" button to begin audio capture
3. **View Transcript**: See real-time speech-to-text in the Live Transcript tab
4. **Check Summaries**: Automatic summaries appear in the Summaries tab
5. **Ask Questions**: 
   - Questions detected in speech are automatically answered
   - Manually ask questions in the Q&A tab
6. **Export Data**: All data persists locally and can be exported

## 🎯 Question Types Supported

- **Conversation Questions**: "What did we discuss about the project?"
- **General Knowledge**: "What is machine learning?"
- **Real-time Info**: "What time is it?" (handled locally)
- **Contextual**: Questions using conversation history as context

## 🛠️ Development

### Project Structure
```
src/
├── components/          # React components
├── contexts/           # React context providers
├── services/           # Azure service integrations
├── types/             # TypeScript type definitions
└── lib/               # Utility functions
```

### Key Components
- `AzureSpeechService`: Handles speech-to-text with Azure Speech SDK
- `AzureOpenAIService`: Manages OpenAI API calls for summaries and Q&A
- `AppContext`: Central state management and service orchestration

## 🔧 Troubleshooting

### Common Issues

1. **Microphone not working**: Ensure browser permissions are granted
2. **Connection failed**: Verify Azure service keys and endpoints
3. **No transcription**: Check Speech service region and subscription key
4. **Poor audio quality**: Use a good microphone and quiet environment

### Browser Support

- Chrome/Edge: Full support with optimal performance
- Firefox: Basic support (Web Speech API fallback)
- Safari: Limited support

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Ensure you have valid Azure service credentials
3. View the real-time transcript as you speak
4. Switch between Live Transcript, Summaries, and Q&A views
5. Ask questions manually in the Q&A tab
6. Click the microphone button again to stop recording