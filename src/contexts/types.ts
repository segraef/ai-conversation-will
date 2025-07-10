// Application settings
export interface AppSettings {
  // Dark mode toggle
  darkMode: boolean;
  
  // Azure Speech-to-Text settings
  stt: {
    endpoint: string;
    subscriptionKey: string;
    region: string;
  };
  
  // Azure OpenAI settings
  openai: {
    endpoint: string;
    subscriptionKey: string;
    deploymentName: string;
  };
  
  // Audio settings
  audio: {
    source: 'microphone' | 'system';
    chunkIntervalMinutes: number;
  };
}

// Default application settings
export const defaultSettings: AppSettings = {
  darkMode: false,
  stt: {
    endpoint: '',
    subscriptionKey: '',
    region: '',
  },
  openai: {
    endpoint: '',
    subscriptionKey: '',
    deploymentName: 'gpt-4',
  },
  audio: {
    source: 'microphone',
    chunkIntervalMinutes: 5,
  },
};

// Transcript segment representing a piece of transcribed speech
export interface TranscriptSegment {
  id: string;
  text: string;
  speakerId?: string;
  confidence: number;
  timestamp: number;
  isQuestion: boolean;
}

// Summary chunk representing a summarized portion of the transcript
export interface SummaryChunk {
  id: string;
  summary: string;
  startTime: number;
  endTime: number;
  relatedTranscriptIds: string[];
}

// Q&A pair representing a question and its answer
export interface QAPair {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  isManual: boolean; // Whether the question was asked manually or detected in speech
}

// Connection status for external services
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Recording state
export interface RecordingState {
  isRecording: boolean;
  startTime: number | null;
  duration: number;
}