import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TranscriptSegment } from '@/contexts/types';

interface TranscriptViewProps {
  segments: TranscriptSegment[];
}

export function TranscriptView({ segments }: TranscriptViewProps) {
  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-12rem)] w-full">
          <div className="p-3 space-y-3">
            {segments.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No transcript data yet. Start recording to see the conversation.
              </div>
            ) : (
              segments.map((segment) => (
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
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
