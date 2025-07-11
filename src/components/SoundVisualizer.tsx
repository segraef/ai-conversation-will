import { useEffect, useState } from 'react';

interface SoundVisualizerProps {
  isRecording: boolean;
  audioLevel?: number; // Real audio level from microphone
}

export function SoundVisualizer({ isRecording, audioLevel = 0 }: SoundVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(12).fill(0)); // Reduced to 12 bars

  useEffect(() => {
    if (!isRecording) {
      setBars(Array(12).fill(0));
      return;
    }

    // Only update bars when there's actual audio input
    if (audioLevel > 5) { // Only animate when there's meaningful audio input
      setBars(prev => prev.map((_, index) => {
        // Create responsive bars based on actual audio level
        const baseLevel = Math.max(0, (audioLevel - 5) / 95); // Normalize to 0-1
        const indexOffset = Math.abs(index - 6) / 6; // Distance from center
        const barHeight = baseLevel * (1 - indexOffset * 0.5); // Center bars higher
        return Math.max(0.02, Math.min(1, barHeight + Math.random() * 0.1));
      }));
    } else {
      // Gradual fade to low state when no audio
      setBars(prev => prev.map(height => Math.max(0.02, height * 0.9)));
    }
  }, [isRecording, audioLevel]);

  return (
    <div className="flex items-end gap-0.5 h-4 mt-1 justify-center">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-0.5 bg-primary/80 rounded-full transition-all duration-100 ease-out"
          style={{
            height: `${Math.max(4, height * 100)}%`,
            opacity: 0.3 + height * 0.7,
          }}
        />
      ))}
    </div>
  );
}
