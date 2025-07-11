import { useEffect, useState } from 'react';

interface SoundVisualizerProps {
  isRecording: boolean;
}

export function SoundVisualizer({ isRecording }: SoundVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(24).fill(0));

  useEffect(() => {
    if (!isRecording) {
      setBars(Array(24).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map((_, index) => {
        // Create a wave pattern with some randomness
        const wave = Math.sin(Date.now() * 0.005 + index * 0.3) * 0.5 + 0.5;
        const random = Math.random() * 0.3;
        return Math.max(0.1, Math.min(1, wave + random));
      }));
    }, 80);

    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isRecording) {
    return <div className="h-6" />; // Maintain layout space
  }

  return (
    <div className="flex items-end gap-0.5 h-6 mt-1">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-0.5 bg-primary rounded-full transition-all duration-75 ease-out"
          style={{
            height: `${Math.max(8, height * 100)}%`,
            opacity: 0.5 + height * 0.5,
            transform: `scaleY(${height})`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  );
}
