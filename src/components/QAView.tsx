import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QAPair } from '@/contexts/types';

interface QAViewProps {
  qaList: QAPair[];
}

export function QAView({ qaList }: QAViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new QA pairs are added
  useEffect(() => {
    if (scrollAreaRef.current && qaList.length > 0) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [qaList.length]);

  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-var(--control-bar-height,140px)-120px)] sm:h-[calc(100vh-12rem)] w-full">
          <div className="p-3 pb-6 space-y-4">{/* Added pb-6 for bottom padding */}
            {qaList.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No questions yet. Use the message field to ask questions about the conversation.
              </div>
            ) : (
              qaList.map((qa) => (
                <div key={qa.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full p-1 mt-0.5">
                      <span className="text-xs font-medium px-1">Q</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{qa.question}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {qa.isManual ? 'Manually asked' : 'Detected in conversation'} • {new Date(qa.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pl-8">
                    <div className="bg-accent text-accent-foreground rounded-full p-1 mt-0.5">
                      <span className="text-xs font-medium px-1">A</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">{qa.answer}</div>
                    </div>
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
