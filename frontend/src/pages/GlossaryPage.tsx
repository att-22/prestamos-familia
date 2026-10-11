import { Card, CardContent } from '@/components/ui/Card';
import { Glossary } from '@/components/comparison/Glossary';

export function GlossaryPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Glosario financiero</h1>
        <p className="text-gray-600 mt-2">Las palabras que vas a oír en el banco y en el concesionario, explicadas sin jerga</p>
      </div>
      <Card>
        <CardContent className="pt-0">
          <Glossary />
        </CardContent>
      </Card>
    </div>
  );
}
