import { AzureSTTConfig, TranscriptSegment } from '../types';

// This is a stub implementation of the Azure Speech-to-Text service
// In a real implementation, this would use the Azure SDK
export class AzureSpeechService {
  private config: AzureSTTConfig;
  private onSegmentReceived: (segment: TranscriptSegment) => void;
  private isListening: boolean = false;
  private mockInterval: NodeJS.Timeout | null = null;
  
  constructor(
    config: AzureSTTConfig,
    onSegmentReceived: (segment: TranscriptSegment) => void
  ) {
    this.config = config;
    this.onSegmentReceived = onSegmentReceived;
  }
  
  // Start the speech recognition service
  async startRecognition(audioSource: 'microphone' | 'system'): Promise<void> {
    if (this.isListening) {
      return;
    }
    
    try {
      // In a real implementation, this would initialize the Azure SDK
      // and start listening to the selected audio source
      
      this.isListening = true;
      
      // For demonstration purposes, we'll generate mock transcript segments
      this.mockInterval = setInterval(() => {
        const speakers = ['Speaker 1', 'Speaker 2'];
        const mockTexts = [
          'I think we should focus on improving the user experience.',
          'What specific areas do you think need improvement?',
          'The onboarding flow is confusing for new users.',
          'How would you suggest we simplify it?',
          'We could reduce the number of steps and provide better guidance.',
          'Do you think we should conduct user testing first?'
        ];
        
        const randomIndex = Math.floor(Math.random() * mockTexts.length);
        const randomSpeaker = speakers[randomIndex % 2];
        const isQuestion = mockTexts[randomIndex].trim().endsWith('?');
        
        const segment: TranscriptSegment = {
          id: Date.now().toString(),
          text: mockTexts[randomIndex],
          speakerId: randomSpeaker,
          timestamp: Date.now(),
          isQuestion
        };
        
        this.onSegmentReceived(segment);
      }, 3000); // Generate a new segment every 3 seconds
      
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.isListening = false;
      throw error;
    }
  }
  
  // Stop the speech recognition service
  async stopRecognition(): Promise<void> {
    if (!this.isListening) {
      return;
    }
    
    try {
      // In a real implementation, this would stop the Azure SDK
      
      this.isListening = false;
      
      // Clear the mock interval
      if (this.mockInterval) {
        clearInterval(this.mockInterval);
        this.mockInterval = null;
      }
      
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      throw error;
    }
  }
  
  // Check if the service is configured and ready
  async checkConnection(): Promise<boolean> {
    try {
      // In a real implementation, this would check if the Azure SDK
      // can connect to the service with the provided credentials
      
      // Simulate a network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Error checking speech service connection:', error);
      return false;
    }
  }
  
  // Update the service configuration
  updateConfig(config: AzureSTTConfig): void {
    this.config = config;
  }
}