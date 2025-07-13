import { createContext, useContext, ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import { useKV } from '../hooks/useKV';
import {
  AppSettings,
  defaultSettings,
  TranscriptSegment,
  SummaryChunk,
  QAPair,
  ConnectionStatus,
  RecordingState,
  TranslationSegment,
  AnalysisResult,
  AudioDevice
} from './types';
import { AzureSpeechService } from '../services/AzureSpeechService';
import { AzureOpenAIService } from '../services/AzureOpenAIService';
import { toast } from 'sonner';

interface AppContextType {
  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;

  // Recording state
  recordingState: RecordingState;
  toggleRecording: () => void;
  audioLevel: number;

  // Audio devices
  audioDevices: AudioDevice[];
  refreshAudioDevices: () => Promise<void>;

  // Transcript data
  transcript: TranscriptSegment[];
  addTranscriptSegment: (segment: TranscriptSegment) => void;
  clearTranscript: () => void;

  // Summary data
  summaries: SummaryChunk[];
  addSummary: (summary: SummaryChunk) => void;

  // Q&A data
  qaList: QAPair[];
  addQA: (qa: QAPair) => void;
  askQuestion: (question: string) => Promise<void>;

  // Translation data
  translations: TranslationSegment[];
  addTranslation: (translation: TranslationSegment) => void;

  // Analysis data
  analyses: AnalysisResult[];
  addAnalysis: (analysis: AnalysisResult) => void;

  // Service connection status
  sttStatus: ConnectionStatus;
  openaiStatus: ConnectionStatus;
  updateSTTStatus: (status: ConnectionStatus) => void;
  updateOpenAIStatus: (status: ConnectionStatus) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Persist settings with useKV
  const [rawSettings, setRawSettings] = useKV<AppSettings>('ai-assistant-settings', defaultSettings);

  // Migrate settings to ensure all properties exist
  const settings = useMemo(() => {
    const migratedSettings = { ...defaultSettings, ...rawSettings };

    // Ensure translation settings exist
    if (!migratedSettings.translation) {
      migratedSettings.translation = defaultSettings.translation;
    }

    // Ensure audio settings are properly migrated
    if (!migratedSettings.audio.selectedDeviceId) {
      migratedSettings.audio.selectedDeviceId = undefined;
    }

    return migratedSettings;
  }, [rawSettings]);

  const setSettings = (value: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setRawSettings(value);
  };

  // In-memory state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    startTime: null,
    duration: 0
  });

  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [summaries, setSummaries] = useKV<SummaryChunk[]>('ai-assistant-summaries', []);
  const [qaList, setQAList] = useKV<QAPair[]>('ai-assistant-qa', []);
  const [translations, setTranslations] = useKV<TranslationSegment[]>('ai-assistant-translations', []);
  const [analyses, setAnalyses] = useKV<AnalysisResult[]>('ai-assistant-analyses', []);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);

  // Service connection statuses - persist in localStorage
  const [sttStatus, setSTTStatus] = useKV<ConnectionStatus>('ai-assistant-stt-status', 'disconnected');
  const [openaiStatus, setOpenAIStatus] = useKV<ConnectionStatus>('ai-assistant-openai-status', 'disconnected');

  // Service refs
  const speechServiceRef = useRef<AzureSpeechService | null>(null);
  const openaiServiceRef = useRef<AzureOpenAIService | null>(null);

  // Last summary time
  const lastSummaryTimeRef = useRef<number | null>(null);

  // Chunk timer
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add translation
  const addTranslation = (translation: TranslationSegment) => {
    setTranslations((prev) => [...prev, translation]);
  };

  // Add analysis
  const addAnalysis = (analysis: AnalysisResult) => {
    setAnalyses((prev) => [...prev, analysis]);
  };

  // Refresh audio devices
  const refreshAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          kind: device.kind as MediaDeviceKind
        }));
      setAudioDevices(audioInputs);
    } catch (error) {
      console.error('Error enumerating audio devices:', error);
      toast.error('Failed to get audio devices');
    }
  };

  // Initialize audio devices on mount
  useEffect(() => {
    refreshAudioDevices();
  }, []);

  // Update settings
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...newSettings }));
  };

  // Initialize services when settings and connection status change
  useEffect(() => {
    // Initialize or update Speech service
    if (sttStatus === 'connected') {
      if (!speechServiceRef.current) {
        // Create new instance
        speechServiceRef.current = new AzureSpeechService(
          settings.stt,
          handleTranscriptSegment,
          (level) => setAudioLevel(level)
        );
      } else {
        // Update existing instance
        speechServiceRef.current.updateConfig(settings.stt);
      }
    }

    // Initialize or update OpenAI service
    if (openaiStatus === 'connected') {
      if (!openaiServiceRef.current) {
        // Create new instance
        openaiServiceRef.current = new AzureOpenAIService(settings.openai);
      } else {
        // Update existing instance
        openaiServiceRef.current.updateConfig(settings.openai);
      }
    }
  }, [sttStatus, openaiStatus, settings.stt, settings.openai, settings.stt.enableLanguageDetection, settings.stt.candidateLanguages]);

  // Handle transcript segment
  const handleTranscriptSegment = async (segment: TranscriptSegment) => {
    console.log('Received transcript segment:', segment);

    // Add segment to transcript
    addTranscriptSegment(segment);

    // Check if it's time to create a summary
    const now = Date.now();
    const chunkIntervalMs = settings.audio.chunkIntervalMinutes * 60 * 1000;

    if (
      lastSummaryTimeRef.current === null ||
      (now - lastSummaryTimeRef.current >= chunkIntervalMs)
    ) {
      createSummary();
      lastSummaryTimeRef.current = now;
    }

    // Check if it's a question and handle it
    if (segment.isQuestion && openaiServiceRef.current) {
      handleQuestion(segment.text);
    }
  };

  // Create summary from current transcript
  const createSummary = async () => {
    if (!openaiServiceRef.current || transcript.length === 0) return;

    try {
      const summary = await openaiServiceRef.current.generateSummary(transcript);

      const summaryChunk: SummaryChunk = {
        id: Date.now().toString(),
        startTime: transcript[0].timestamp,
        endTime: transcript[transcript.length - 1].timestamp,
        summary,
        relatedTranscriptIds: transcript.map(seg => seg.id)
      };

      addSummary(summaryChunk);

      // Show toast
      toast.success('Created a new summary');

    } catch (error) {
      console.error('Error creating summary:', error);
      toast.error('Failed to create summary');
    }
  };

  // Toggle recording
  const toggleRecording = async () => {
    if (recordingState.isRecording) {
      // Stop recording
      setRecordingState({
        isRecording: false,
        startTime: null,
        duration: recordingState.startTime ? Date.now() - recordingState.startTime : 0
      });

      // Reset audio level
      setAudioLevel(0);

      // Stop speech recognition
      if (speechServiceRef.current) {
        try {
          await speechServiceRef.current.stopRecognition();

          // Create final summary
          if (transcript.length > 0) {
            createSummary();
          }

          // Clear chunk timer
          if (chunkTimerRef.current) {
            clearInterval(chunkTimerRef.current);
            chunkTimerRef.current = null;
          }

          toast.success('Recording stopped');

        } catch (error) {
          console.error('Error stopping recording:', error);
          toast.error('Error stopping recording');
        }
      }
    } else {
      // Start recording
      setRecordingState({
        isRecording: true,
        startTime: Date.now(),
        duration: 0
      });

      // Reset transcript for new session
      setTranscript([]);

      // Reset last summary time
      lastSummaryTimeRef.current = Date.now();

      // Start speech recognition
      if (speechServiceRef.current) {
        try {
          // Map audio source to speech service format
          const audioSource = settings.audio.source === 'default' ? 'microphone' : 'microphone';
          await speechServiceRef.current.startRecognition(
            audioSource as 'microphone' | 'system',
            settings.audio.selectedDeviceId
          );

          // Set up chunk timer
          const chunkIntervalMs = settings.audio.chunkIntervalMinutes * 60 * 1000;
          chunkTimerRef.current = setInterval(() => {
            if (transcript.length > 0) {
              createSummary();
            }
          }, chunkIntervalMs);

          toast.success('Recording started');

        } catch (error) {
          console.error('Error starting recording:', error);
          toast.error('Error starting recording');

          // Reset recording state
          setRecordingState({
            isRecording: false,
            startTime: null,
            duration: 0
          });
        }
      } else {
        toast.error('Speech service not initialized');

        // Reset recording state
        setRecordingState({
          isRecording: false,
          startTime: null,
          duration: 0
        });
      }
    }
  };

  // Add transcript segment
  const addTranscriptSegment = (segment: TranscriptSegment) => {
    console.log('Adding transcript segment to state:', segment);
    setTranscript((prev) => {
      const newTranscript = [...prev, segment];
      console.log('New transcript state:', newTranscript);
      return newTranscript;
    });
  };

  // Clear transcript
  const clearTranscript = () => {
    setTranscript([]);
  };

  // Add summary
  const addSummary = (summary: SummaryChunk) => {
    setSummaries((prev) => [...prev, summary]);
  };

  // Add Q&A pair
  const addQA = (qa: QAPair) => {
    setQAList((prev) => [...prev, qa]);
  };

  // Handle question detection
  const handleQuestion = async (question: string) => {
    if (!openaiServiceRef.current) return;

    try {
      const answer = await openaiServiceRef.current.answerQuestion(question, transcript);

      const qa: QAPair = {
        id: Date.now().toString(),
        question,
        answer,
        timestamp: Date.now(),
        isManual: false
      };

      addQA(qa);

      // Show toast
      toast.info('New question detected and answered');

    } catch (error) {
      console.error('Error handling question:', error);

      // Add a fallback answer
      const qa: QAPair = {
        id: Date.now().toString(),
        question,
        answer: "I'm sorry, I couldn't process that question. Please try again.",
        timestamp: Date.now(),
        isManual: false
      };

      addQA(qa);
    }
  };

  // Ask question manually
  const askQuestion = async (question: string) => {
    if (!openaiServiceRef.current) {
      toast.error('OpenAI service not connected');
      return;
    }

    try {
      const answer = await openaiServiceRef.current.answerQuestion(question, transcript);

      const qa: QAPair = {
        id: Date.now().toString(),
        question,
        answer,
        timestamp: Date.now(),
        isManual: true
      };

      addQA(qa);

    } catch (error) {
      console.error('Error answering question:', error);
      toast.error('Failed to answer question');

      // Add a fallback answer
      const qa: QAPair = {
        id: Date.now().toString(),
        question,
        answer: "I'm sorry, I couldn't process that question. Please try again.",
        timestamp: Date.now(),
        isManual: true
      };

      addQA(qa);
    }
  };

  // Update connection statuses
  const updateSTTStatus = (status: ConnectionStatus) => {
    setSTTStatus(status);
  };

  const updateOpenAIStatus = (status: ConnectionStatus) => {
    setOpenAIStatus(status);
  };

  // Check initial connection status on first load if settings are configured
  useEffect(() => {
    const checkInitialConnections = async () => {
      // Only check if settings are configured but status is disconnected
      if (settings.stt.endpoint && settings.stt.subscriptionKey && settings.stt.region && sttStatus === 'disconnected') {
        setSTTStatus('connecting');
        try {
          const tempService = new AzureSpeechService(settings.stt, () => {}, () => {});
          const isConnected = await tempService.checkConnection();
          setSTTStatus(isConnected ? 'connected' : 'error');
        } catch (error) {
          setSTTStatus('error');
        }
      }

      if (settings.openai.endpoint && settings.openai.subscriptionKey && openaiStatus === 'disconnected') {
        setOpenAIStatus('connecting');
        try {
          const tempService = new AzureOpenAIService(settings.openai);
          const isConnected = await tempService.checkConnection();
          setOpenAIStatus(isConnected ? 'connected' : 'error');
        } catch (error) {
          setOpenAIStatus('error');
        }
      }
    };

    // Check once on mount and whenever settings change but status is disconnected
    checkInitialConnections();
  }, [settings.stt.endpoint, settings.stt.subscriptionKey, settings.stt.region, settings.openai.endpoint, settings.openai.subscriptionKey]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop recording if active
      if (recordingState.isRecording && speechServiceRef.current) {
        speechServiceRef.current.stopRecognition().catch(console.error);
      }

      // Clear any timers
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
      }
    };
  }, [recordingState.isRecording]);

  // Return context provider
  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        recordingState,
        toggleRecording,
        audioLevel,
        audioDevices,
        refreshAudioDevices,
        transcript,
        addTranscriptSegment,
        clearTranscript,
        summaries,
        addSummary,
        qaList,
        addQA,
        askQuestion,
        translations,
        addTranslation,
        analyses,
        addAnalysis,
        sttStatus,
        openaiStatus,
        updateSTTStatus,
        updateOpenAIStatus
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the app context
export function useApp() {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
}
