import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <h1 className="text-9xl font-serif font-bold text-primary mb-4">404</h1>
        <h2 className="text-3xl font-serif font-bold mb-2">Stránka nebyla nalezena</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Omlouváme se, ale stránka, kterou hledáte, neexistuje nebo byla přesunuta.
        </p>
        <Link href="/">
          <Button className="bg-gradient-to-r from-primary to-purple-600">
            <Home className="w-4 h-4 mr-2" />
            Zpět na domovskou stránku
          </Button>
        </Link>
      </div>
    </div>
  );
}
