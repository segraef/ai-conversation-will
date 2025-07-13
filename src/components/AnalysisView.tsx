import { useEffect, useRef, useState } from 'react';
import { AnalysisResult } from '../contexts/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  TrendUp,
  Heart,
  Hash,
  ListBullets,
  ChartBar
} from '@phosphor-icons/react';
import { toast } from 'sonner';

interface AnalysisViewProps {
  analyses: AnalysisResult[];
}

export function AnalysisView({ analyses }: AnalysisViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Auto-scroll to bottom when new analyses arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analyses, autoScroll]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getAnalysisIcon = (type: AnalysisResult['type']) => {
    switch (type) {
      case 'sentiment':
        return <Heart size={14} />;
      case 'emotion':
        return <TrendUp size={14} />;
      case 'topic':
        return <Hash size={14} />;
      case 'keyword':
        return <Hash size={14} />;
      case 'summary':
        return <ListBullets size={14} />;
      default:
        return <ChartBar size={14} />;
    }
  };

  const getAnalysisColor = (type: AnalysisResult['type']) => {
    switch (type) {
      case 'sentiment':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'emotion':
        return 'bg-purple-500/10 text-purple-700 border-purple-200';
      case 'topic':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'keyword':
        return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'summary':
        return 'bg-indigo-500/10 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredAnalyses = activeTab === 'all'
    ? analyses
    : analyses.filter(analysis => analysis.type === activeTab);

  const analysisCounts = analyses.reduce((acc, analysis) => {
    acc[analysis.type] = (acc[analysis.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const exportAnalyses = () => {
    const content = filteredAnalyses.map(analysis => {
      const lines: string[] = [];
      lines.push(`[${formatTime(analysis.timestamp)}] ${analysis.type.toUpperCase()}`);
      lines.push(`Title: ${analysis.title}`);
      lines.push(`Content: ${analysis.content}`);
      if (analysis.score !== undefined) {
        lines.push(`Score: ${(analysis.score * 100).toFixed(1)}%`);
      }
      lines.push(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      if (analysis.metadata) {
        lines.push(`Metadata: ${JSON.stringify(analysis.metadata, null, 2)}`);
      }
      lines.push('');
      return lines.join('\n');
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${activeTab}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Analysis exported successfully');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Analysis tabs */}
      <div className="border-b">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-6 w-full h-8 rounded-none">
            <TabsTrigger value="all" className="text-xs px-1">
              All ({analyses.length})
            </TabsTrigger>
            <TabsTrigger value="sentiment" className="text-xs px-1">
              Sentiment ({analysisCounts.sentiment || 0})
            </TabsTrigger>
            <TabsTrigger value="emotion" className="text-xs px-1">
              Emotion ({analysisCounts.emotion || 0})
            </TabsTrigger>
            <TabsTrigger value="topic" className="text-xs px-1">
              Topics ({analysisCounts.topic || 0})
            </TabsTrigger>
            <TabsTrigger value="keyword" className="text-xs px-1">
              Keywords ({analysisCounts.keyword || 0})
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs px-1">
              Summary ({analysisCounts.summary || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Analysis content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredAnalyses.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs text-center">
            {activeTab === 'all'
              ? 'No analysis results yet. Start recording to see speech analysis here.'
              : `No ${activeTab} analysis results yet.`
            }
          </div>
        ) : (
          <>
            {filteredAnalyses.map((analysis) => (
              <Card key={analysis.id} className="bg-background/50 border-border/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getAnalysisColor(analysis.type)}`}
                      >
                        <span className="mr-1">{getAnalysisIcon(analysis.type)}</span>
                        {analysis.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(analysis.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {analysis.score !== undefined && (
                        <div className="flex items-center gap-1">
                          <Progress
                            value={analysis.score * 100}
                            className="w-8 h-1"
                          />
                          <span className={`text-xs ${getScoreColor(analysis.score)}`}>
                            {(analysis.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      <Badge
                        variant={analysis.confidence > 0.8 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {(analysis.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>

                  <CardTitle className="text-sm font-medium">
                    {analysis.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-xs leading-relaxed mb-2">
                    {analysis.content}
                  </p>

                  {analysis.metadata && Object.keys(analysis.metadata).length > 0 && (
                    <div className="text-xs bg-muted/20 p-2 rounded">
                      <strong>Additional Data:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {JSON.stringify(analysis.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}
