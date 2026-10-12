import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

// Separación mínima con el elemento y con los bordes de la ventana
const MARGIN = 8;

export function Tooltip({ content, children }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [container, setContainer] = useState<Element | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Se pinta fuera de su contenedor, con posición fija, para que ningún overflow lo
  // recorte, y se ajusta a la ventana.
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();

    const centered = trigger.left + trigger.width / 2 - tooltip.width / 2;
    const left = Math.max(MARGIN, Math.min(centered, window.innerWidth - tooltip.width - MARGIN));
    const above = trigger.top - tooltip.height - MARGIN;
    const top = above >= MARGIN ? above : trigger.bottom + MARGIN;

    setCoords({ top, left });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    const closeIfOutside = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node)) close();
    };
    // La posición es fija: si se hace scroll, dejaría de estar junto al elemento
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('pointerdown', closeIfOutside);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('pointerdown', closeIfOutside);
    };
  }, [isOpen]);

  const open = () => {
    // Dentro de un modal va en el propio <dialog>: lo que queda fuera está debajo de la capa superior
    setContainer(triggerRef.current?.closest('dialog') ?? document.body);
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    setCoords(null);
  };

  return (
    <span
      ref={triggerRef}
      className="inline-flex"
      tabIndex={0}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
      onClick={open}
    >
      {children}
      {isOpen && container && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className="fixed z-[60] max-w-xs px-3 py-2 text-sm font-normal text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none"
          style={{
            top: coords?.top ?? 0,
            left: coords?.left ?? 0,
            // Oculto hasta medirlo, para que no parpadee en la esquina
            visibility: coords ? 'visible' : 'hidden',
          }}
        >
          {content}
        </div>,
        container
      )}
    </span>
  );
}

interface InfoTooltipProps {
  label: string;
  content: ReactNode;
}

export function InfoTooltip({ label, content }: InfoTooltipProps) {
  return (
    <Tooltip content={content}>
      <span className="flex items-center gap-1">
        {label}
        <Info className="h-4 w-4 text-gray-400 cursor-help" aria-hidden="true" />
      </span>
    </Tooltip>
  );
}
