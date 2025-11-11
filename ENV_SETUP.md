# Nastavení Environment Variables

## Přehled

Aplikace používá **externí Symfony API** které běží na `https://api.folkloregarden.cz`. Frontend komunikuje s tímto API pomocí Axios.

## Pro lokální vývoj (Development)

### Varianta 1: Použití produkčního API (doporučeno pro frontend vývoj)

Vytvořte soubor `.env` v kořenovém adresáři projektu:
```bash
VITE_API_BASE_URL=https://api.folkloregarden.cz
```

### Varianta 2: Použití lokálního Symfony API

Pokud běží Symfony API lokálně na portu 8000, vytvořte soubor `.env`:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

**Poznámka**: Pro spuštění lokálního Symfony API viz dokumentaci v `attached_assets/readme_*.md`

## Pro produkční prostředí (Production)

Vytvořte soubor `.env.production` v kořenovém adresáři projektu:
```bash
VITE_API_BASE_URL=https://api.folkloregarden.cz
```

## Alternativa: Replit Secrets

V Replit můžete nastavit environment variables přes Secrets panel:

1. Otevřete záložku "Secrets" (ikona zámku v levém menu)
2. Přidejte nový secret:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: 
     - Pro produkční API: `https://api.folkloregarden.cz`
     - Pro lokální Symfony API: `http://localhost:8000`

## Výchozí chování

Pokud **není nastavena** environment variable `VITE_API_BASE_URL`, aplikace automaticky používá produkční API: `https://api.folkloregarden.cz`

## Poznámky

- Soubory `.env` jsou v `.gitignore` a nebudou commitovány do Git
- Pro reference jsou připraveny soubory `.env.example` a `.env.production.example`
- Prefix `VITE_` je nutný pro Vite, aby environment variable byla dostupná ve frontendové aplikaci
- Express server v této Replit instanci NEMÁ implementované API endpointy - používá se pouze pro serving frontend aplikace
- Všechny API requesty jdou na externí Symfony backend
