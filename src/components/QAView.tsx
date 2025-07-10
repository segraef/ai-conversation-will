import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QAPair } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { useState } from 'react';

interface QAViewProps {
  qaList: QAPair[];
  onAskQuestion: (question: string) => Promise<void>;
}

export function QAView({ qaList, onAskQuestion }: QAViewProps) {
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuestion.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAskQuestion(newQuestion.trim());
      setNewQuestion('');
    } catch (error) {
      console.error('Error asking question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="flex-1 overflow-hidden flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        <ScrollArea className="flex-1 h-[calc(100vh-18rem)] w-full">
          <div className="p-4 space-y-6">
            {qaList.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No questions detected yet. Ask a question below or start recording.
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
        
        <div className="p-4 border-t mt-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Ask a question..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              disabled={isSubmitting}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!newQuestion.trim() || isSubmitting}
            >
              <PaperPlaneRight className="mr-2" />
              Ask
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}