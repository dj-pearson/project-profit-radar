import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search, Reply, File, ArrowLeft } from 'lucide-react';
import { format } from "date-fns";
import type { ChatChannel, ChatMessage } from '@/hooks/useAdvancedChat';

/**
 * The message pane on /communication.
 *
 * Until US-309 this showed four invented messages from "John Smith" and
 * "Sarah Johnson", and every send, file share and voice note went into local
 * state followed by "Message sent - Your message has been delivered." Nothing
 * was delivered; the next person to open the thread saw none of it.
 *
 * Messages now come from chat_messages via useAdvancedChat, and sending goes
 * through the hook's insert. The composer clears only when that insert
 * returned a row. File, image and voice sending are gone rather than faked:
 * no chat-files bucket is created by any migration, and voice recording was
 * never implemented at all.
 */

interface AdvancedChatInterfaceProps {
  thread: ChatChannel;
  messages: ChatMessage[];
  currentUserId?: string;
  onSend: (content: string, replyTo?: string) => Promise<unknown>;
  onBack?: () => void;
}

/** Same id can arrive twice: once from the reload after a send, once from realtime. */
export function channelMessages(messages: ChatMessage[], channelId: string): ChatMessage[] {
  const seen = new Set<string>();
  return messages.filter((m) => {
    if (m.channel_id !== channelId || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

export const AdvancedChatInterface: React.FC<AdvancedChatInterfaceProps> = ({
  thread,
  messages,
  currentUserId,
  onSend,
  onBack,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const threadMessages = channelMessages(messages, thread.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length]);

  const submit = async () => {
    const content = newMessage.trim();
    if (!content || sending) return;
    setSending(true);
    // The hook toasts its own error and returns null; keep the draft in that case.
    const saved = await onSend(content, replyingTo?.id);
    setSending(false);
    if (saved) {
      setNewMessage('');
      setReplyingTo(null);
    }
  };

  const nameFor = (m: ChatMessage) => (m.sender_id === currentUserId ? 'You' : m.sender_name);

  const query = searchQuery.trim().toLowerCase();
  const filteredMessages = threadMessages.filter(
    (m) => !query || m.content.toLowerCase().includes(query),
  );

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.sender_id === currentUserId;
    const replyMessage = message.reply_to
      ? threadMessages.find((m) => m.id === message.reply_to)
      : null;
    const name = nameFor(message);

    return (
      <div key={message.id} className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className={`flex-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`rounded-lg p-3 ${isOwn ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>
            {replyMessage && (
              <div className="border-l border-border pl-2 mb-2 opacity-70">
                <p className="text-xs font-medium">{nameFor(replyMessage)}</p>
                <p className="text-xs truncate">{replyMessage.content}</p>
              </div>
            )}

            {message.file_name ? (
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <p className="text-sm font-medium">{message.file_name}</p>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}

            {message.edited_at && <p className="text-xs opacity-50 mt-1">(edited)</p>}
          </div>

          <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.timestamp), 'HH:mm')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label="Reply"
              onClick={() => setReplyingTo(message)}
            >
              <Reply className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" aria-label="Back to conversations" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <CardTitle className="text-lg">{thread.name}</CardTitle>
            <Badge variant="outline" className="text-xs">{thread.channel_type}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Search messages"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {showSearch && (
          <div className="mt-3">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          {threadMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages in this conversation yet.
            </p>
          ) : (
            <div className="space-y-4">{filteredMessages.map(renderMessage)}</div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>

        {replyingTo && (
          <div className="border-t border-b p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Reply className="h-4 w-4" />
                <span className="text-sm">Replying to {nameFor(replyingTo)}</span>
              </div>
              <Button variant="ghost" size="sm" aria-label="Cancel reply" onClick={() => setReplyingTo(null)}>
                x
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">{replyingTo.content}</p>
          </div>
        )}

        <div className="border-t p-4">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              className="flex-1 min-h-[40px] max-h-32 resize-none"
              rows={1}
            />
            <Button onClick={() => void submit()} disabled={sending || !newMessage.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
