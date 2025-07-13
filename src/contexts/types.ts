// Application settings
export interface AppSettings {
  // Dark mode toggle
  darkMode: boolean;

  // Azure Speech-to-Text settings
  stt: {
    endpoint: string;
    subscriptionKey: string;
    region: string;
    // Language detection options
    enableLanguageDetection?: boolean;
    candidateLanguages?: string[];
    continuousLanguageIdentification?: boolean;
  };

  // Azure OpenAI settings
  openai: {
    endpoint: string;
    subscriptionKey: string;
    deploymentName: string;
  };

  // Audio settings
  audio: {
    source: 'default' | 'external'; // Updated to handle different mic inputs
    chunkIntervalMinutes: number;
    selectedDeviceId?: string; // Store selected audio input device
  };

  // Translation settings
  translation: {
    enabled: boolean;
    targetLanguage: string;
    showOriginal: boolean; // Whether to show original text alongside translation
  };
}

// Default application settings
export const defaultSettings: AppSettings = {
  darkMode: false,
  stt: {
    endpoint: '',
    subscriptionKey: '',
    region: '',
    enableLanguageDetection: true,
    candidateLanguages: ['en-US', 'de-DE'],
    continuousLanguageIdentification: true,
  },
  openai: {
    endpoint: '',
    subscriptionKey: '',
    deploymentName: 'gpt-35-turbo',
  },
  audio: {
    source: 'default',
    chunkIntervalMinutes: 5,
    selectedDeviceId: undefined,
  },
  translation: {
    enabled: false,
    targetLanguage: 'es-ES', // Default to Spanish
    showOriginal: true,
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
  detectedLanguage?: string; // Language detected by auto-detection
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

// Audio device information
export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

// Translation segment representing translated text
export interface TranslationSegment {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  confidence: number;
  relatedTranscriptId: string;
}

// Analysis result representing text analysis insights
export interface AnalysisResult {
  id: string;
  type: 'sentiment' | 'emotion' | 'topic' | 'keyword' | 'summary';
  title: string;
  content: string;
  score?: number; // For sentiment/emotion scores
  confidence: number;
  timestamp: number;
  relatedTranscriptIds: string[];
  metadata?: Record<string, any>; // Additional analysis data
}

// Supported languages for translation
export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ru-RU', name: 'Russian' },
] as const;
