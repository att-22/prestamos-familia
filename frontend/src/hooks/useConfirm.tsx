import { createContext, useCallback, useContext, useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Para lo que no se puede deshacer: el botón de confirmar va en rojo */
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | undefined>(undefined);

/** Sustituye a window.confirm() por un diálogo de la aplicación, accesible y con su mismo aspecto. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (confirmed: boolean) => void } | null>(null);
  const titleId = useId();
  const messageId = useId();

  const confirm = useCallback<Confirm>(
    options => new Promise(resolve => setPending({ options, resolve })),
    [],
  );

  const settle = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <Modal
          role="alertdialog"
          aria-labelledby={titleId}
          aria-describedby={pending.options.message ? messageId : undefined}
          onClose={() => settle(false)}
          dismissOnBackdrop
          className="max-w-md"
        >
          <div className="space-y-4 p-6">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">{pending.options.title}</h2>
            {pending.options.message && (
              <p id={messageId} className="text-sm text-gray-600">{pending.options.message}</p>
            )}
            {/* Cancelar va primero: es lo que recibe el foco al abrirse */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => settle(false)}>Cancelar</Button>
              <Button variant={pending.options.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
                {pending.options.confirmLabel ?? 'Aceptar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  }
  return confirm;
}
