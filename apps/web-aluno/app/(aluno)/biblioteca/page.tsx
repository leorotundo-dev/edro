'use client';

import Link from 'next/link';
import { Card, Button } from '@edro/ui';
import { BookOpen, CheckSquare, Folder } from 'lucide-react';

export default function BibliotecaPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Biblioteca</h1>
          <p className="text-slate-600">Conteudo organizado por tipo e tema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <BookOpen className="h-5 w-5 text-primary-600" />
          <p className="text-sm font-semibold text-slate-900">Drops</p>
          <p className="text-xs text-slate-500">Resumos e explicacoes.</p>
          <Link href="/biblioteca/drops" className="inline-flex">
            <Button size="sm" variant="outline">Abrir</Button>
          </Link>
        </Card>
        <Card className="p-4 space-y-2">
          <CheckSquare className="h-5 w-5 text-primary-600" />
          <p className="text-sm font-semibold text-slate-900">Questoes</p>
          <p className="text-xs text-slate-500">Listas e colecoes de questoes.</p>
          <Link href="/biblioteca/questoes" className="inline-flex">
            <Button size="sm" variant="outline">Abrir</Button>
          </Link>
        </Card>
        <Card className="p-4 space-y-2">
          <Folder className="h-5 w-5 text-primary-600" />
          <p className="text-sm font-semibold text-slate-900">Colecoes</p>
          <p className="text-xs text-slate-500">Pacotes personalizados.</p>
          <Link href="/biblioteca/colecoes" className="inline-flex">
            <Button size="sm" variant="outline">Abrir</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}