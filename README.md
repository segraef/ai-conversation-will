# AI Conversation Assistant

A real-time AI conversation assistant that transcribes, summarizes, and answers questions from audio input using Azure Speech-to-Text and Azure OpenAI services.

## Features

- **Audio Recording**: Capture audio from microphone or system audio (browser limitations may apply)
- **Real-time Transcription**: Convert speech to text with speaker identification using Azure Speech-to-Text
- **Automatic Summarization**: Generate concise summaries of conversation chunks
- **Question Detection**: Automatically identify and answer questions in the conversation
- **Manual Q&A**: Ask questions directly and get AI-powered answers
- **Settings Management**: Configure Azure services and app preferences
- **Dark Mode**: Toggle between light and dark themes

## Technical Implementation

This application is built with:

- React for the UI components
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for UI components
- Azure Speech-to-Text API for transcription
- Azure OpenAI API for summarization and question answering

## Getting Started

To use this application, you need:

1. An Azure subscription with Speech-to-Text service
2. An Azure OpenAI service deployment
3. Configure the application with your service endpoints and subscription keys

## Configuration

Set up your Azure services in the Settings panel:

- **Azure Speech-to-Text**:
  - Endpoint URL (e.g., https://eastus.stt.speech.microsoft.com)
  - Subscription key
  
- **Azure OpenAI**:
  - Endpoint URL (e.g., https://your-resource.openai.azure.com)
  - Subscription key
  - Deployment name (e.g., gpt-4)

## Usage

1. Configure your Azure services in the Settings panel
2. Click the microphone button to start recording
3. View the real-time transcript as you speak
4. Switch between Live Transcript, Summaries, and Q&A views
5. Ask questions manually in the Q&A tab
6. Click the microphone button again to stop recording