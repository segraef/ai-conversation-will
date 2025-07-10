// Types for the Azure Speech-to-Text service
export interface AzureSTTConfig {
  endpoint: string;
  region: string;
  subscriptionKey: string;
}

// Types for the Azure OpenAI service
export interface AzureOpenAIConfig {
  endpoint: string;
  subscriptionKey: string;
  deploymentName: string;
}

// App settings type
export interface AppSettings {
  stt: AzureSTTConfig;
  openai: AzureOpenAIConfig;
  audioSource: 'microphone' | 'system';
  chunkInterval: number; // minutes
  darkMode: boolean;
}

// Default settings
export const defaultSettings: AppSettings = {
  stt: {
    endpoint: '',
    region: '',
    subscriptionKey: ''
  },
  openai: {
    endpoint: '',
    subscriptionKey: '',
    deploymentName: 'gpt-4'
  },
  audioSource: 'microphone',
  chunkInterval: 5,
  darkMode: false
};

// Transcript segment with speaker ID
export interface TranscriptSegment {
  id: string;
  text: string;
  speakerId: string;
  timestamp: number;
  isQuestion: boolean;
}

// Summary chunk
export interface SummaryChunk {
  id: string;
  startTime: number;
  endTime: number;
  summary: string;
  segments: TranscriptSegment[];
}

// Q&A pair
export interface QAPair {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  isManual: boolean; // Whether the question was manually entered or detected
}

// Service connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Recording state
export interface RecordingState {
  isRecording: boolean;
  startTime: number | null;
  duration: number;
}