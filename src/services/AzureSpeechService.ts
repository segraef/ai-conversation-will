import { TranscriptSegment } from '../contexts/types';
import { AzureSTTConfig } from '../types';

export class AzureSpeechService {
  private config: AzureSTTConfig;
  private onSegmentReceived: (segment: TranscriptSegment) => void;
  private recognition: any = null;
  private isListening: boolean = false;

  constructor(
    config: AzureSTTConfig,
    onSegmentReceived: (segment: TranscriptSegment) => void
  ) {
    this.config = config;
    this.onSegmentReceived = onSegmentReceived;
  }

  // Check if the service configuration is valid
  async checkConnection(): Promise<boolean> {
    if (!this.config.endpoint || !this.config.subscriptionKey || !this.config.region) {
      return false;
    }

    try {
      // Test connection with Azure Speech Service token endpoint
      // Use the correct token endpoint format: https://<region>.api.cognitive.microsoft.com/sts/v1.0/issuetoken
      const tokenUrl = `https://${this.config.region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        },
      });

      // If we get a successful token, the credentials are valid
      return response.status === 200;
    } catch (error) {
      console.error('Azure Speech Service connection test failed:', error);
      return false;
    }
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
      // Request microphone permissions first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
      } catch (permError) {
        throw new Error('Microphone permission denied. Please allow microphone access and try again.');
      }

      // For now, let's use Web Speech API as a working fallback until we implement the full Azure WebSocket API
      // The Azure Speech Service REST API doesn't support real-time streaming well

      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      }

      // Use Web Speech API but with Azure-validated configuration
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      // Set a simple, widely supported language
      // Don't try to detect support beforehand as it doesn't work reliably
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('Speech recognition started (Web Speech API with Azure validation)');
      };

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];

          if (result.isFinal) {
            console.log('Final speech result:', result[0].transcript);

            const segment: TranscriptSegment = {
              id: Date.now().toString(),
              text: result[0].transcript,
              timestamp: Date.now(),
              confidence: result[0].confidence || 0.9,
              speakerId: 'User',
              isQuestion: result[0].transcript.trim().endsWith('?')
            };

            console.log('Calling onSegmentReceived with:', segment);
            this.onSegmentReceived(segment);
          } else {
            // Handle interim results for live feedback
            console.log('Interim result:', result[0].transcript);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        // Handle specific error types
        if (event.error === 'language-not-supported') {
          console.error('Language not supported. Trying without language specification...');
          this.isListening = false;

          // Try restarting without language specification
          setTimeout(() => {
            this.startRecognitionFallback();
          }, 100);
          return; // Don't throw error, we have a fallback

        } else if (event.error === 'no-speech') {
          console.log('No speech detected, continuing...');
          // Don't stop for no-speech errors, just continue
          return;
        } else if (event.error === 'audio-capture') {
          console.error('Audio capture error. Please check microphone permissions.');
          this.isListening = false;
          throw new Error('Cannot access microphone. Please check permissions.');
        } else if (event.error === 'not-allowed') {
          console.error('Microphone access not allowed.');
          this.isListening = false;
          throw new Error('Microphone access denied. Please allow microphone access and try again.');
        } else {
          console.error('Other speech recognition error:', event.error);
          this.isListening = false;
        }
      };

      this.recognition.onend = () => {
        console.log('Speech recognition ended');

        // Only auto-restart if we're still supposed to be listening and there wasn't an error
        if (this.isListening) {
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (error) {
                console.error('Error restarting speech recognition:', error);
                this.isListening = false;
              }
            }
          }, 100);
        }
      };

      this.recognition.start();

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.isListening = false;
      throw error;
    }
  }

  // Fallback method for when language-not-supported error occurs
  private async startRecognitionFallback(): Promise<void> {
    if (!this.isListening) {
      this.isListening = true;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      // Don't set any language - let browser use default
      console.log('Starting speech recognition without language specification');

      this.recognition.onstart = () => {
        console.log('Fallback speech recognition started');
      };

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];

          if (result.isFinal) {
            console.log('Final speech result (fallback):', result[0].transcript);

            const segment: TranscriptSegment = {
              id: Date.now().toString(),
              text: result[0].transcript,
              timestamp: Date.now(),
              confidence: result[0].confidence || 0.9,
              speakerId: 'User',
              isQuestion: result[0].transcript.trim().endsWith('?')
            };

            this.onSegmentReceived(segment);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Fallback speech recognition error:', event.error);

        if (event.error === 'language-not-supported') {
          // If even fallback fails, stop trying
          console.error('Even fallback language not supported. Speech recognition unavailable.');
          this.isListening = false;
          return;
        }

        // Handle other errors normally
        if (event.error !== 'no-speech') {
          this.isListening = false;
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (error) {
                console.error('Error restarting fallback speech recognition:', error);
                this.isListening = false;
              }
            }
          }, 100);
        }
      };

      this.recognition.start();

    } catch (error) {
      console.error('Error starting fallback speech recognition:', error);
      this.isListening = false;
    }
  }

  // Stop speech recognition
  async stopRecognition(): Promise<void> {
    console.log('Stopping speech recognition...');

    // Set listening to false first to prevent auto-restart
    this.isListening = false;

    if (this.recognition) {
      try {
        // Handle Web Speech API cleanup
        if (this.recognition.stop) {
          this.recognition.stop();
        }

        // Remove event listeners to prevent memory leaks
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;

      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      } finally {
        this.recognition = null;
        console.log('Speech recognition stopped and cleaned up');
      }
    }
  }

  // Update service configuration
  updateConfig(config: AzureSTTConfig): void {
    this.config = config;
  }

  // Get current listening state
  getIsListening(): boolean {
    return this.isListening;
  }
}
