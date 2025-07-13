import { useEffect, useRef, useState } from 'react';
import { TranslationSegment } from '../contexts/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Download, Eye, EyeSlash } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface TranslationViewProps {
  translations: TranslationSegment[];
  showOriginal?: boolean;
  onToggleOriginal?: () => void;
}

export function TranslationView({
  translations,
  showOriginal = true,
  onToggleOriginal
}: TranslationViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new translations arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [translations, autoScroll]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const copyToClipboard = (text: string, type: 'original' | 'translated') => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${type === 'original' ? 'Original' : 'Translated'} text copied to clipboard`);
    }).catch(() => {
      toast.error('Failed to copy text');
    });
  };

  const exportTranslations = () => {
    const content = translations.map(segment => {
      const lines: string[] = [];
      lines.push(`[${formatTime(segment.timestamp)}]`);
      if (showOriginal) {
        lines.push(`Original (${segment.sourceLanguage}): ${segment.originalText}`);
      }
      lines.push(`Translation (${segment.targetLanguage}): ${segment.translatedText}`);
      lines.push(`Confidence: ${(segment.confidence * 100).toFixed(1)}%`);
      lines.push('');
      return lines.join('\n');
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Translations exported successfully');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Translation list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {translations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            No translations yet. Start recording to see translations here.
          </div>
        ) : (
          <>
            {translations.map((segment) => (
              <Card key={segment.id} className="bg-background/50 border-border/30">
                <CardContent className="p-3 space-y-2">
                  {/* Timestamp and confidence */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatTime(segment.timestamp)}</span>
                    <Badge
                      variant={segment.confidence > 0.8 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {(segment.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  {/* Original text (if enabled) */}
                  {showOriginal && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {segment.sourceLanguage}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Original</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(segment.originalText, 'original')}
                          className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                        >
                          <Copy size={10} />
                        </Button>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground bg-muted/20 p-2 rounded">
                        {segment.originalText}
                      </p>
                    </div>
                  )}

                  {/* Translated text */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          {segment.targetLanguage}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Translation</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(segment.translatedText, 'translated')}
                        className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                      >
                        <Copy size={10} />
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed bg-primary/10 p-2 rounded">
                      {segment.translatedText}
                    </p>
                  </div>
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
