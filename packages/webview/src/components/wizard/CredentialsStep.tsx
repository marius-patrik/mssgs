import type { JSX } from 'react';
import { useState } from 'react';
import type { SetupServiceType } from '../../../../extension/src/shared/messages';
import { getServiceTheme } from '../../lib/services';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface CredentialsStepProps {
  service: SetupServiceType;
  instruction?: string;
  onSubmit: (credentials: Record<string, string>) => void;
  onCancel: () => void;
}

export function CredentialsStep({
  service,
  instruction,
  onSubmit,
  onCancel,
}: CredentialsStepProps): JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const theme = getServiceTheme(service);

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    onSubmit({ username, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {instruction ?? `Enter your ${theme.displayName} credentials.`}
      </p>
      <div className="space-y-3">
        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-label="Username"
          autoComplete="off"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-label="Password"
          autoComplete="off"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Continue
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
