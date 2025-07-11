import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QAPair } from '@/contexts/types';

interface QAViewProps {
  qaList: QAPair[];
}

export function QAView({ qaList }: QAViewProps) {
  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-12rem)] w-full">
          <div className="p-4 space-y-6">
            {qaList.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No questions yet. Use the message field at the top to ask questions about the conversation.
              </div>
            ) : (
              qaList.map((qa) => (
                <div key={qa.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground rounded-full p-1 mt-0.5">
                      <span className="text-xs font-medium px-1">Q</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{qa.question}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {qa.isManual ? 'Manually asked' : 'Detected in conversation'} • {new Date(qa.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pl-10">
                    <div className="bg-accent text-accent-foreground rounded-full p-1 mt-0.5">
                      <span className="text-xs font-medium px-1">A</span>
                    </div>
                    <div className="flex-1">
                      <div>{qa.answer}</div>
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
