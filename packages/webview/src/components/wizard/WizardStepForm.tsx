import { type ChangeEvent, type FormEvent, type JSX, useState } from 'react';
import type { WizardField, WizardStep } from '../../../../extension/src/shared/messages';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export interface WizardStepFormProps {
  step: WizardStep;
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function WizardStepForm({
  step,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
}: WizardStepFormProps): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of step.fields) {
      initial[field.name] = field.value ?? '';
    }
    return initial;
  });

  const handleChange =
    (field: WizardField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      setValues((prev) => ({ ...prev, [field.name]: event.target.value }));
    };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{step.title}</h3>
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </div>

      <div className="space-y-3">
        {step.fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label htmlFor={field.name} className="text-sm font-medium leading-none">
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                id={field.name}
                value={values[field.name] ?? ''}
                onChange={handleChange(field)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'qr' ? (
              <div className="flex aspect-square w-full max-w-[200px] items-center justify-center rounded-md border bg-muted">
                <span className="text-center text-xs text-muted-foreground">{field.value}</span>
              </div>
            ) : (
              <Input
                id={field.name}
                type={field.type === 'password' ? 'password' : 'text'}
                placeholder={field.placeholder}
                value={values[field.name] ?? ''}
                onChange={handleChange(field)}
                disabled={field.type === 'static'}
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Working…' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
