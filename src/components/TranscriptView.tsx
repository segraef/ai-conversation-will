import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TranscriptSegment, InterimTranscriptSegment } from '@/contexts/types';

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  interimText?: InterimTranscriptSegment | null;
}

export function TranscriptView({ segments, interimText }: TranscriptViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments are added or interim text changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [segments, interimText]);
  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-var(--control-bar-height,140px)-120px)] sm:h-[calc(100vh-12rem)] w-full">
          <div className="p-3 pb-6 space-y-3">{/* Added pb-6 for bottom padding */}
            {segments.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No transcript data yet. Start recording to see the conversation.
              </div>
            ) : (
              <>
                {segments.map((segment) => (
                  <div key={segment.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">{segment.speakerId}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(segment.timestamp).toLocaleTimeString()}
                      </span>
                      {segment.detectedLanguage && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
                          {segment.detectedLanguage}
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${segment.isQuestion ? 'font-medium' : ''}`}>
                      {segment.text}
                    </div>
                  </div>
                ))}
                {/* Show interim text in real-time */}
                {interimText && (
                  <div className="space-y-1 opacity-70">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">{interimText.speakerId}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(interimText.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded">
                        typing...
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground italic">
                      {interimText.text}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
