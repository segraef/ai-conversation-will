import { Microphone, MicrophoneSlash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface RecordButtonProps {
  isRecording: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onToggle, disabled = false }: RecordButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Button
      onClick={onToggle}
      disabled={disabled}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        'relative h-14 w-14 rounded-full p-0 transition-all duration-200',
        'bg-gradient-to-br from-white/20 to-white/5',
        'backdrop-blur-sm border border-white/10',
        'shadow-lg shadow-black/20',
        'hover:from-white/25 hover:to-white/10 hover:border-white/20',
        'active:scale-95',
        disabled && 'opacity-50 cursor-not-allowed',
        isPressed && 'scale-95 shadow-md',
        // Glass morphism effect
        'before:absolute before:inset-0 before:rounded-full',
        'before:bg-gradient-to-br before:from-white/30 before:to-transparent',
        'before:opacity-0 hover:before:opacity-100 before:transition-opacity'
      )}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      <div className="relative z-10">
        {isRecording ? (
          <MicrophoneSlash
            weight="bold"
            className={cn(
              "h-6 w-6 transition-colors duration-200",
              "text-red-400"
            )}
          />
        ) : (
          <Microphone
            weight="bold"
            className={cn(
              "h-6 w-6 transition-colors duration-200",
              disabled ? "text-muted-foreground" : "text-primary"
            )}
          />
        )}
      </div>

      {/* Additional glass highlight */}
      <div className="absolute inset-1 rounded-full bg-gradient-to-t from-transparent to-white/20 pointer-events-none" />
    </Button>
  );
}
