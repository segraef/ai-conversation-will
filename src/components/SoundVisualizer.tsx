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

    // Debug logging
    if (audioLevel > 0) {
      console.log('SoundVisualizer received audio level:', audioLevel);
    }

    // Update bars when there's any audio input (lowered threshold)
    if (audioLevel > 1) { // Lower threshold for better responsiveness
      setBars(prev => prev.map((_, index) => {
        // Create responsive bars based on actual audio level
        const baseLevel = Math.max(0, audioLevel / 100); // Normalize to 0-1
        const indexOffset = Math.abs(index - 6) / 6; // Distance from center
        const barHeight = baseLevel * (1 - indexOffset * 0.3); // Center bars higher, less variation
        return Math.max(0.05, Math.min(1, barHeight + Math.random() * 0.2));
      }));
    } else {
      // Gradual fade to low state when no audio
      setBars(prev => prev.map(height => Math.max(0.02, height * 0.85)));
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
