'use client';

import { useState } from 'react';
import { Button, Card, CognitiveMeter, MoodBadge } from '@edro/ui';
import { useSession, useTrackCognitive, useTrackEmotional } from '@/lib/hooks';

export function CognitiveCheckin() {
  const { sessionId } = useSession();
  const trackCognitive = useTrackCognitive();
  const trackEmotional = useTrackEmotional();

  const [foco, setFoco] = useState(60);
  const [energia, setEnergia] = useState(60);
  const [humor, setHumor] = useState(3);
  const [message, setMessage] = useState<string | null>(null);

  const saving = trackCognitive.isPending || trackEmotional.isPending;

  const handleSubmit = async () => {
    if (!sessionId) {
      setMessage('Sessao nao iniciada.');
      return;
    }

    try {
      setMessage(null);
      await trackCognitive.mutateAsync({
        session_id: sessionId,
        foco,
        energia,
      });
      await trackEmotional.mutateAsync({
        session_id: sessionId,
        humor_auto_reportado: humor,
      });
      setMessage('Estado atualizado.');
    } catch (err) {
      setMessage('Nao foi possivel atualizar o estado.');
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Check-in cognitivo</h3>
          <p className="text-sm text-slate-600">Ajuste foco, energia e humor para adaptar a trilha.</p>
        </div>
        <MoodBadge value={humor} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <CognitiveMeter label="Foco" value={foco} tone="focus" />
          <input
            type="range"
            min={0}
            max={100}
            value={foco}
            onChange={(event) => setFoco(parseInt(event.target.value, 10))}
            className="w-full accent-blue-600"
          />
        </div>
        <div className="space-y-2">
          <CognitiveMeter label="Energia" value={energia} tone="energy" />
          <input
            type="range"
            min={0}
            max={100}
            value={energia}
            onChange={(event) => setEnergia(parseInt(event.target.value, 10))}
            className="w-full accent-orange-500"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Humor</span>
            <span className="font-semibold text-slate-900">{humor}/5</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={humor}
            onChange={(event) => setHumor(parseInt(event.target.value, 10))}
            className="w-full accent-emerald-500"
          />
          <div className="text-xs text-slate-500">1 = baixo, 5 = otimo</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Atualizando...' : 'Atualizar estado'}
        </Button>
        {message && <span className="text-xs text-slate-600">{message}</span>}
      </div>
    </Card>
  );
}
