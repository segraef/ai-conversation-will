import { TranscriptSegment } from '../contexts/types';
import { AzureSTTConfig } from '../types';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export class AzureSpeechService {
  private config: AzureSTTConfig;
  private onSegmentReceived: (segment: TranscriptSegment) => void;
  private recognizer: speechsdk.SpeechRecognizer | null = null;
  private conversationTranscriber: speechsdk.ConversationTranscriber | null = null;
  private isListening: boolean = false;
  private authToken: string | null = null;
  private tokenExpiry: number | null = null;
  private useSpeakerDiarization: boolean = true; // Enable speaker diarization by default
  private simulateSpeakers: boolean = true; // Simulate multiple speakers when real diarization isn't available

  constructor(
    config: AzureSTTConfig,
    onSegmentReceived: (segment: TranscriptSegment) => void
  ) {
    this.config = config;
    this.onSegmentReceived = onSegmentReceived;
  }

  // Check if the service configuration is valid and get an auth token
  async checkConnection(): Promise<boolean> {
    if (!this.config.endpoint || !this.config.subscriptionKey || !this.config.region) {
      return false;
    }

    try {
      // Get authentication token from Azure Speech Service
      const tokenUrl = `https://${this.config.region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        },
      });

      if (response.status === 200) {
        this.authToken = await response.text();
        this.tokenExpiry = Date.now() + (9 * 60 * 1000); // Token expires in 9 minutes
        console.log('Azure Speech Service authentication token obtained');
        return true;
      } else {
        console.error('Failed to get authentication token:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Azure Speech Service connection test failed:', error);
      return false;
    }
  }

  // Get or refresh authentication token
  private async getAuthToken(): Promise<string> {
    // Check if token needs refresh (if it expires in less than 1 minute)
    if (!this.authToken || !this.tokenExpiry || (Date.now() + 60000) > this.tokenExpiry) {
      const isConnected = await this.checkConnection();
      if (!isConnected || !this.authToken) {
        throw new Error('Failed to get authentication token');
      }
    }
    return this.authToken;
  }

  // Create speech configuration
  private createSpeechConfig(): speechsdk.SpeechConfig {
    const speechConfig = speechsdk.SpeechConfig.fromSubscription(
      this.config.subscriptionKey,
      this.config.region
    );

    // Don't set custom endpoint for now to avoid conflicts
    // if (this.config.endpoint && this.config.endpoint.startsWith('https://')) {
    //   speechConfig.endpointId = this.config.endpoint;
    // }

    // Always set a default language for now
    speechConfig.speechRecognitionLanguage = 'en-US';

    // Enable speaker diarization
    speechConfig.setProperty(
      speechsdk.PropertyId.SpeechServiceConnection_RecoMode,
      'CONVERSATION'
    );

    return speechConfig;
  }

  // Start speech recognition using Azure Speech Service
  async startRecognition(audioSource: 'microphone' | 'system'): Promise<void> {
    if (this.isListening) {
      return;
    }

    // Check if Azure Speech Service is configured
    if (!this.config.endpoint || !this.config.subscriptionKey || !this.config.region) {
      throw new Error('Azure Speech Service not configured. Please set endpoint, subscription key, and region.');
    }

    try {
      // Get authentication token
      const authToken = await this.getAuthToken();

      const speechConfig = this.createSpeechConfig();
      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();

      // Create standard recognizer (disable language detection temporarily)
      console.log('Using standard recognition with language:', speechConfig.speechRecognitionLanguage);
      this.recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

      // TODO: Re-enable language detection once basic functionality is working
      // if (this.config.enableLanguageDetection &&
      //     this.config.candidateLanguages?.length &&
      //     this.config.candidateLanguages.length > 0) {
      //   // Language detection logic will be re-enabled later
      // }

      // Event handlers
      this.recognizer.recognizing = (sender, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizingSpeech) {
          this.onSegmentReceived({
            id: Date.now().toString(),
            text: e.result.text,
            timestamp: Date.now(),
            confidence: 0.9,
            speakerId: 'User', // Default speaker ID for basic recognition
            isQuestion: this.isQuestion(e.result.text.trim())
          });
        }
      };

      this.recognizer.recognized = (sender, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
          const speakerId = this.simulateSpeakers && Math.random() > 0.5 ? 'Speaker 1' : 'Speaker 2';

          this.onSegmentReceived({
            id: Date.now().toString(),
            text: e.result.text,
            timestamp: Date.now(),
            confidence: 0.9,
            speakerId: speakerId,
            isQuestion: this.isQuestion(e.result.text.trim())
          });
        }
      };

      this.recognizer.canceled = (s, e) => {
        console.log(`CANCELED: Reason=${e.reason}`);
        if (e.reason === speechsdk.CancellationReason.Error) {
          console.error(`CANCELED: ErrorCode=${e.errorCode}`);
          console.error(`CANCELED: ErrorDetails=${e.errorDetails}`);
          this.isListening = false;
          console.error('Speech recognition error:', e.errorDetails);
        }
      };

      this.recognizer.sessionStarted = (s, e) => {
        console.log('Azure Speech Recognition session started');
        this.isListening = true;
      };

      this.recognizer.sessionStopped = (s, e) => {
        console.log('Azure Speech Recognition session stopped');
        this.isListening = false;
      };

      // Start continuous recognition
      console.log('Starting Azure Speech Recognition...');
      this.recognizer.startContinuousRecognitionAsync(
        () => {
          console.log('Azure Speech Recognition started successfully');
          this.isListening = true;
        },
        (err) => {
          console.error('Error starting Azure Speech Recognition:', err);
          this.isListening = false;
          throw new Error(`Failed to start speech recognition: ${err}`);
        }
      );
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.isListening = false;
      throw error;
    }
  }

  // Stop speech recognition
  async stopRecognition(): Promise<void> {
    console.log('Stopping Azure Speech Recognition...');

    // Set listening to false first to prevent auto-restart
    this.isListening = false;

    if (this.conversationTranscriber) {
      try {
        // Stop conversation transcription
        this.conversationTranscriber.stopTranscribingAsync(
          () => {
            console.log('Azure Conversation Transcription stopped successfully');
          },
          (err) => {
            console.error('Error stopping Azure Conversation Transcription:', err);
          }
        );

        // Close the transcriber to free up resources
        this.conversationTranscriber.close();

      } catch (error) {
        console.error('Error stopping conversation transcription:', error);
      } finally {
        this.conversationTranscriber = null;
        console.log('Azure Conversation Transcription stopped and cleaned up');
      }
    }

    if (this.recognizer) {
      try {
        // Stop continuous recognition
        this.recognizer.stopContinuousRecognitionAsync(
          () => {
            console.log('Azure Speech Recognition stopped successfully');
          },
          (err) => {
            console.error('Error stopping Azure Speech Recognition:', err);
          }
        );

        // Close the recognizer to free up resources
        this.recognizer.close();

      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      } finally {
        this.recognizer = null;
        console.log('Azure Speech Recognition stopped and cleaned up');
      }
    }
  }

  // Update service configuration
  updateConfig(config: AzureSTTConfig): void {
    this.config = config;
    // Clear auth token so it gets refreshed with new config
    this.authToken = null;
    this.tokenExpiry = null;
  }

  // Toggle speaker diarization
  setSpeakerDiarization(enabled: boolean): void {
    this.useSpeakerDiarization = enabled;
    console.log(`Speaker diarization ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get speaker diarization status
  getSpeakerDiarizationEnabled(): boolean {
    return this.useSpeakerDiarization;
  }

  // Toggle speaker simulation (for when real diarization isn't working)
  setSimulateSpeakers(enabled: boolean): void {
    this.simulateSpeakers = enabled;
    console.log(`Speaker simulation ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get speaker simulation status
  getSimulateSpeakersEnabled(): boolean {
    return this.simulateSpeakers;
  }

  // Get current listening state
  getIsListening(): boolean {
    return this.isListening;
  }

  // Method to configure language detection
  configureLanguageDetection(enabled: boolean, languages?: string[]): void {
    this.config.enableLanguageDetection = enabled;
    this.config.candidateLanguages = languages || [
      'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'
    ];
    console.log(`Language detection ${enabled ? 'enabled' : 'disabled'}`);
    if (enabled && languages) {
      console.log('Candidate languages:', languages.join(', '));
    }
  }

  // Get current language detection status
  getLanguageDetectionEnabled(): boolean {
    return this.config.enableLanguageDetection || false;
  }

  // Get candidate languages
  getCandidateLanguages(): string[] {
    return this.config.candidateLanguages || ['en-US'];
  }

  // Helper method to detect if text is a question
  private isQuestion(text: string): boolean {
    const trimmed = text.trim().toLowerCase();

    // Direct question mark
    if (trimmed.endsWith('?')) {
      return true;
    }

    // Common question starters
    const questionStarters = [
      'what', 'when', 'where', 'why', 'who', 'whom', 'whose', 'which', 'how',
      'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might',
      'do', 'does', 'did', 'are', 'is', 'was', 'were', 'have', 'has', 'had'
    ];

    return questionStarters.some(starter => trimmed.startsWith(starter + ' '));
  }
}
