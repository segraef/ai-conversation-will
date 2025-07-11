import { Microphone, Stop } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface RecordButtonProps {
  isRecording: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onToggle, disabled = false }: RecordButtonProps) {
  const [animating, setAnimating] = useState(false);

  // Handle animation state
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setAnimating(prev => !prev);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setAnimating(false);
    }
  }, [isRecording]);

  return (
    <Button
      onClick={onToggle}
      disabled={disabled}
      size="lg"
      className={cn(
        'h-12 w-12 rounded-full transition-all duration-300 shadow-md',
        isRecording ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90',
        animating && 'scale-105'
      )}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording ? (
        <Stop weight="bold" className="h-6 w-6" />
      ) : (
        <Microphone weight="bold" className="h-6 w-6" />
      )}
    </Button>
  );
}
