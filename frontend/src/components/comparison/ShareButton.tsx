import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ShareButtonProps {
  slug: string;
  purchaseName: string;
}

export function ShareButton({ slug, purchaseName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/c/${slug}`;
  const canShare = typeof navigator.share === 'function';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el enlace queda visible para copiarlo a mano
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: `Comparativa: ${purchaseName}`, url });
    } catch {
      // El usuario canceló el diálogo de compartir
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input
        readOnly
        value={url}
        aria-label="Enlace para compartir"
        onFocus={e => e.target.select()}
        className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
      />
      <Button variant="outline" onClick={handleCopy}>
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? 'Copiado' : 'Copiar enlace'}
      </Button>
      {canShare && (
        <Button onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </Button>
      )}
    </div>
  );
}
