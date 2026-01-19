'use client';

import { Drop } from '@/types';
import { Card, Badge, DifficultyPill } from '@edro/ui';
import { BookOpen, Lightbulb, Link as LinkIcon } from 'lucide-react';

interface DropViewerProps {
  drop: Drop;
}

export function DropViewer({ drop }: DropViewerProps) {
  const content = drop.drop_text;

  return (
    <Card className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-3xl font-bold text-gray-900">{drop.title}</h1>
          <Badge variant="primary">{drop.drop_type}</Badge>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 mr-1" />
            <span>Dificuldade</span>
            <DifficultyPill level={drop.difficulty} showLabel={false} />
          </span>
          {drop.topic_code && (
            <span className="bg-gray-100 px-2 py-1 rounded">
              {drop.topic_code}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-lg max-w-none mb-8">
        <div 
          className="text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content.text || drop.content }}
        />
      </div>

      {/* Examples */}
      {content.examples && content.examples.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Exemplos
          </h3>
          <ul className="space-y-2">
            {content.examples.map((example, index) => (
              <li key={index} className="text-blue-800 text-sm">
                • {example}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hints */}
      {content.hints && content.hints.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-900 mb-3 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2" />
            Dicas
          </h3>
          <ul className="space-y-2">
            {content.hints.map((hint, index) => (
              <li key={index} className="text-yellow-800 text-sm">
                💡 {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Explanation */}
      {content.explanation && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-3">Explicação</h3>
          <p className="text-green-800 text-sm">{content.explanation}</p>
        </div>
      )}

      {/* References */}
      {content.references && content.references.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <LinkIcon className="w-5 h-5 mr-2" />
            Referências
          </h3>
          <ul className="space-y-1">
            {content.references.map((ref, index) => (
              <li key={index} className="text-gray-700 text-sm">
                📚 {ref}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
