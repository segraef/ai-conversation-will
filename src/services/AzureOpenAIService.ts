import { TranscriptSegment } from '../contexts/types';
import { AzureOpenAIConfig } from '../types';

export class AzureOpenAIService {
  private config: AzureOpenAIConfig;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
  }

  // Check if the service configuration is valid
  async checkConnection(): Promise<boolean> {
    if (!this.config.endpoint || !this.config.subscriptionKey || !this.config.deploymentName) {
      return false;
    }

    try {
      // Test connection with a simple API call
      const response = await fetch(`${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=2024-02-15-preview`, {
        method: 'POST',
        headers: {
          'api-key': this.config.subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Azure OpenAI Service connection test failed:', error);
      return false;
    }
  }

  // Generate a summary from transcript segments
  async generateSummary(segments: TranscriptSegment[]): Promise<string> {
    if (!this.config.endpoint || !this.config.subscriptionKey || !this.config.deploymentName) {
      throw new Error('Azure OpenAI service not properly configured');
    }

    try {
      const transcriptText = segments.map(segment =>
        `[${new Date(segment.timestamp).toLocaleTimeString()}] ${segment.speakerId}: ${segment.text}`
      ).join('\n');

      const response = await fetch(`${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=2024-02-15-preview`, {
        method: 'POST',
        headers: {
          'api-key': this.config.subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that creates concise summaries of conversations. Focus on key points, decisions made, and action items.'
            },
            {
              role: 'user',
              content: `Please create a summary of the following conversation transcript:\n\n${transcriptText}`
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Unable to generate summary';

    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  // Answer a question based on the transcript context
  async answerQuestion(question: string, context: TranscriptSegment[] = []): Promise<string> {
    if (!this.config.endpoint || !this.config.subscriptionKey || !this.config.deploymentName) {
      throw new Error('Azure OpenAI service not properly configured');
    }

    try {
      const contextText = context.length > 0
        ? context.map(segment =>
            `[${new Date(segment.timestamp).toLocaleTimeString()}] ${segment.speakerId}: ${segment.text}`
          ).join('\n')
        : '';

      const response = await fetch(`${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=2024-02-15-preview`, {
        method: 'POST',
        headers: {
          'api-key': this.config.subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that answers questions based on conversation context. If you don\'t have enough information from the context, say so politely.'
            },
            {
              role: 'user',
              content: contextText
                ? `Based on this conversation context:\n\n${contextText}\n\nQuestion: ${question}`
                : `Question: ${question}`
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Unable to generate answer';

    } catch (error) {
      console.error('Error answering question:', error);
      throw error;
    }
  }

  // Update service configuration
  updateConfig(config: AzureOpenAIConfig): void {
    this.config = config;
  }
}
