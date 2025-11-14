/**
 * Contextual Help
 * Provides inline help tooltips and popovers throughout the app
 * Easy to integrate with any component
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  ExternalLink,
  BookOpen,
  Video,
  FileText
} from 'lucide-react';

interface HelpLink {
  text: string;
  url: string;
  type?: 'article' | 'video' | 'documentation';
}

interface ContextualHelpProps {
  title: string;
  content: string;
  links?: HelpLink[];
  videoUrl?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  title,
  content,
  links = [],
  videoUrl,
  position = 'top',
  size = 'md'
}) => {
  const [open, setOpen] = useState(false);

  const getLinkIcon = (type?: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-3 w-3" />;
      case 'article':
        return <BookOpen className="h-3 w-3" />;
      case 'documentation':
        return <FileText className="h-3 w-3" />;
      default:
        return <ExternalLink className="h-3 w-3" />;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 hover:bg-transparent"
        >
          <HelpCircle className={`${getIconSize()} text-muted-foreground hover:text-blue-600 transition-colors`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={position}
        className="w-80"
        align="start"
      >
        <div className="space-y-3">
          {/* Title */}
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <h4 className="font-semibold text-sm">{title}</h4>
          </div>

          {/* Content */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {content}
          </p>

          {/* Video Embed */}
          {videoUrl && (
            <div className="border rounded overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <Video className="h-8 w-8 text-gray-400" />
                <span className="text-xs text-gray-500 ml-2">Video Tutorial</span>
              </div>
            </div>
          )}

          {/* Help Links */}
          {links.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Learn More:</p>
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {getLinkIcon(link.type)}
                  <span>{link.text}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Inline variant for compact spaces
interface InlineHelpProps {
  content: string;
  className?: string;
}

export const InlineHelp: React.FC<InlineHelpProps> = ({ content, className = '' }) => {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <ContextualHelp
        title="Help"
        content={content}
        size="sm"
        position="top"
      />
    </span>
  );
};

// Help tooltip for form fields
interface FieldHelpProps {
  label: string;
  helpText: string;
  children: React.ReactNode;
}

export const FieldHelp: React.FC<FieldHelpProps> = ({ label, helpText, children }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">{label}</label>
        <InlineHelp content={helpText} />
      </div>
      {children}
    </div>
  );
};

export default ContextualHelp;
