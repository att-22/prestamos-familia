import { useEffect, useRef, type DialogHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/helpers';

interface ModalProps extends DialogHTMLAttributes<HTMLDialogElement> {
  onClose: () => void;
  /** Cerrar también al pulsar fuera. En un formulario no conviene: se pierde lo escrito por un clic sin querer. */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}

/**
 * Ventana modal sobre el <dialog> nativo: el navegador se encarga de retener el foco
 * dentro, de dejar inerte el resto de la página y de cerrar con Escape.
 */
export function Modal({ onClose, dismissOnBackdrop = false, className, children, ...props }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Al cerrarse, React ya ha quitado el <dialog> de la página y el navegador no sabe
    // a quién devolver el foco: se guarda quién lo tenía para devolvérselo a mano.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    // El <dialog> no impide que la página de debajo se desplace
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog.close();
      opener?.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={ref}
      // Escape: se cierra desde el estado de React, no por su cuenta
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      // El fondo es el propio <dialog>: su contenido lo tapa entero
      onMouseDown={event => {
        if (dismissOnBackdrop && event.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/50',
        className,
      )}
      {...props}
    >
      {children}
    </dialog>,
    document.body,
  );
}
