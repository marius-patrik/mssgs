import { ArrowLeft, Check, Copy, ExternalLink, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { type JSX, useState } from 'react';
import type { SetupServiceType } from '../../../../extension/src/shared/messages';
import { cn } from '../../lib/utils';
import type { MessengerClient } from '../../messaging/client';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { WIZARD_SERVICE_REGISTRY, getWizardServiceMeta } from './serviceRegistry';
import { useAccountWizard } from './useAccountWizard';

export interface AccountWizardProps {
  client: MessengerClient;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function ServiceOption({
  service,
  onSelect,
}: {
  service: SetupServiceType;
  onSelect: (service: SetupServiceType) => void;
}): JSX.Element {
  const meta = getWizardServiceMeta(service);

  return (
    <button
      type="button"
      onClick={() => onSelect(service)}
      className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          meta.bgClass,
        )}
      >
        <meta.Icon className={cn('h-5 w-5', meta.colorClass)} />
      </span>
      <div className="flex flex-col">
        <span className="font-medium">{meta.label}</span>
        <span className="text-xs text-muted-foreground">{meta.description}</span>
      </div>
    </button>
  );
}

function QrStep({ data }: { data: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex h-40 w-40 items-center justify-center rounded-lg border bg-white p-3">
        <QrCode className="h-28 w-28 text-foreground" />
      </div>
      <code className="max-w-full truncate rounded bg-muted px-2 py-1 text-xs">{data}</code>
    </div>
  );
}

function LinkStep({ url }: { url: string }): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 py-4">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        {url}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  );
}

function InputStep({
  label,
  onSubmit,
  isLoading,
}: {
  label: string;
  onSubmit: (value: string) => void;
  isLoading: boolean;
}): JSX.Element {
  const [value, setValue] = useState('');

  return (
    <form
      className="flex flex-col gap-3 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <label htmlFor="setup-code" className="text-sm font-medium">
        {label}
      </label>
      <Input
        id="setup-code"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Enter code…"
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || !value.trim()}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Complete setup
      </Button>
    </form>
  );
}

export function AccountWizard({ client, open, onOpenChange }: AccountWizardProps): JSX.Element {
  const wizard = useAccountWizard(client, { open, onOpenChange });

  return (
    <Dialog
      open={wizard.isOpen}
      onOpenChange={(next: boolean) => (next ? wizard.open() : wizard.cancel())}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{wizard.selectedService ? 'Set up account' : 'Add account'}</DialogTitle>
          <DialogDescription>
            {wizard.selectedService
              ? getWizardServiceMeta(wizard.selectedService).description
              : 'Choose a messaging service to connect.'}
          </DialogDescription>
        </DialogHeader>

        {wizard.error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {wizard.error}
          </div>
        )}

        {!wizard.selectedService && (
          <div className="grid gap-3 py-2">
            {(Object.keys(WIZARD_SERVICE_REGISTRY) as SetupServiceType[]).map((service) => (
              <ServiceOption key={service} service={service} onSelect={wizard.selectService} />
            ))}
          </div>
        )}

        {wizard.selectedService && wizard.isLoading && !wizard.setup && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {wizard.selectedService && wizard.setup && (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">{wizard.setup.instructions}</p>

            {wizard.setup.status === 'qr' && wizard.setup.qrData && (
              <QrStep data={wizard.setup.qrData} />
            )}
            {wizard.setup.status === 'link' && wizard.setup.link && (
              <LinkStep url={wizard.setup.link} />
            )}
            {wizard.setup.status === 'awaiting_input' && (
              <InputStep
                label="Confirmation code"
                onSubmit={wizard.complete}
                isLoading={wizard.isLoading}
              />
            )}
            {wizard.setup.status === 'done' && (
              <div className="flex items-center gap-2 py-4 text-sm font-medium text-primary">
                <Check className="h-4 w-4" />
                Account connected successfully.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {wizard.selectedService ? (
            <>
              <Button variant="ghost" size="sm" onClick={wizard.reset} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={wizard.cancel}
                disabled={wizard.isLoading}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={wizard.cancel}>
              Close
            </Button>
          )}

          {wizard.setup?.status === 'qr' && (
            <Button
              size="sm"
              variant="secondary"
              disabled={wizard.isLoading}
              onClick={() => {
                if (wizard.setup && wizard.selectedService) {
                  void wizard.selectService(wizard.selectedService);
                }
              }}
              className="gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
