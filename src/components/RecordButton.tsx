import { Microphone, MicrophoneSlash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface RecordButtonProps {
  isRecording: boolean;
  onToggle: () => void;
  disabled?: boolean;
  audioLevel?: number; // Audio level from 0-100
}

export function RecordButton({ isRecording, onToggle, disabled = false, audioLevel = 0 }: RecordButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  // Calculate glow intensity based on audio level
  const glowIntensity = Math.min(audioLevel / 30, 1); // Normalize to 0-1, cap at level 30
  const pulseScale = 1 + (glowIntensity * 0.15); // Scale from 1 to 1.15 based on audio

  return (
    <div className="relative">
      {/* Animated glow effect when recording */}
      {isRecording && (
        <div
          className="absolute inset-0 rounded-full bg-red-500/30 blur-md transition-all duration-150"
          style={{
            transform: `scale(${pulseScale})`,
            opacity: 0.3 + (glowIntensity * 0.4) // Opacity from 0.3 to 0.7
          }}
        />
      )}

      <Button
        onClick={onToggle}
        disabled={disabled}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        className={cn(
          'relative h-11 w-11 rounded-full p-0 transition-all duration-150', // Smaller: h-11 w-11 instead of h-14 w-14
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
          'before:opacity-0 hover:before:opacity-100 before:transition-opacity',
          // Audio-reactive scaling when recording
          isRecording && 'transition-transform duration-150'
        )}
        style={isRecording ? {
          transform: `scale(${0.95 + (glowIntensity * 0.1)})` // Scale from 0.95 to 1.05 based on audio
        } : undefined}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <div className="relative z-10">
          {isRecording ? (
            <MicrophoneSlash
              weight="bold"
              className={cn(
                "h-5 w-5 transition-colors duration-200", // Smaller icon: h-5 w-5 instead of h-6 w-6
                "text-red-400"
              )}
            />
          ) : (
            <Microphone
              weight="bold"
              className={cn(
                "h-5 w-5 transition-colors duration-200", // Smaller icon: h-5 w-5 instead of h-6 w-6
                disabled ? "text-muted-foreground" : "text-primary"
              )}
            />
          )}
        </div>

        {/* Additional glass highlight */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-t from-transparent to-white/20 pointer-events-none" />
      </Button>
    </div>
  );
}
