import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Glossary } from '@/components/comparison/Glossary';
import { Layout } from '@/components/layout/Layout';

export function GlossaryPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Financial Glossary</h1>
          <p className="text-gray-600 mt-2">Understand the terms used in car financing</p>
        </div>
        <Card>
          <CardContent className="pt-0">
            <Glossary />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
