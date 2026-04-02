# Fakturace - postup a pravidla

## Zákonný rámec

Systém respektuje:
- Zákon č. 235/2004 Sb. o DPH
- Zákon č. 563/1991 Sb. o účetnictví
- Zákon č. 89/2012 Sb. občanský zákoník (fakturační náležitosti)

---

## Typy dokladů

| Typ | Kód | Daňový doklad? | Číselná řada | Popis |
|-----|-----|----------------|--------------|-------|
| Zálohová faktura | `DEPOSIT` | NE (proforma) | FGZ... | Výzva k úhradě zálohy |
| Ostrá faktura | `FINAL` | ANO | FG... | Vyúčtovací faktura - daňový doklad |
| Částečná faktura | `PARTIAL` | ANO | FG... | Dílčí faktura |
| Dobropis | `CREDIT_NOTE` | ANO (opravný) | D-FG... | Opravný daňový doklad dle §45 |

---

## Postup fakturace se zálohou

### Krok 1: Vystavení zálohové faktury (proforma)

**Co udělat:** Faktura → Nová faktura z rezervace → Vytvořit zálohovou fakturu

- Systém vytvoří **zálohovou fakturu** s typem `DEPOSIT`
- Výchozí záloha = 25% z celkové ceny (nastavitelné)
- Obsahuje QR kód pro platbu
- **Důležité:** Toto NENÍ daňový doklad. Na PDF je upozornění:
  > *"Toto není daňový doklad. Daňový doklad k přijaté platbě bude vystaven po úhradě zálohy dle §28 odst. 9 zákona o DPH."*
- Odešlete zákazníkovi (tlačítko Odeslat)

### Krok 2: Zákazník zaplatí zálohu

**Co udělat:** V seznamu faktur → tlačítko ✓ (Označit jako zaplaceno)

- Systém zaznamená datum platby
- Aktualizuje stav rezervace (částečně zaplaceno)
- **Dle zákona:** Po přijetí platby máte povinnost vystavit daňový doklad k přijaté záloze do 15 dnů. V současné verzi systému se toto řeší automaticky tím, že zaplacená zálohová faktura slouží jako podklad.

### Krok 3: Proběhne akce/služba

Služba je poskytnuta zákazníkovi.

### Krok 4: Vystavení vyúčtovací (ostré) faktury

**Co udělat:** Faktura → Nová faktura z rezervace → Vytvořit vyúčtovací fakturu

Systém automaticky:
1. Vytvoří fakturu typu `FINAL` - **daňový doklad**
2. Uvede **všechny položky za plnou cenu** (osoby, menu, transfer)
3. Přidá řádku **"Odpočet uhrazené zálohy"** s odkazem na číslo a datum zálohového dokladu
4. Správně vypočítá DPH:
   - Základ = plná cena služeb − záloha (základ bez DPH)
   - DPH = z výsledného základu
5. V poznámce uvede kompletní rozúčtování:
   - Celková cena služeb
   - Uhrazená záloha (základ + DPH zvlášť)
   - Částka k doplacení
   - Reference na zálohové doklady

**Příklad vyúčtovací faktury:**

```
Položky:
  Rezervace 15.03.2026 - Dospělý (Traditional)    × 10    1 250,00 Kč    12 500,00 Kč
  Rezervace 15.03.2026 - Dítě (Children menu)      × 2      800,00 Kč     1 600,00 Kč
  Transfer (2× osoba)                               × 2      200,00 Kč       400,00 Kč
  Odpočet uhrazené zálohy (dle DD č. FGZ2026000001
    ze dne 01.03.2026)                               × 1   -3 625,00 Kč    -3 625,00 Kč

  Základ:     10 875,00 Kč
  DPH 12%:     1 305,00 Kč
  Celkem:     12 180,00 Kč
```

---

## Postup fakturace BEZ zálohy

1. Služba proběhne
2. Vystavíte ostrou fakturu (`FINAL`) přímo z rezervace
3. Obsahuje všechny položky, DPH, QR kód
4. Odešlete zákazníkovi

---

## Storno a dobropisy

### Kdy použít storno:
- Faktura byla odeslána ale služba se neuskuteční
- Chybně vystavená faktura
- Zákazník reklamuje / vrací peníze

### Postup:
1. V seznamu faktur → u odeslané/zaplacené faktury → tlačítko **"Vystavit dobropis"**
2. Systém automaticky:
   - Vytvoří **opravný daňový doklad** (dobropis) s negativními částkami
   - Přiřadí číslo z řady `D-FG...`
   - Odkáže na původní fakturu
   - Označí původní fakturu jako CANCELLED
3. Na PDF dobropisu je upozornění:
   > *"Opravný daňový doklad dle §45 zákona č. 235/2004 Sb."*

### Pravidla:
- **DRAFT** faktury → lze smazat (ještě nebyly odeslány)
- **SENT** faktury → nelze smazat, pouze stornovat (vystavit dobropis)
- **PAID** faktury → nelze smazat, pouze stornovat
- **CANCELLED** faktury → lze smazat (jsou neplatné)

---

## Editace faktur

| Stav | Co lze měnit | Důvod |
|------|-------------|-------|
| DRAFT | Vše | Koncept, ještě nebyl odeslán |
| SENT | Pouze poznámku | Odeslaný doklad nelze měnit dle zákona o účetnictví |
| PAID | Nic | Zaplacený doklad je finální |
| CANCELLED | Nic | Stornovaný doklad je archivní |

---

## Pravidla číslování

- Faktury musí mít **nepřerušenou číselnou řadu** (zákonný požadavek)
- Systém generuje čísla automaticky:
  - Ostré faktury: `FG{ROK}{ŠESTIMÍSTNÉ_ČÍSLO}` (např. FG2026000001)
  - Zálohové faktury: `FGZ{ROK}{ŠESTIMÍSTNÉ_ČÍSLO}` (např. FGZ2026000001)
  - Dobropisy: `D-FG{ROK}{ŠESTIMÍSTNÉ_ČÍSLO}` (např. D-FG2026000001)
- Čísla se NESMÍ přeskakovat - smazání DRAFT faktury je v pořádku (nebyla vydána)

---

## DPH (VAT)

### Sazby:
- **21%** - standardní sazba
- **12%** - snížená sazba (stravovací služby)
- **0%** - osvobozeno od DPH

### Na faktuře musí být (§29 zákona o DPH):
- Označení "Daňový doklad" (u FINAL/PARTIAL)
- IČO a DIČ dodavatele
- IČO a DIČ odběratele (pokud je plátce DPH)
- Datum vystavení
- DUZP (datum uskutečnění zdanitelného plnění)
- Evidenční číslo dokladu
- Popis plnění
- Základ daně, sazba DPH, výše DPH
- Celková částka

### Rekapitulace DPH:
- Na PDF se zobrazuje tabulka rekapitulace DPH (sazba, základ, DPH, celkem)
- Zobrazuje se pouze pokud DPH > 0%

---

## API Endpointy

### Vytváření faktur z rezervace

| Endpoint | Popis |
|----------|-------|
| `POST /api/invoices/create-deposit/{reservationId}` | Zálohovka (params: percent, customAmount) |
| `POST /api/invoices/create-final/{reservationId}` | Vyúčtovací (params: deductDeposit) |
| `GET /api/invoices/preview-deposit/{reservationId}` | Náhled zálohové faktury |
| `GET /api/invoices/preview-final/{reservationId}` | Náhled vyúčtovací faktury |

### Správa faktur

| Endpoint | Popis |
|----------|-------|
| `POST /api/invoices/{id}/send` | Označit jako odeslanou |
| `POST /api/invoices/{id}/send-email` | Odeslat emailem zákazníkovi |
| `POST /api/invoices/{id}/pay` | Označit jako zaplacenou |
| `POST /api/invoices/{id}/cancel` | Stornovat |
| `POST /api/invoices/{id}/credit-note` | Vystavit dobropis |
| `GET /api/invoices/{id}/pdf` | Stáhnout PDF |

### Hromadné akce

| Endpoint | Popis | Oprávnění |
|----------|-------|-----------|
| `PUT /api/invoices/bulk-update` | Hromadná změna statusu | invoices.update |
| `DELETE /api/invoices/bulk-delete` | Hromadné mazání (jen DRAFT/CANCELLED) | invoices.delete |
| `POST /api/invoices/bulk-pdf` | Export PDF do ZIPu | invoices.read |

---

## Vyhledávání firem

Systém podporuje dva zdroje pro dohledání údajů odběratele:

| Zdroj | Kdy se použije | Co vrací |
|-------|----------------|----------|
| **ARES** (CZ) | IČO nebo název české firmy | Název, IČO, DIČ, adresa, právní forma, zápis v OR |
| **VIES** (EU) | EU DIČ (např. SK2020123456) | Validace DIČ, název, adresa |

Detekce je automatická:
- Zadáte číslo → ARES (IČO)
- Zadáte text → ARES (název)
- Zadáte 2 písmena + čísla → VIES (EU DIČ)
