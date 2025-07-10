import { TranscriptSegment } from '../contexts/types';
import { AzureSTTConfig } from '../types';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export class AzureSpeechService {
  private config: AzureSTTConfig;
  private onSegmentReceived: (segment: TranscriptSegment) => void;
  private recognizer: speechsdk.SpeechRecognizer | null = null;
  private isListening: boolean = false;
  private authToken: string | null = null;
  private tokenExpiry: number | null = null;

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

      // Create speech configuration using token and region (like the Azure sample)
      const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(authToken, this.config.region);
      speechConfig.speechRecognitionLanguage = 'en-US';

      // Create audio configuration
      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();

      // Create recognizer
      this.recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

      // Set up event handlers
      this.recognizer.recognizing = (s, e) => {
        console.log(`RECOGNIZING: Text=${e.result.text}`);
        // For real-time feedback, you could emit interim results here
      };

      this.recognizer.recognized = (s, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech && e.result.text.trim()) {
          console.log(`RECOGNIZED: Text=${e.result.text}`);

          const segment: TranscriptSegment = {
            id: Date.now().toString(),
            text: e.result.text.trim(),
            timestamp: Date.now(),
            confidence: 0.9, // Azure doesn't provide confidence in continuous mode
            speakerId: 'User',
            isQuestion: this.isQuestion(e.result.text.trim())
          };

          console.log('Calling onSegmentReceived with:', segment);
          this.onSegmentReceived(segment);
        } else if (e.result.reason === speechsdk.ResultReason.NoMatch) {
          console.log('NOMATCH: Speech could not be recognized.');
        }
      };

      this.recognizer.canceled = (s, e) => {
        console.log(`CANCELED: Reason=${e.reason}`);

        if (e.reason === speechsdk.CancellationReason.Error) {
          console.error(`CANCELED: ErrorCode=${e.errorCode}`);
          console.error(`CANCELED: ErrorDetails=${e.errorDetails}`);
          this.isListening = false;

          // Don't throw here in the event handler, just log the error
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

      // Start continuous recognition (like the Azure sample pattern)
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

  // Get current listening state
  getIsListening(): boolean {
    return this.isListening;
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
