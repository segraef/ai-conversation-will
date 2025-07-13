import { TranscriptSegment, InterimTranscriptSegment } from '../contexts/types';
import { AzureSTTConfig } from '../types';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export class AzureSpeechService {
  private config: AzureSTTConfig;
  private onSegmentReceived: (segment: TranscriptSegment) => void;
  private onInterimTextReceived?: (interimSegment: InterimTranscriptSegment) => void;
  private onAudioLevel?: (level: number) => void;
  private recognizer: speechsdk.SpeechRecognizer | null = null;
  private conversationTranscriber: speechsdk.ConversationTranscriber | null = null;
  private isListening: boolean = false;
  private authToken: string | null = null;
  private tokenExpiry: number | null = null;
  private useSpeakerDiarization: boolean = true;
  private simulateSpeakers: boolean = true;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private microphoneStream: MediaStream | null = null;

  // Enhanced speaker detection
  private lastSpeakerId: string = 'Speaker 1';
  private speechHistory: Array<{text: string, timestamp: number, speakerId: string, audioLevel: number}> = [];
  private audioLevelHistory: number[] = [];
  private voicePatterns: Map<string, {avgPitch: number, avgEnergy: number, speechRate: number, avgLength: number}> = new Map();
  private speakerConsistencyCounter: number = 0; // Track how many consecutive utterances from same speaker
  private lastSpeechTime: number = 0;
  private currentInterimId: string | null = null; // Track current interim segment

  constructor(
    config: AzureSTTConfig,
    onSegmentReceived: (segment: TranscriptSegment) => void,
    onAudioLevel?: (level: number) => void,
    onInterimTextReceived?: (interimSegment: InterimTranscriptSegment) => void
  ) {
    this.config = config;
    this.onSegmentReceived = onSegmentReceived;
    this.onAudioLevel = onAudioLevel;
    this.onInterimTextReceived = onInterimTextReceived;
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

    // Set language or enable language detection
    if (this.config.enableLanguageDetection &&
        this.config.candidateLanguages &&
        this.config.candidateLanguages.length > 1) {
      console.log('Language detection enabled with candidates:', this.config.candidateLanguages);
      speechConfig.setProperty(
        speechsdk.PropertyId.SpeechServiceConnection_LanguageIdMode,
        'Continuous'
      );
    } else {
      const language = this.config.candidateLanguages?.[0] || 'en-US';
      speechConfig.speechRecognitionLanguage = language;
      console.log('Using fixed language:', language);
    }

    return speechConfig;
  }

  // Start speech recognition using Azure Speech Service
  async startRecognition(audioSource: 'microphone' | 'system', deviceId?: string): Promise<void> {
    if (this.isListening) {
      return;
    }

    if (!this.config.endpoint || !this.config.subscriptionKey || !this.config.region) {
      throw new Error('Azure Speech Service not configured. Please set endpoint, subscription key, and region.');
    }

    try {
      const authToken = await this.getAuthToken();
      const speechConfig = this.createSpeechConfig();

      // Set up audio level monitoring
      if (this.onAudioLevel) {
        await this.setupAudioLevelMonitoring(deviceId);
      }

      // Create audio config
      let audioConfig;
      if (this.microphoneStream) {
        audioConfig = speechsdk.AudioConfig.fromStreamInput(this.microphoneStream);
      } else {
        audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
      }

      // Create recognizer with language detection if enabled
      if (this.config.enableLanguageDetection &&
          this.config.candidateLanguages &&
          this.config.candidateLanguages.length > 1) {

        console.log('Creating recognizer with language detection for languages:', this.config.candidateLanguages);
        const autoDetectSourceLanguageConfig = speechsdk.AutoDetectSourceLanguageConfig.fromLanguages(
          this.config.candidateLanguages
        );
        this.recognizer = speechsdk.SpeechRecognizer.FromConfig(
          speechConfig,
          autoDetectSourceLanguageConfig,
          audioConfig
        );
      } else {
        console.log('Using standard recognition with language:', speechConfig.speechRecognitionLanguage);
        this.recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);
      }

      // Event handlers
      this.recognizer.recognizing = (sender, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizingSpeech && e.result.text.trim()) {
          console.log('Interim result:', e.result.text);
          
          // Send interim text for real-time display
          if (this.onInterimTextReceived) {
            // Create or update current interim segment
            if (!this.currentInterimId) {
              this.currentInterimId = 'interim-' + Date.now().toString() + Math.random().toString(36).substr(2, 9);
            }
            
            const interimSegment: InterimTranscriptSegment = {
              id: this.currentInterimId,
              text: e.result.text,
              speakerId: this.lastSpeakerId, // Use current speaker for interim
              timestamp: Date.now(),
              isPartial: true
            };
            
            this.onInterimTextReceived(interimSegment);
          }
        }
      };

      this.recognizer.recognized = (sender, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech && e.result.text.trim()) {
          // Clear current interim ID since we now have final text
          this.currentInterimId = null;
          
          // Use enhanced voice analysis for speaker detection
          const speakerId = this.determineSpeakerFromContext(e.result.text, e.result.offset);

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
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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
    
    // Clear current interim segment
    this.currentInterimId = null;

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

      // Store audio level for speaker detection
      this.audioLevelHistory.push(level);
      if (this.audioLevelHistory.length > 20) {
        this.audioLevelHistory.shift();
      }

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

  // Method to determine speaker based on context and timing
  private determineSpeakerFromContext(text: string, offset: number): string {
    const currentTime = Date.now();
    const timeSinceLastSpeech = currentTime - this.lastSpeechTime;

    // Get current audio level
    const currentAudioLevel = this.audioLevelHistory.length > 0
      ? this.audioLevelHistory[this.audioLevelHistory.length - 1]
      : 0;

    // Analyze text characteristics
    const textLength = text.length;
    const wordCount = text.split(' ').length;
    const isQuestion = this.isQuestion(text);
    const speechRate = wordCount / (textLength / 100); // Rough speech rate estimate

    // Add current speech to history with audio level
    this.speechHistory.push({
      text,
      timestamp: currentTime,
      speakerId: this.lastSpeakerId,
      audioLevel: currentAudioLevel
    });

    // Keep only recent history (last 15 utterances)
    if (this.speechHistory.length > 15) {
      this.speechHistory.shift();
    }

    // Decision factors for speaker switching
    let shouldSwitchSpeaker = false;
    let switchReasons: string[] = [];

    // Factor 1: Significant pause (more than 2.5 seconds suggests speaker change)
    if (timeSinceLastSpeech > 2500) {
      shouldSwitchSpeaker = true;
      switchReasons.push(`long_pause_${Math.round(timeSinceLastSpeech/1000)}s`);
    }

    // Factor 2: Audio level change (significant change might indicate different speaker)
    if (this.speechHistory.length >= 3) {
      const recentAudioLevels = this.speechHistory.slice(-3).map(h => h.audioLevel);
      const avgRecentLevel = recentAudioLevels.reduce((a, b) => a + b, 0) / recentAudioLevels.length;
      const levelChange = Math.abs(currentAudioLevel - avgRecentLevel);

      if (levelChange > 15 && timeSinceLastSpeech > 1500) {
        shouldSwitchSpeaker = true;
        switchReasons.push(`audio_level_change_${Math.round(levelChange)}`);
      }
    }

    // Factor 3: Conversation turn patterns
    if (this.speechHistory.length >= 2) {
      const lastUtterance = this.speechHistory[this.speechHistory.length - 2];
      const lastWasQuestion = this.isQuestion(lastUtterance.text);

      // Question-answer pattern suggests speaker change
      if (lastWasQuestion && !isQuestion && timeSinceLastSpeech > 800) {
        shouldSwitchSpeaker = true;
        switchReasons.push('question_answer_pattern');
      }

      // New question after statement might be different speaker
      if (!lastWasQuestion && isQuestion && timeSinceLastSpeech > 1200) {
        shouldSwitchSpeaker = true;
        switchReasons.push('new_question_pattern');
      }
    }

    // Factor 4: Speech pattern changes
    if (this.speechHistory.length >= 4) {
      const recentSpeechRates = this.speechHistory.slice(-4).map(h => {
        const words = h.text.split(' ').length;
        return words / (h.text.length / 100);
      });
      const avgRecentRate = recentSpeechRates.reduce((a, b) => a + b, 0) / recentSpeechRates.length;
      const rateChange = Math.abs(speechRate - avgRecentRate);

      if (rateChange > 1.5 && timeSinceLastSpeech > 1800) {
        shouldSwitchSpeaker = true;
        switchReasons.push(`speech_rate_change_${Math.round(rateChange * 10)/10}`);
      }
    }

    // Factor 5: Prevent too frequent switching (minimum consistency)
    if (shouldSwitchSpeaker && this.speakerConsistencyCounter < 2 && timeSinceLastSpeech < 3000) {
      shouldSwitchSpeaker = false;
      switchReasons = ['prevented_rapid_switch'];
    }

    // Apply speaker switch decision
    if (shouldSwitchSpeaker) {
      this.lastSpeakerId = this.lastSpeakerId === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
      this.speakerConsistencyCounter = 0;

      console.log(`🎤 Speaker switched to ${this.lastSpeakerId}`, {
        reasons: switchReasons,
        pause: `${Math.round(timeSinceLastSpeech/1000)}s`,
        audioLevel: Math.round(currentAudioLevel),
        isQuestion
      });
    } else {
      this.speakerConsistencyCounter++;
    }

    // Update voice pattern for current speaker
    this.updateVoicePattern(this.lastSpeakerId, {
      textLength,
      speechRate,
      audioLevel: currentAudioLevel,
      isQuestion
    });

    this.lastSpeechTime = currentTime;
    return this.lastSpeakerId;
  }

  // Update voice pattern profile for speaker
  private updateVoicePattern(speakerId: string, characteristics: {
    textLength: number;
    speechRate: number;
    audioLevel: number;
    isQuestion: boolean;
  }): void {
    if (!this.voicePatterns.has(speakerId)) {
      this.voicePatterns.set(speakerId, {
        avgPitch: 0,
        avgEnergy: characteristics.audioLevel,
        speechRate: characteristics.speechRate,
        avgLength: characteristics.textLength
      });
    } else {
      const pattern = this.voicePatterns.get(speakerId)!;
      // Exponential moving average for pattern learning
      pattern.avgEnergy = pattern.avgEnergy * 0.7 + characteristics.audioLevel * 0.3;
      pattern.speechRate = pattern.speechRate * 0.7 + characteristics.speechRate * 0.3;
      pattern.avgLength = pattern.avgLength * 0.7 + characteristics.textLength * 0.3;
    }
  }
}
