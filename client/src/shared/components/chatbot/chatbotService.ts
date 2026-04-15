import { api } from "@/shared/lib/api";
import axios from "axios";

// ─── AI server config ───────────────────────────────────────────────
interface AiServer {
  endpoint: string;
  apiKey: string;
  model: string;
  priority: number;
}

const AI_SERVERS: AiServer[] = [
  {
    endpoint: "https://ai1.ai-servis.online",
    apiKey: "sk-lm-y4kZpbN3:mQJmOGnRCFFxPGlMiZNF",
    model: "google/gemma-3-4b",
    priority: 1,
  },
  {
    endpoint: "https://ai2.ai-servis.online",
    apiKey: "sk-lm-RWjTUYjr:6SG1lQK5XJYzN1wgAPyD",
    model: "openai/gpt-oss-20b-lora",
    priority: 2,
  },
].sort((a, b) => a.priority - b.priority);

// ─── Cached axios clients ─────────────────────────────────────────────
const aiClients = new Map<string, ReturnType<typeof axios.create>>();

function getAiClient(server: AiServer) {
  let c = aiClients.get(server.endpoint);
  if (!c) {
    c = axios.create({
      baseURL: server.endpoint,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${server.apiKey}`,
      },
      timeout: 45_000,
    });
    aiClients.set(server.endpoint, c);
  }
  return c;
}

// ─── Chat types ───────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  links?: ChatLink[];
}

export interface ChatLink {
  label: string;
  url: string;
  meta?: string;
}

// ─── RAG: Data fetching from system API ──────────────────────────────

interface RagResult {
  context: string;
  links: ChatLink[];
}

// ─── RAG entity types (minimal shapes for search/display) ───────────
interface RagReservation {
  id: number;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  invoiceCompany?: string | null;
  status?: string | null;
  date?: string | null;
  contactNote?: string | null;
  persons?: unknown[];
}

interface RagEvent {
  id: number;
  name?: string | null;
  eventType?: string | null;
  eventDate?: string | null;
  status?: string | null;
  organizerPerson?: string | null;
  notesInternal?: string | null;
  guestsTotal?: number | null;
}

interface RagContact {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
}

interface RagStaffMember {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  isGroup?: boolean;
  isActive?: boolean;
}

interface RagPartner {
  id: number;
  name?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  partnerType?: string | null;
  ic?: string | null;
  isActive?: boolean;
}

interface RagInvoice {
  id: number;
  invoiceNumber?: string | null;
  status?: string | null;
  customer?: { name?: string | null; company?: string | null; ico?: string | null } | null;
  issueDate?: string | null;
  total?: number | null;
  currency?: string | null;
}

interface RagPayment {
  id: number;
  transactionId?: string | null;
  amount?: number | null;
  status?: string | null;
  reservation?: { contactName?: string | null } | null;
  createdAt?: string | null;
}

// Keywords that trigger data search per entity type
const SEARCH_TRIGGERS = {
  reservations: [
    "rezervac",
    "reservation",
    "booking",
    "objednáv",
    "objednavk",
  ],
  events: ["akc", "event", "svatb", "show", "folklorní", "folklorni", "privát", "privat"],
  contacts: [
    "kontakt",
    "contact",
    "adresář",
    "adresar",
    "zákazník",
    "zakaznik",
    "klient",
  ],
  staff: [
    "zaměstnan",
    "zamestnan",
    "personál",
    "personal",
    "pracovník",
    "pracovnik",
    "číšník",
    "cisnik",
    "kuchař",
    "kuchar",
  ],
  partners: ["partner", "hotel", "recepce", "distributor", "agentur"],
  invoices: ["faktur", "invoice", "účet", "ucet"],
  payments: ["platb", "payment", "comgate", "transakc"],
};

// Detect which entity types the user is asking about + extract search terms
export function detectSearchIntent(text: string): {
  entities: (keyof typeof SEARCH_TRIGGERS)[];
  searchTerms: string[];
} {
  const lower = text.toLowerCase();
  const entities: (keyof typeof SEARCH_TRIGGERS)[] = [];

  // Must contain action words that imply searching for specific data
  const actionWords = [
    "najdi",
    "najít",
    "hledej",
    "hledat",
    "vyhledej",
    "vyhledat",
    "kde je",
    "kde najdu",
    "kde mám",
    "kde mam",
    "ukaž",
    "ukaz",
    "zobraz",
    "kolik",
    "jaké",
    "jake",
    "které",
    "ktere",
    "seznam",
    "list",
    "přehled",
    "prehled",
    "najdeš",
    "najdes",
    "dohledej",
    "dohledat",
    "kdo",
    "jaký",
    "jaky",
    "máme",
    "mame",
    "existuje",
    "info o",
    "informace o",
    "detail",
    "stav",
  ];

  const hasAction = actionWords.some((w) => lower.includes(w));

  // Also trigger on patterns like "rezervace Novák", "akce svatba" where a name follows entity keyword
  const hasSpecificSearch =
    /(?:rezervac|akc|kontakt|faktur|partner|zaměstnan|zamestnan|personál|personal)\w*\s+\w{2,}/i.test(
      text
    );

  if (!hasAction && !hasSpecificSearch) return { entities: [], searchTerms: [] };

  for (const [entity, keywords] of Object.entries(SEARCH_TRIGGERS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      entities.push(entity as keyof typeof SEARCH_TRIGGERS);
    }
  }

  // Extract potential search terms (words that aren't common Czech words or action words)
  const stopWords = new Set([
    "najdi", "najít", "hledej", "hledat", "vyhledej", "kde", "je", "mi",
    "mám", "mam", "ukaž", "ukaz", "zobraz", "kolik", "jaké", "jake", "které",
    "ktere", "seznam", "přehled", "prehled", "dohledej", "dohledat", "kdo",
    "jaký", "jaky", "máme", "mame", "existuje", "info", "informace", "detail",
    "stav", "prosím", "prosim", "chci", "potřebuji", "potrebuji", "the",
    "a", "na", "v", "ve", "s", "se", "o", "do", "pro", "z", "ze", "k",
    "ke", "po", "to", "ten", "ta", "ti", "ty", "tohle", "toto", "všechny",
    "vsechny", "všech", "vsech", "nějaké", "nejake", "nějak", "nejak",
    "rezervac", "rezervace", "rezervaci", "rezervací", "akc", "akce", "akci",
    "akcí", "kontakt", "kontakty", "kontaktů", "faktur", "faktury", "faktuře",
    "partner", "partneři", "partnera", "zaměstnan", "zaměstnance", "personál",
    "platb", "platby", "platbu",
  ]);

  const searchTerms = text
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()))
    .map((w) => w.replace(/[.,!?;:()]/g, ""))
    .filter((w) => w.length > 1);

  return { entities, searchTerms };
}

// Fetch data from API and build RAG context
export async function fetchRagContext(
  entities: (keyof typeof SEARCH_TRIGGERS)[],
  searchTerms: string[]
): Promise<RagResult> {
  const links: ChatLink[] = [];
  const contextParts: string[] = [];
  const searchLower = searchTerms.map((t) => t.toLowerCase());

  const matchesSearch = (fields: (string | null | undefined)[]) => {
    if (searchLower.length === 0) return true;
    const joined = fields
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchLower.some((term) => joined.includes(term));
  };

  try {
    // Fetch in parallel
    const fetches: Promise<void>[] = [];

    if (entities.includes("reservations")) {
      fetches.push(
        api
          .get<RagReservation[]>("/api/reservations")
          .then((data) => {
            const filtered = data
              .filter((r) =>
                matchesSearch([
                  r.contactName,
                  r.contactEmail,
                  r.contactPhone,
                  r.invoiceCompany,
                  r.status,
                  r.date,
                  r.contactNote,
                ])
              )
              .slice(0, 8);

            if (filtered.length > 0) {
              contextParts.push(
                `\n== NALEZENÉ REZERVACE (${filtered.length} výsledků) ==\n` +
                  filtered
                    .map((r) => {
                      const persons = r.persons?.length || 0;
                      links.push({
                        label: `${r.contactName || "Bez jména"} — ${r.date}`,
                        url: `/reservations/${r.id}/edit`,
                        meta: `${r.status} | ${persons} osob`,
                      });
                      return `- ID:${r.id} | ${r.contactName || "?"} | ${r.contactEmail || ""} | ${r.date} | ${r.status} | ${persons} osob | odkaz: /reservations/${r.id}/edit`;
                    })
                    .join("\n")
              );
            } else {
              contextParts.push(
                "\n== REZERVACE == Žádné výsledky pro dané hledání."
              );
            }
          })
          .catch(() => {})
      );
    }

    if (entities.includes("events")) {
      fetches.push(
        api
          .get<RagEvent[]>("/api/events")
          .then((data) => {
            const filtered = data
              .filter((e) =>
                matchesSearch([
                  e.name,
                  e.eventType,
                  e.eventDate,
                  e.status,
                  e.organizerPerson,
                  e.notesInternal,
                ])
              )
              .slice(0, 8);

            if (filtered.length > 0) {
              contextParts.push(
                `\n== NALEZENÉ AKCE (${filtered.length} výsledků) ==\n` +
                  filtered
                    .map((e) => {
                      links.push({
                        label: `${e.name} — ${e.eventDate}`,
                        url: `/events/${e.id}/edit`,
                        meta: `${e.eventType} | ${e.status} | ${e.guestsTotal || 0} hostů`,
                      });
                      return `- ID:${e.id} | "${e.name}" | ${e.eventDate} | ${e.eventType} | ${e.status} | ${e.guestsTotal || 0} hostů | organizátor: ${e.organizerPerson || "?"} | odkaz: /events/${e.id}/edit | dashboard: /events/${e.id}/dashboard`;
                    })
                    .join("\n")
              );
            } else {
              contextParts.push(
                "\n== AKCE == Žádné výsledky pro dané hledání."
              );
            }
          })
          .catch(() => {})
      );
    }

    if (entities.includes("contacts")) {
      const query = searchTerms.join(" ");
      fetches.push(
        api
          .get<{ items: RagContact[]; total: number }>(
            `/api/contacts?q=${encodeURIComponent(query)}&limit=8`
          )
          .then(({ items }) => {
            if (items.length > 0) {
              contextParts.push(
                `\n== NALEZENÉ KONTAKTY (${items.length} výsledků) ==\n` +
                  items
                    .map((c) => {
                      links.push({
                        label: `${c.name || "Bez jména"}`,
                        url: `/contacts/${c.id}/edit`,
                        meta: [c.email, c.phone, c.company]
                          .filter(Boolean)
                          .join(" | "),
                      });
                      return `- ID:${c.id} | ${c.name || "?"} | ${c.email || ""} | ${c.phone || ""} | ${c.company || ""} | odkaz: /contacts/${c.id}/edit`;
                    })
                    .join("\n")
              );
            } else {
              contextParts.push(
                "\n== KONTAKTY == Žádné výsledky pro dané hledání."
              );
            }
          })
          .catch(() => {})
      );
    }

    if (entities.includes("staff")) {
      fetches.push(
        api
          .get<RagStaffMember[]>("/api/staff")
          .then((data) => {
            const filtered = data
              .filter((s) =>
                matchesSearch([
                  s.firstName,
                  s.lastName,
                  s.email,
                  s.phone,
                  s.position,
                ])
              )
              .slice(0, 8);

            if (filtered.length > 0) {
              contextParts.push(
                `\n== NALEZENÝ PERSONÁL (${filtered.length} výsledků) ==\n` +
                  filtered
                    .map((s) => {
                      const name = s.isGroup
                        ? (s.firstName ?? "")
                        : `${s.firstName ?? ""} ${s.lastName ?? ""}`;
                      links.push({
                        label: name,
                        url: `/staff/${s.id}/edit`,
                        meta: [
                          s.position,
                          s.isActive ? "aktivní" : "neaktivní",
                        ]
                          .filter(Boolean)
                          .join(" | "),
                      });
                      return `- ID:${s.id} | ${name} | ${s.position || ""} | ${s.email || ""} | ${s.isActive ? "aktivní" : "neaktivní"} | odkaz: /staff/${s.id}/edit`;
                    })
                    .join("\n")
              );
            } else {
              contextParts.push(
                "\n== PERSONÁL == Žádné výsledky pro dané hledání."
              );
            }
          })
          .catch(() => {})
      );
    }

    if (entities.includes("partners")) {
      fetches.push(
        api
          .get<RagPartner[]>("/api/partner")
          .then((data) => {
            const filtered = data
              .filter((p) =>
                matchesSearch([
                  p.name,
                  p.email,
                  p.contactPerson,
                  p.partnerType,
                  p.ic,
                ])
              )
              .slice(0, 8);

            if (filtered.length > 0) {
              contextParts.push(
                `\n== NALEZENÍ PARTNEŘI (${filtered.length} výsledků) ==\n` +
                  filtered
                    .map((p) => {
                      links.push({
                        label: p.name ?? "",
                        url: `/partners/${p.id}/edit`,
                        meta: [
                          p.partnerType,
                          p.isActive ? "aktivní" : "neaktivní",
                        ]
                          .filter(Boolean)
                          .join(" | "),
                      });
                      return `- ID:${p.id} | "${p.name}" | ${p.partnerType} | ${p.contactPerson || ""} | ${p.email || ""} | ${p.isActive ? "aktivní" : "neaktivní"} | odkaz: /partners/${p.id}/edit`;
                    })
                    .join("\n")
              );
            } else {
              contextParts.push(
                "\n== PARTNEŘI == Žádné výsledky pro dané hledání."
              );
            }
          })
          .catch(() => {})
      );
    }

    if (entities.includes("invoices")) {
      fetches.push(
        api
          .get<RagInvoice[]>("/api/invoices")
          .then((data) => {
            const filtered = data
              .filter((inv) =>
                matchesSearch([
                  inv.invoiceNumber,
                  inv.status,
                  inv.customer?.name,
                  inv.customer?.company,
                  inv.customer?.ico,
                  inv.issueDate,
                ])
              )
              .slice(0, 8);

            if (filtered.length > 0) {
              contextParts.push(
                `\n== NALEZENÉ FAKTURY (${filtered.length} výsledků) ==\n` +
                  filtered
                    .map((inv) => {
                      links.push({
                        label: `${inv.invoiceNumber} — ${inv.customer?.name || "?"}`,
                        url: `/invoices/${inv.id}/edit`,
                        meta: `${inv.status} | ${inv.total} ${inv.currency || "CZK"}`,
                      });
                      return `- ID:${inv.id} | č. ${inv.invoiceNumber} | ${inv.customer?.name || "?"} | ${inv.status} | ${inv.total} CZK | ${inv.issueDate || ""} | odkaz: /invoices/${inv.id}/edit`;
                    })
                    .join("\n")
              );
            } else {
              contextParts.push(
                "\n== FAKTURY == Žádné výsledky pro dané hledání."
              );
            }
          })
          .catch(() => {})
      );
    }

    if (entities.includes("payments")) {
      const searchParam = searchTerms.join(" ");
      fetches.push(
        api
          .get<RagPayment[]>(
            `/api/payment/list?search=${encodeURIComponent(searchParam)}`
          )
          .then((data) => {
            const items = data.slice(0, 8);
            if (items.length > 0) {
              contextParts.push(
                `\n== NALEZENÉ PLATBY (${items.length} výsledků) ==\n` +
                  items
                    .map((p) => {
                      links.push({
                        label: `Platba ${p.transactionId || p.id} — ${p.amount} CZK`,
                        url: "/payments",
                        meta: `${p.status} | ${p.reservation?.contactName || "?"}`,
                      });
                      return `- ID:${p.id} | transakce: ${p.transactionId || "?"} | ${p.amount} CZK | ${p.status} | kontakt: ${p.reservation?.contactName || "?"} | ${p.createdAt || ""}`;
                    })
                    .join("\n")
              );
            } else {
              contextParts.push(
                "\n== PLATBY == Žádné výsledky pro dané hledání."
              );
            }
          })
          .catch(() => {})
      );
    }

    await Promise.all(fetches);
  } catch {
    // Silently fail - chatbot still works without RAG
  }

  return {
    context: contextParts.join("\n"),
    links,
  };
}

// ─── System prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `Jsi přátelský AI asistent pro navigaci v administračním systému Folklore Garden Admin.
Tvůj úkol je pomáhat uživatelům orientovat se v systému, najít správné stránky, vysvětlit jak co funguje a DOHLEDÁVAT konkrétní data v systému.

Odpovídej vždy ČESKY, stručně a jasně. Používej přátelský tón.

DŮLEŽITÉ PRAVIDLA PRO ODKAZY:
- Když ti systém poskytne výsledky hledání s odkazy, VŽDY uveď odkaz ve formátu [text](url).
- Například: [Jan Novák — 2025-06-15](/reservations/42/edit)
- Uživatel na ně může kliknout a přejít přímo na daný záznam.
- Pokud jsou výsledky hledání, vždy je přehledně vypiš s odkazy.
- Pokud hledání nic nenašlo, řekni to a navrhni jak hledat jinak.

DŮLEŽITÉ: Nepoužívej markdown nadpisy (#), tučné písmo (**) ani jiné formátování kromě odkazů [text](url) a pomlček "- " pro odrážky.

Zde je kompletní mapa systému:

== NAVIGACE (boční menu) ==

1. Dashboard (/) - Přehled: statistiky rezervací, tržby, grafy, trendy
2. Rezervace (/reservations) - Správa zákaznických rezervací
3. Akce (/events) - Plánování a řízení eventů (folklorní show, svatby, firemní akce)
4. Platby (/payments) - Sledování plateb přes Comgate platební bránu
5. Faktury (/invoices) - Vytváření a správa faktur (zálohové, konečné)
6. Adresář (/contacts) - Databáze zákazníků a kontaktů (CRM)
7. Jídla (/foods) - Správa nabídky jídel pro rezervace a akce
8. Cenník (/pricing) - Výchozí ceny a datové přepisy cen
9. Nápoje (/drinks) - Nápojový lístek a párování s jídly
10. Sklad > Položky skladu (/stock-items) - Evidence zásob
11. Sklad > Receptury (/recipes) - Kuchařské receptury s ingrediencemi
12. Sklad > Pohyby skladu (/stock-movements) - Historie příjmů/výdejů
13. Sklad > Požadavky skladu (/stock-requirements) - Automatický výpočet potřebných zásob
14. Partneři > Partneři (/partners) - Obchodní partneři (hotely, recepce, distributoři)
15. Partneři > Vouchery (/vouchers) - Slevové kódy a vouchery
16. Partneři > Provizní logy (/commission-logs) - Sledování provizí partnerům
17. Personál > Personál (/staff) - Evidence zaměstnanců
18. Personál > Docházka (/staff-attendance) - Odpracované hodiny a platby
19. Personál > Výpočetní vzorce (/staffing-formulas) - Automatické doporučení počtu personálu
20. Areál > Budovy a místnosti (/venue/buildings) - Evidence prostor
21. Areál > Šablony plánků (/venue/templates) - Předdefinovaná rozložení stolů
22. Pokladna (/cashbox) - Hotovostní finance, hlavní pokladna a pokladny akcí
23. Doprava (/transport) - Přepravní společnosti, vozidla, řidiči
24. Správa > Uživatelé (/users) - Správa uživatelských účtů
25. Správa > Role (/roles) - Definice rolí a oprávnění
26. Správa > Druhy rezervací (/reservation-types) - Kategorie rezervací
27. Správa > Kategorie pokladny (/cash-categories) - Kategorie příjmů/výdajů
28. Správa > Nastavení firmy (/settings) - Firemní údaje, banka, fakturace
29. Blokované termíny (/disabled-dates) - Zablokování dat pro rezervace

== DETAILY MODULŮ ==

REZERVACE:
- Seznam: tabulka s jménem, emailem, telefonem, datem, počtem osob, statusem
- Statusy: RECEIVED (přijato), WAITING_PAYMENT (čeká na platbu), PAID (zaplaceno), CONFIRMED (potvrzeno), CANCELLED (zrušeno)
- Nová rezervace: /reservations/new
- Editace: /reservations/{id}/edit
- AI asistent: umí zpracovat text emailu a automaticky vyplnit formulář

AKCE:
- Typy: Folklorní show, Svatba, Event, Soukromá akce (Privát)
- Statusy: DRAFT, PLANNED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
- Editace má 9 záložek: Základní info, Hosté, Menu, Nápoje, Harmonogram, Stoly, Personál, Finance, Doprava
- Event Dashboard: /events/{id}/dashboard
- Waiter View: /events/{id}/waiter

POKLADNA:
- Hlavní pokladna: centrální (lze skrýt v Správa > Nastavení firmy > Fakturace)
- Pokladny akcí: automaticky pro každou akci
- Pohyby: příjmy (INCOME) a výdaje (EXPENSE)
- Převody mezi pokladnami, uzávěrka, auditní log

FAKTURY:
- Typy: DEPOSIT (zálohová), FINAL (konečná), PARTIAL (dílčí)
- Statusy: DRAFT, SENT, PAID, CANCELLED
- Číslovací řada: Správa > Nastavení firmy > Fakturace

PERSONÁL:
- Jednotlivci i skupiny/kapely
- Docházka: evidence hodin, platby
- Vzorce: poměr personál:hosté

PARTNEŘI:
- Typy: Hotel, Recepce, Distributor, Ostatní
- Cenové modely: Default, Custom, Flat
- Automatická detekce partnera

SKLAD:
- Položky, receptury, pohyby, požadavky
- Import receptur z Excelu

AREÁL:
- Budovy > místnosti > floor plan šablony > designér

== ČASTÉ DOTAZY ==

Q: Kde založím pokladnu?
A: Hlavní pokladna se vytvoří automaticky. Nastavení v Správa > Nastavení firmy > Fakturace.

Q: Jak odešlu platbu zákazníkovi?
A: V Rezervacích u dané rezervace tlačítko odeslání platebního emailu.

Q: Jak vystavím fakturu?
A: Faktury > Nová faktura (/invoices/new).

Q: Jak přidám zaměstnance?
A: Personál > Nový zaměstnanec (/staff/new).

Q: Jak nastavím ceny?
A: Cenník (/pricing) + datové přepisy. Pro partnery: editace partnera > cenový model.

Q: Jak vytvořím floor plan?
A: 1. Areál > Budovy. 2. Areál > Šablony. 3. Designér.

Q: Kde nastavím údaje na fakturách?
A: Správa > Nastavení firmy (/settings).`;

// ─── AI call with failover ───────────────────────────────────────────
export async function chatCompletion(
  messages: { role: string; content: string }[]
): Promise<string> {
  let lastError: unknown;
  for (const server of AI_SERVERS) {
    try {
      const client = getAiClient(server);
      const res = await client.post("/v1/chat/completions", {
        model: server.model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.3,
        max_tokens: 1500,
      });
      const content = res.data?.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error("Prázdná odpověď");
      return content;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
