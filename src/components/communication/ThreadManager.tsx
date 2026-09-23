import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Users, Hash, MessageSquare, Volume2 } from 'lucide-react';
import { format } from "date-fns";
import { activateOnKey } from '@/lib/accessibility';
import type { ChatChannel } from '@/hooks/useAdvancedChat';

/**
 * The conversation list on /communication.
 *
 * This used to render four hardcoded threads ("Downtown Office Project",
 * "RFI-2024-001: Electrical Layout", people called John Smith and Sarah
 * Johnson with unread counts) and its pin, mute and archive buttons changed
 * local state and toasted "Thread updated" - nothing was stored, so every
 * change was gone on reload (US-309).
 *
 * It now lists the company's real chat_channels, handed down from
 * useAdvancedChat by CommunicationHub, and "New" creates one through the same
 * hook. Pin, mute and archive are gone: chat_channels has no column for any of
 * them, so they could only ever have been local.
 */

interface ThreadManagerProps {
  channels: ChatChannel[];
  loading: boolean;
  onThreadSelect: (channel: ChatChannel) => void;
  onCreateChannel: (name: string) => Promise<ChatChannel | null>;
  selectedThreadId?: string;
}

const channelIcon = (type: ChatChannel['channel_type']) => {
  switch (type) {
    case 'group':
      return <Users className="h-4 w-4" />;
    case 'project':
      return <Hash className="h-4 w-4" />;
    case 'announcement':
      return <Volume2 className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

export const ThreadManager: React.FC<ThreadManagerProps> = ({
  channels,
  loading,
  onThreadSelect,
  onCreateChannel,
  selectedThreadId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const query = searchQuery.trim().toLowerCase();
  const visible = channels.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query) ||
      (c.description ?? '').toLowerCase().includes(query),
  );

  const submitNewChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    // createChannel reports its own failure; only a returned row counts.
    const created = await onCreateChannel(name);
    setSaving(false);
    if (created) {
      setNewName('');
      setCreating(false);
      onThreadSelect(created);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Conversations</CardTitle>
          <Button size="sm" onClick={() => setCreating((v) => !v)}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>

        {creating && (
          <form onSubmit={submitNewChannel} className="flex gap-2 mt-3">
            <Input
              aria-label="New conversation name"
              placeholder="Conversation name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <Button type="submit" size="sm" disabled={saving || !newName.trim()}>
              Create
            </Button>
          </form>
        )}

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          {loading && channels.length === 0 ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
              {channels.length === 0
                ? 'No conversations yet. Use New to start one.'
                : 'No conversations match your search.'}
            </div>
          ) : (
            <div className="space-y-0">
              {visible.map((channel) => {
                const isSelected = selectedThreadId === channel.id;
                const activity = channel.last_activity_at ?? channel.created_at;
                return (
                  <div
                    key={channel.id}
                    className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-muted' : ''
                    }`}
                    onClick={() => onThreadSelect(channel)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={activateOnKey(() => onThreadSelect(channel))}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                        {channelIcon(channel.channel_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <h3 className="font-medium text-sm truncate">{channel.name}</h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {format(new Date(activity), 'MMM d')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {channel.description ?? ''}
                          </p>
                          <Badge variant="outline" className="text-xs">{channel.channel_type}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
