import { ArrowLeft, Phone, Video, X } from 'lucide-react';
import type { JSX } from 'react';
import type { Conversation } from '../../../../extension/src/shared/types';
import { useMessengerStore } from '../../stores/messengerStore';
import { useConversationDetails } from '../inbox/useConversationDetails';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export interface ThreadHeaderProps {
  conversation: Conversation;
}

export function ThreadHeader({ conversation }: ThreadHeaderProps): JSX.Element {
  const details = useConversationDetails(conversation);
  const setActiveConversationId = useMessengerStore((state) => state.setActiveConversationId);

  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          aria-label="Back to conversations"
          onClick={() => setActiveConversationId(null)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            {details.avatarUrl && <AvatarImage src={details.avatarUrl} alt={details.title} />}
            <AvatarFallback className="text-xs">{details.initials}</AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card ${details.serviceMeta.bgClass}`}
            aria-label={details.serviceMeta.label}
          >
            <details.serviceMeta.Icon className="h-2.5 w-2.5 text-white" aria-hidden />
          </span>
        </div>

        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-semibold">{details.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {conversation.type === 'group'
              ? `${conversation.participantIds.length} participants`
              : details.serviceMeta.label}
          </span>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Start voice call">
                <Phone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Voice call</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Start video call">
                <Video className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Video call</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close conversation"
                onClick={() => setActiveConversationId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </header>
  );
}
