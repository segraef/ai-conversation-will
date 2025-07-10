import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SummaryChunk } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { CaretDown } from '@phosphor-icons/react';
import { useState } from 'react';

interface SummariesViewProps {
  summaries: SummaryChunk[];
}

export function SummariesView({ summaries }: SummariesViewProps) {
  const [openSummaryId, setOpenSummaryId] = useState<string | null>(null);
  
  const toggleSummary = (id: string) => {
    if (openSummaryId === id) {
      setOpenSummaryId(null);
    } else {
      setOpenSummaryId(id);
    }
  };
  
  const formatTimeRange = (start: number, end: number) => {
    const startTime = new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${startTime} - ${endTime}`;
  };
  
  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-14rem)] w-full">
          <div className="p-4 space-y-4">
            {summaries.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No summaries yet. Summaries will be generated during recording.
              </div>
            ) : (
              summaries.map((summary) => (
                <Collapsible 
                  key={summary.id} 
                  open={openSummaryId === summary.id}
                  onOpenChange={() => toggleSummary(summary.id)}
                  className="border rounded-md"
                >
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex justify-between w-full p-4 h-auto"
                    >
                      <span>{formatTimeRange(summary.startTime, summary.endTime)}</span>
                      <CaretDown 
                        className={`transition-transform ${openSummaryId === summary.id ? 'rotate-180' : ''}`} 
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <div className="pt-2 border-t">
                      <p>{summary.summary}</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}