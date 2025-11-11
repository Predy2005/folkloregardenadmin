# Nastavení Environment Variables

## Pro lokální vývoj (Development)

1. Vytvořte soubor `.env` v kořenovém adresáři projektu:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Pro produkční prostředí (Production)

1. Vytvořte soubor `.env.production` v kořenovém adresáři projektu:
```bash
VITE_API_BASE_URL=https://api.folkloregarden.cz
```

## Alternativa: Replit Secrets

V Replit můžete nastavit environment variables přes Secrets panel:

1. Otevřete záložku "Secrets" (ikona zámku v levém menu)
2. Přidejte nový secret:
   - Key: `VITE_API_BASE_URL`
   - Value: 
     - Pro development: `http://localhost:8000`
     - Pro production: `https://api.folkloregarden.cz`

## Přepínání mezi prostředími

- **Development**: Aplikace automaticky použije hodnotu z `.env` nebo defaultně `http://localhost:8000`
- **Production**: Při buildu pro produkci použije hodnotu z `.env.production`

## Poznámky

- Soubory `.env` jsou v `.gitignore` a nebudou commitovány do Git
- Pro reference jsou připraveny soubory `.env.example` a `.env.production.example`
- Prefix `VITE_` je nutný pro Vite, aby environment variable byla dostupná ve frontendové aplikaci
