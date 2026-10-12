import { Link } from 'react-router-dom';
import { Code2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="container-main py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Préstamos Familia</h3>
            <p className="text-sm text-gray-600">
              Herramienta para entender el coste real de financiar una compra
              antes de firmar.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Enlaces</h3>
            <nav className="space-y-1 text-sm">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 block">Mis compras</Link>
              <Link to="/comparisons" className="text-gray-600 hover:text-gray-900 block">Mis comparativas</Link>
              <Link to="/glossary" className="text-gray-600 hover:text-gray-900 block">Glosario financiero</Link>
            </nav>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Código</h3>
            <a
              href="https://github.com/att-22/prestamos-familia"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Code2 className="h-5 w-5" aria-hidden="true" />
              Ver en GitHub
            </a>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>No es asesoramiento financiero. Consulta a un profesional.</p>
        </div>
      </div>
    </footer>
  );
}
