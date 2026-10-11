import { Link } from 'react-router-dom';
import { Heart, Github, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="container-main py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Préstamos Familia</h3>
            <p className="text-sm text-gray-600">
              Herramienta para entender el coste real de financiar un coche.
              Hecha con cariño para que nadie firme sin entender lo que paga.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Enlaces</h3>
            <nav className="space-y-1 text-sm">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 block">Mis vehículos</Link>
              <Link to="/comparisons" className="text-gray-600 hover:text-gray-900 block">Mis comparativas</Link>
              <Link to="/glossary" className="text-gray-600 hover:text-gray-900 block">Glosario financiero</Link>
            </nav>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Contacto</h3>
            <div className="flex gap-4 text-gray-400 hover:text-gray-600">
              <a href="https://github.com" target="_blank" rel="noopener" aria-label="GitHub">
                <Github className="h-5 w-5" />
              </a>
              <a href="mailto:" aria-label="Email">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Hecho con <Heart className="inline text-danger-500" aria-hidden="true" /> para la familia</p>
          <p className="mt-1">No es asesoramiento financiero. Consulta a un profesional.</p>
        </div>
      </div>
    </footer>
  );
}
