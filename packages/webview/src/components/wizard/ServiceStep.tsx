import type { JSX } from 'react';
import type { SetupServiceType } from '../../../../extension/src/shared/messages';
import { getServiceTheme } from '../../lib/services';
import { Button } from '../ui/button';

interface ServiceStepProps {
  onSelect: (service: SetupServiceType) => void;
}

const SERVICES: SetupServiceType[] = ['whatsapp', 'telegram', 'instagram', 'imessage'];

export function ServiceStep({ onSelect }: ServiceStepProps): JSX.Element {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose a messaging service to connect. Each service uses its own bridge to keep your
        conversations in one place.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {SERVICES.map((service) => {
          const theme = getServiceTheme(service);
          return (
            <Button
              key={service}
              variant="outline"
              className="h-auto justify-start gap-3 px-4 py-3"
              onClick={() => onSelect(service)}
              aria-label={`Connect ${theme.displayName}`}
            >
              <span
                className={`h-3 w-3 rounded-full ${theme.backgroundColor}`}
                aria-hidden="true"
              />
              <span className="font-medium">{theme.displayName}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
