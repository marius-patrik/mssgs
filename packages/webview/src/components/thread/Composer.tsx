import { Paperclip, Send, X } from 'lucide-react';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AttachmentDraft } from '../../../../extension/src/shared/messages';
import type { Attachment } from '../../../../extension/src/shared/types';
import { getAttachmentType } from '../../lib/threadUtils';
import { generateUuid } from '../../lib/uuid';
import type { MessengerClient } from '../../messaging/client';
import { useMessengerStore } from '../../stores/messengerStore';
import { Button } from '../ui/button';
import { AttachmentPreview } from './AttachmentPreview';

const TYPING_TIMEOUT_MS = 2000;

export interface ComposerProps {
  client: MessengerClient;
  conversationId: string;
}

function mapAttachmentToDraft(attachment: Attachment): AttachmentDraft {
  return {
    name: attachment.name ?? 'attachment',
    mimeType: attachment.mimeType ?? 'application/octet-stream',
    size: attachment.size ?? 0,
    dataUrl: attachment.url ?? '',
  };
}

export function Composer({ client, conversationId }: ComposerProps): JSX.Element {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<{ timeout: ReturnType<typeof setTimeout> | null; isTyping: boolean }>({
    timeout: null,
    isTyping: false,
  });

  const replyToMessageId = useMessengerStore((state) => state.replyToMessageId);
  const editingMessageId = useMessengerStore((state) => state.editingMessageId);
  const messages = useMessengerStore((state) => state.messages);
  const sendMessage = useMessengerStore((state) => state.sendMessage);
  const editMessage = useMessengerStore((state) => state.editMessage);
  const setMessageStatus = useMessengerStore((state) => state.setMessageStatus);
  const setReplyToMessageId = useMessengerStore((state) => state.setReplyToMessageId);
  const stopEditing = useMessengerStore((state) => state.stopEditing);

  const replyToMessage = useMemo(
    () => (replyToMessageId ? messages[replyToMessageId] : null),
    [replyToMessageId, messages],
  );
  const editingMessage = useMemo(
    () => (editingMessageId ? messages[editingMessageId] : null),
    [editingMessageId, messages],
  );

  useEffect(() => {
    if (!editingMessageId) return;

    const message = useMessengerStore.getState().messages[editingMessageId];
    if (message) {
      setText(message.text);
      setAttachments([]);
      textareaRef.current?.focus();
    }
  }, [editingMessageId]);

  useEffect(() => {
    if (replyToMessageId) {
      textareaRef.current?.focus();
    }
  }, [replyToMessageId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: textarea height must recalculate when text changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [text]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      void client.request('sendTyping', { conversationId, isTyping }).catch(() => {
        // Ignore transport errors for typing indicators.
      });
    },
    [client, conversationId],
  );

  const updateTyping = useCallback(() => {
    if (typingRef.current.timeout) {
      clearTimeout(typingRef.current.timeout);
    }

    if (!typingRef.current.isTyping) {
      typingRef.current.isTyping = true;
      sendTyping(true);
    }

    typingRef.current.timeout = setTimeout(() => {
      typingRef.current.isTyping = false;
      sendTyping(false);
    }, TYPING_TIMEOUT_MS);
  }, [sendTyping]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setText(event.target.value);
    updateTyping();
  };

  const clearComposer = useCallback((): void => {
    setText('');
    setAttachments([]);
    setReplyToMessageId(null);
    stopEditing();
  }, [setReplyToMessageId, stopEditing]);

  const handleSend = useCallback(async (): Promise<void> => {
    const trimmed = text.trim();
    if (trimmed.length === 0 && attachments.length === 0) return;

    if (editingMessage) {
      const optimisticText = trimmed;
      editMessage(editingMessage.id, optimisticText);
      clearComposer();

      try {
        await client.request('editMessage', { messageId: editingMessage.id, text: optimisticText });
        setMessageStatus(editingMessage.id, 'sent');
      } catch {
        setMessageStatus(editingMessage.id, 'failed');
      }
      return;
    }

    const draftAttachments = attachments.map(mapAttachmentToDraft);
    const messageId = sendMessage({
      conversationId,
      text: trimmed,
      replyToId: replyToMessageId ?? undefined,
      attachments,
    });
    clearComposer();

    try {
      await client.request('sendMessage', {
        conversationId,
        text: trimmed,
        replyToId: replyToMessageId ?? undefined,
        attachments: draftAttachments,
      });
      setMessageStatus(messageId, 'sent');
    } catch {
      setMessageStatus(messageId, 'failed');
    }
  }, [
    text,
    attachments,
    editingMessage,
    replyToMessageId,
    conversationId,
    client,
    sendMessage,
    editMessage,
    setMessageStatus,
    clearComposer,
  ]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      clearComposer();
    }
  };

  const addAttachments = useCallback((files: FileList | null): void => {
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? '');
        const attachment: Attachment = {
          id: generateUuid(),
          type: getAttachmentType(file.type),
          url: dataUrl,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          createdAt: new Date().toISOString(),
        };
        setAttachments((previous) => [...previous, attachment]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    if (event.clipboardData.files.length > 0) {
      event.preventDefault();
      addAttachments(event.clipboardData.files);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    addAttachments(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string): void => {
    setAttachments((previous) => previous.filter((attachment) => attachment.id !== id));
  };

  const canSend = text.trim().length > 0 || attachments.length > 0;

  return (
    <div className="border-t bg-card p-3">
      {editingMessage && (
        <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs">
          <span className="text-muted-foreground">Editing message</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={stopEditing}
            aria-label="Cancel editing"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {replyToMessage && !editingMessage && (
        <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs">
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">Replying to message</span>
            <span className="truncate text-muted-foreground">
              {replyToMessage.text || 'Attachment'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => setReplyToMessageId(null)}
            aria-label="Cancel reply"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={() => removeAttachment(attachment.id)}
            />
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFileChange}
          data-testid="attachment-input"
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={editingMessage ? 'Edit your message…' : 'Type a message…'}
          rows={1}
          className="max-h-32 min-h-[2.25rem] flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Message input"
        />

        <Button
          onClick={() => void handleSend()}
          disabled={!canSend}
          size="icon"
          className="shrink-0"
          aria-label={editingMessage ? 'Save edit' : 'Send message'}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
