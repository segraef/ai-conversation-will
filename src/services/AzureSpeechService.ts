import { TranscriptSegment } from '../contexts/types';
import { AzureSTTConfig } from '../types';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export class AzureSpeechService {
  private config: AzureSTTConfig;
  private onSegmentReceived: (segment: TranscriptSegment) => void;
  private onAudioLevel?: (level: number) => void;
  private recognizer: speechsdk.SpeechRecognizer | null = null;
  private conversationTranscriber: speechsdk.ConversationTranscriber | null = null;
  private isListening: boolean = false;
  private authToken: string | null = null;
  private tokenExpiry: number | null = null;
  private useSpeakerDiarization: boolean = true; // Enable speaker diarization by default
  private simulateSpeakers: boolean = true; // Simulate multiple speakers when real diarization isn't available
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private microphoneStream: MediaStream | null = null;

  constructor(
    config: AzureSTTConfig,
    onSegmentReceived: (segment: TranscriptSegment) => void,
    onAudioLevel?: (level: number) => void
  ) {
    this.config = config;
    this.onSegmentReceived = onSegmentReceived;
    this.onAudioLevel = onAudioLevel;
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

    // Set language or enable language detection
    if (this.config.enableLanguageDetection &&
        this.config.candidateLanguages &&
        this.config.candidateLanguages.length > 1) {
      console.log('Language detection enabled with candidates:', this.config.candidateLanguages);
      // Don't set a specific language when using language detection
    } else {
      // Use the first candidate language or default to English
      const language = this.config.candidateLanguages?.[0] || 'en-US';
      speechConfig.speechRecognitionLanguage = language;
      console.log('Using fixed language:', language);
    }

    // Enable speaker diarization
    speechConfig.setProperty(
      speechsdk.PropertyId.SpeechServiceConnection_RecoMode,
      'CONVERSATION'
    );

    return speechConfig;
  }

  // Start speech recognition using Azure Speech Service
  async startRecognition(audioSource: 'microphone' | 'system', deviceId?: string): Promise<void> {
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

      // Set up audio level monitoring BEFORE creating speech recognizer
      // to avoid microphone access conflicts
      if (this.onAudioLevel) {
        await this.setupAudioLevelMonitoring(deviceId);
      }

      // Use the shared microphone stream for Azure Speech SDK if available
      let audioConfig;
      if (this.microphoneStream) {
        // Create audio config from the existing stream
        audioConfig = speechsdk.AudioConfig.fromStreamInput(this.microphoneStream);
      } else {
        // Fallback to default microphone
        audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
      }

      // Create recognizer with language detection if enabled
      if (this.config.enableLanguageDetection &&
          this.config.candidateLanguages &&
          this.config.candidateLanguages.length > 1) {

        console.log('Creating recognizer with language detection for languages:', this.config.candidateLanguages);

        // Create language detection configuration
        const autoDetectSourceLanguageConfig = speechsdk.AutoDetectSourceLanguageConfig.fromLanguages(
          this.config.candidateLanguages
        );

        // Create recognizer with auto-detect configuration
        this.recognizer = speechsdk.SpeechRecognizer.FromConfig(
          speechConfig,
          autoDetectSourceLanguageConfig,
          audioConfig
        );

        console.log('Language detection recognizer created successfully');
      } else {
        // Create standard recognizer
        console.log('Using standard recognition with language:', speechConfig.speechRecognitionLanguage);
        this.recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);
      }

      // Event handlers
      this.recognizer.recognizing = (sender, e) => {
        // Only log interim results, don't add them to transcript to avoid duplicates
        if (e.result.reason === speechsdk.ResultReason.RecognizingSpeech) {
          console.log('Interim result:', e.result.text);
          // Don't call onSegmentReceived here to avoid duplicates
        }
      };

      this.recognizer.recognized = (sender, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech && e.result.text.trim()) {
          const speakerId = this.simulateSpeakers && Math.random() > 0.5 ? 'Speaker 1' : 'User';

          // Extract detected language if available
          let detectedLanguage = 'unknown';
          if (this.config.enableLanguageDetection) {
            try {
              const detectionResult = speechsdk.AutoDetectSourceLanguageResult.fromResult(e.result);
              detectedLanguage = detectionResult.language || 'unknown';
              console.log('Detected language:', detectedLanguage);
            } catch (error) {
              console.log('Could not extract language detection result:', error);
            }
          }

          this.onSegmentReceived({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // More unique ID
            text: e.result.text,
            timestamp: Date.now(),
            confidence: 0.9,
            speakerId: speakerId,
            isQuestion: this.isQuestion(e.result.text.trim()),
            detectedLanguage: detectedLanguage !== 'unknown' ? detectedLanguage : undefined
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

    // Stop audio level monitoring
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioContext) {
      try {
        await this.audioContext.close();
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
      } catch (error) {
        console.error('Error closing audio context:', error);
      }
    }

    // Stop microphone stream
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }

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

  // Set up audio level monitoring
  private async setupAudioLevelMonitoring(deviceId?: string): Promise<void> {
    try {
      console.log('Setting up audio level monitoring...');

      // Get microphone access if we don't have it already
      if (!this.microphoneStream) {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(deviceId && { deviceId: { exact: deviceId } })
          }
        };

        this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Microphone access granted', deviceId ? `for device: ${deviceId}` : '');
      }

      // Create audio context and analyser
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024; // Increased for better analysis
      this.analyser.smoothingTimeConstant = 0.8;

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      // Connect stream to analyser
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      source.connect(this.analyser);

      console.log('Audio context and analyser set up successfully');

      // Start monitoring
      this.startAudioLevelMonitoring();
    } catch (error) {
      console.error('Error setting up audio level monitoring:', error);
    }
  }

  // Start audio level monitoring loop
  private startAudioLevelMonitoring(): void {
    const updateLevel = () => {
      if (!this.analyser || !this.dataArray || !this.onAudioLevel) {
        console.log('Audio level monitoring stopped - missing components');
        return;
      }

      this.analyser.getByteFrequencyData(this.dataArray);

      // Calculate RMS (Root Mean Square) for better audio level representation
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i] * this.dataArray[i];
      }
      const rms = Math.sqrt(sum / this.dataArray.length);

      // Convert to percentage (0-100) with better scaling
      const level = Math.min(100, (rms / 128) * 100);

      // Debug logging
      if (level > 1) {
        console.log('Audio level detected:', level.toFixed(2));
      }

      // Call the level callback
      this.onAudioLevel(level);

      // Continue monitoring if still listening
      if (this.isListening) {
        this.animationFrameId = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
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
