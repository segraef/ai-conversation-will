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
      // First check if it's a real-time question we can answer locally
      const realtimeAnswer = this.handleRealTimeQuestion(question);
      if (realtimeAnswer) {
        return realtimeAnswer;
      }

      const contextText = context.length > 0
        ? context.map(segment =>
            `[${new Date(segment.timestamp).toLocaleTimeString()}] ${segment.speakerId}: ${segment.text}`
          ).join('\n')
        : '';

      // Enhanced system prompt that handles both contextual and general questions
      const systemPrompt = context.length > 0
        ? 'You are a helpful assistant that can answer questions using conversation context when relevant, or provide general knowledge answers when the question is not related to the conversation. If the question is about the conversation, use the transcript to provide accurate answers. For general questions (like current time, weather, general knowledge), answer normally even if they are not related to the conversation context.'
        : 'You are a helpful assistant that answers questions clearly and concisely. Provide accurate and helpful responses to any question asked.';

      let userPrompt: string;
      
      if (contextText) {
        // Check if the question seems to be about the conversation
        const conversationKeywords = ['conversation', 'discuss', 'mention', 'talk about', 'said', 'spoke', 'meeting', 'call'];
        const isAboutConversation = conversationKeywords.some(keyword => 
          question.toLowerCase().includes(keyword)
        );

        if (isAboutConversation) {
          userPrompt = `Based on this conversation transcript:\n\n${contextText}\n\nQuestion: ${question}\n\nPlease answer the question using information from the conversation above.`;
        } else {
          userPrompt = `I have this conversation context available if needed:\n\n${contextText}\n\nQuestion: ${question}\n\nPlease answer this question. If it's related to the conversation above, use that information. Otherwise, provide a general answer.`;
        }
      } else {
        userPrompt = `Question: ${question}`;
      }

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
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: 400,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const answer = data.choices[0]?.message?.content || 'Unable to generate answer';

      // Check and handle real-time questions that AI models can't answer
      const realTimeAnswer = this.handleRealTimeQuestion(question);
      return realTimeAnswer || answer;

    } catch (error) {
      console.error('Error answering question:', error);
      throw error;
    }
  }

  // Handle real-time questions that AI models can't answer
  private handleRealTimeQuestion(question: string): string | null {
    const lowerQuestion = question.toLowerCase().trim();
    
    // Time-related questions
    if (lowerQuestion.includes('time') && (lowerQuestion.includes('what') || lowerQuestion.includes('current'))) {
      const now = new Date();
      return `The current time is ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}.`;
    }
    
    // Date-related questions
    if ((lowerQuestion.includes('date') || lowerQuestion.includes('today')) && lowerQuestion.includes('what')) {
      const now = new Date();
      return `Today's date is ${now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}.`;
    }
    
    return null; // Not a real-time question, let AI handle it
  }

  // Update service configuration
  updateConfig(config: AzureOpenAIConfig): void {
    this.config = config;
  }
}
