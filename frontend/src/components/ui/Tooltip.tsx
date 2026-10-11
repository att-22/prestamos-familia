import { ReactNode, useState } from 'react';
import { cn } from '@/utils/helpers';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  
  const arrows = {
    top: 'border-t-gray-900 bottom-[-4px] left-1/2 -translate-x-1/2',
    bottom: 'border-b-gray-900 top-[-4px] left-1/2 -translate-x-1/2',
    left: 'border-l-gray-900 right-[-4px] top-1/2 -translate-y-1/2',
    right: 'border-r-gray-900 left-[-4px] top-1/2 -translate-y-1/2',
  };

  return (
    <div className="relative inline-flex" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      {children}
      {isOpen && (
        <div className={cn('fixed z-50', positions[position])}>
          <div className="max-w-xs px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg">
            {content}
          </div>
          <div className={cn('absolute w-0 h-0 border-2 border-transparent', arrows[position])} />
        </div>
      )}
    </div>
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
