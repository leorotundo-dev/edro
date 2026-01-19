'use client';

import { useTimer } from '@/lib/hooks';
import { Button } from '@edro/ui';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TimerProps {
  autoStart?: boolean;
  onTimeUpdate?: (seconds: number) => void;
}

export function Timer({ autoStart = false, onTimeUpdate }: TimerProps) {
  const { seconds, isRunning, start, pause, reset, formatTime } = useTimer(0);

  // Notificar mudanças de tempo
  if (onTimeUpdate) {
    onTimeUpdate(seconds);
  }

  // Auto start
  if (autoStart && !isRunning && seconds === 0) {
    start();
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="text-2xl font-mono font-bold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg">
        {formatTime()}
      </div>
      
      <div className="flex space-x-2">
        {!isRunning ? (
          <Button
            onClick={start}
            variant="primary"
            size="sm"
            className="flex items-center space-x-1"
          >
            <Play className="w-4 h-4" />
            <span>Iniciar</span>
          </Button>
        ) : (
          <Button
            onClick={pause}
            variant="secondary"
            size="sm"
            className="flex items-center space-x-1"
          >
            <Pause className="w-4 h-4" />
            <span>Pausar</span>
          </Button>
        )}
        
        <Button
          onClick={reset}
          variant="ghost"
          size="sm"
          className="flex items-center"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
