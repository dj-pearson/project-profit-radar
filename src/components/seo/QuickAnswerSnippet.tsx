import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface QuickAnswerSnippetProps {
  question: string;
  answer: string;
  className?: string;
}

export const QuickAnswerSnippet: React.FC<QuickAnswerSnippetProps> = ({
  question,
  answer,
  className = ""
}) => {
  return (
    <Card className={`border-primary/20 bg-primary/5 mb-8 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">
            Quick Answer:
          </h2>
          <p className="text-base leading-relaxed">
            <strong className="text-primary">{question}</strong> {answer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface QuickFactsProps {
  title: string;
  facts: string[];
  className?: string;
}

export const QuickFacts: React.FC<QuickFactsProps> = ({
  title,
  facts,
  className = ""
}) => {
  return (
    <Card className={`border-green-200 bg-green-50 mb-8 ${className}`}>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-4">{title}</h3>
        <ul className="space-y-2">
          {facts.map((fact, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <span className="text-green-700">{fact}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

interface LastUpdatedProps {
  date: string;
  className?: string;
}

export const LastUpdated: React.FC<LastUpdatedProps> = ({
  date,
  className = ""
}) => {
  return (
    <div className={`text-sm text-muted-foreground mb-6 ${className}`}>
      <span className="font-medium">Last updated:</span> {date}
    </div>
  );
};