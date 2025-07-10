import { useEffect, useState } from 'react';
import { AzureSpeechService } from '../services/AzureSpeechService';
import { AzureOpenAIService } from '../services/AzureOpenAIService';
import { AzureSTTConfig, AzureOpenAIConfig, TranscriptSegment, SummaryChunk } from '../types';

// Hook for managing the Azure Speech-to-Text service
export function useAzureSpeech(
  config: AzureSTTConfig,
  onTranscriptReceived: (segment: TranscriptSegment) => void
) {
  const [service, setService] = useState<AzureSpeechService | null>(null);
  
  // Initialize the service when config changes
  useEffect(() => {
    const speechService = new AzureSpeechService(config, onTranscriptReceived);
    setService(speechService);
    
    return () => {
      speechService.stopRecognition().catch(console.error);
    };
  }, [config.endpoint, config.subscriptionKey]);
  
  // Methods to control the service
  const startRecognition = async (audioSource: 'microphone' | 'system') => {
    if (service) {
      await service.startRecognition(audioSource);
    }
  };
  
  const stopRecognition = async () => {
    if (service) {
      await service.stopRecognition();
    }
  };
  
  const checkConnection = async () => {
    if (service) {
      return await service.checkConnection();
    }
    return false;
  };
  
  return {
    service,
    startRecognition,
    stopRecognition,
    checkConnection
  };
}

// Hook for managing the Azure OpenAI service
export function useAzureOpenAI(config: AzureOpenAIConfig) {
  const [service, setService] = useState<AzureOpenAIService | null>(null);
  
  // Initialize the service when config changes
  useEffect(() => {
    const openAIService = new AzureOpenAIService(config);
    setService(openAIService);
  }, [config.endpoint, config.subscriptionKey, config.deploymentName]);
  
  // Methods to control the service
  const generateSummary = async (segments: TranscriptSegment[]): Promise<string> => {
    if (service) {
      return await service.generateSummary(segments);
    }
    return '';
  };
  
  const answerQuestion = async (question: string, context: TranscriptSegment[] = []): Promise<string> => {
    if (service) {
      return await service.answerQuestion(question, context);
    }
    return '';
  };
  
  const detectQuestion = async (text: string): Promise<boolean> => {
    if (service) {
      return await service.detectQuestion(text);
    }
    return false;
  };
  
  const checkConnection = async () => {
    if (service) {
      return await service.checkConnection();
    }
    return false;
  };
  
  return {
    service,
    generateSummary,
    answerQuestion,
    detectQuestion,
    checkConnection
  };
}

// Hook for managing transcript chunking
export function useTranscriptChunking(
  transcript: TranscriptSegment[],
  chunkInterval: number,
  onChunkComplete: (chunk: SummaryChunk) => void,
  isRecording: boolean
) {
  const [lastChunkTime, setLastChunkTime] = useState<number | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  
  // Check if we need to create a new chunk
  useEffect(() => {
    if (!isRecording || transcript.length === 0) {
      return;
    }
    
    const now = Date.now();
    const intervalMs = chunkInterval * 60 * 1000;
    
    // Initialize lastChunkTime if it's null
    if (lastChunkTime === null) {
      setLastChunkTime(now);
      return;
    }
    
    // Check if we've reached the chunk interval
    if (now - lastChunkTime >= intervalMs) {
      // Find segments that haven't been processed yet
      const unprocessedSegments = transcript.filter(
        segment => !processedIds.has(segment.id)
      );
      
      if (unprocessedSegments.length > 0) {
        // Create a new chunk
        const chunk: SummaryChunk = {
          id: Date.now().toString(),
          startTime: lastChunkTime,
          endTime: now,
          summary: 'Generating summary...',
          segments: unprocessedSegments
        };
        
        // Update the processed IDs
        const newProcessedIds = new Set(processedIds);
        unprocessedSegments.forEach(segment => {
          newProcessedIds.add(segment.id);
        });
        
        setProcessedIds(newProcessedIds);
        setLastChunkTime(now);
        
        // Call the callback with the new chunk
        onChunkComplete(chunk);
      }
    }
  }, [transcript, chunkInterval, lastChunkTime, isRecording]);
  
  // Reset when recording starts/stops
  useEffect(() => {
    if (isRecording) {
      setLastChunkTime(Date.now());
    } else {
      setLastChunkTime(null);
      setProcessedIds(new Set());
    }
  }, [isRecording]);
}