import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TranscriptSegment } from '@/types';

interface TranscriptViewProps {
  segments: TranscriptSegment[];
}

export function TranscriptView({ segments }: TranscriptViewProps) {
  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-14rem)] w-full">
          <div className="p-4 space-y-4">
            {segments.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No transcript data yet. Start recording to see the conversation.
              </div>
            ) : (
              segments.map((segment) => (
                <div key={segment.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{segment.speakerId}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(segment.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={segment.isQuestion ? 'font-medium' : ''}>
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