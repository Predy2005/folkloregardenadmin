import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircleQuestion,
  X,
  Send,
  Loader2,
  Trash2,
  Search,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { api } from "@/shared/lib/api";
import axios from "axios";

// ─── AI server config (same as reservations AI) ───────────────────────
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
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  links?: ChatLink[];
}

interface ChatLink {
  label: string;
  url: string;
  meta?: string; // extra info like date, status
}

// ─── RAG: Data fetching from system API ──────────────────────────────

interface RagResult {
  context: string;
  links: ChatLink[];
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
function detectSearchIntent(text: string): {
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
async function fetchRagContext(
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
          .get<any[]>("/api/reservations")
          .then((data) => {
            const filtered = data
              .filter((r: any) =>
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
                    .map((r: any) => {
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
          .get<any[]>("/api/events")
          .then((data) => {
            const filtered = data
              .filter((e: any) =>
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
                    .map((e: any) => {
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
          .get<{ items: any[]; total: number }>(
            `/api/contacts?q=${encodeURIComponent(query)}&limit=8`
          )
          .then(({ items }) => {
            if (items.length > 0) {
              contextParts.push(
                `\n== NALEZENÉ KONTAKTY (${items.length} výsledků) ==\n` +
                  items
                    .map((c: any) => {
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
          .get<any[]>("/api/staff")
          .then((data) => {
            const filtered = data
              .filter((s: any) =>
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
                    .map((s: any) => {
                      const name = s.isGroup
                        ? s.firstName
                        : `${s.firstName} ${s.lastName}`;
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
          .get<any[]>("/api/partner")
          .then((data) => {
            const filtered = data
              .filter((p: any) =>
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
                    .map((p: any) => {
                      links.push({
                        label: p.name,
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
          .get<any[]>("/api/invoices")
          .then((data) => {
            const filtered = data
              .filter((inv: any) =>
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
                    .map((inv: any) => {
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
          .get<any[]>(
            `/api/payment/list?search=${encodeURIComponent(searchParam)}`
          )
          .then((data) => {
            const items = data.slice(0, 8);
            if (items.length > 0) {
              contextParts.push(
                `\n== NALEZENÉ PLATBY (${items.length} výsledků) ==\n` +
                  items
                    .map((p: any) => {
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
async function chatCompletion(
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

// ─── Parse links from AI response [text](url) ───────────────────────
function parseMessageContent(
  content: string
): { text: string; parts: MessagePart[] } {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    // Text before the link
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", content: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return { text: content, parts };
}

interface MessagePart {
  type: "text" | "link";
  content: string;
  url?: string;
}

// ─── Render message with clickable links ─────────────────────────────
function MessageContent({ content }: { content: string }) {
  const { parts } = parseMessageContent(content);

  if (parts.length === 0) return <>{content}</>;

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "link" && part.url) {
          return (
            <a
              key={i}
              href={part.url}
              className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-0.5"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = part.url!;
              }}
            >
              {part.content}
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          );
        }
        return <span key={i}>{part.content}</span>;
      })}
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────────
export function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        'Ahoj! Jsem pomocník pro navigaci v systému Folklore Garden Admin.\n\nMůžu ti pomoct s:\n- Navigací v systému (kde co najdeš)\n- Vysvětlením funkcí\n- Hledáním konkrétních dat (rezervací, akcí, kontaktů...)\n\nZkus třeba: "Najdi rezervace Novák" nebo "Kde nastavím pokladnu?"',
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const processAndSend = useCallback(
    async (text: string, currentMessages: ChatMessage[]) => {
      setIsLoading(true);

      try {
        // Step 1: Detect if we need to search for data (RAG)
        const { entities, searchTerms } = detectSearchIntent(text);
        let ragContext = "";
        let ragLinks: ChatLink[] = [];

        if (entities.length > 0) {
          setIsSearching(true);
          const rag = await fetchRagContext(entities, searchTerms);
          ragContext = rag.context;
          ragLinks = rag.links;
          setIsSearching(false);
        }

        // Step 2: Build messages for AI with RAG context injected
        const contextMessages = currentMessages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // If we have RAG data, append it to the user message
        const lastUserMsg = contextMessages[contextMessages.length - 1];
        if (ragContext && lastUserMsg) {
          lastUserMsg.content =
            lastUserMsg.content +
            "\n\n--- VÝSLEDKY HLEDÁNÍ V SYSTÉMU (použij je ve své odpovědi, uveď odkazy) ---" +
            ragContext;
        }

        // Step 3: Get AI response
        const response = await chatCompletion(contextMessages);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response, links: ragLinks },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Omlouvám se, nepodařilo se mi spojit s AI serverem. Zkuste to prosím znovu za chvíli.",
          },
        ]);
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    },
    []
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");

    await processAndSend(text, updatedMessages);
  }, [input, isLoading, messages, processAndSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: "Chat vymazán. Jak ti mohu pomoci?",
      },
    ]);
  }, []);

  const suggestions = [
    "Kde založím pokladnu?",
    "Najdi rezervace na červen",
    "Jaké akce máme naplánované?",
    "Najdi kontakt Novák",
  ];

  const handleSuggestion = useCallback(
    (text: string) => {
      const userMsg: ChatMessage = { role: "user", content: text };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      processAndSend(text, updatedMessages);
    },
    [messages, processAndSend]
  );

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center",
          "w-14 h-14 rounded-full shadow-lg transition-all duration-200",
          "hover:scale-105 active:scale-95",
          isOpen
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground"
        )}
        title="Nápověda - AI asistent"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircleQuestion className="w-6 h-6" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50",
            "w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-8rem)]",
            "bg-card border border-border rounded-xl shadow-2xl",
            "flex flex-col overflow-hidden",
            "animate-in slide-in-from-bottom-4 fade-in duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Pomocník</h3>
                <p className="text-xs text-muted-foreground">
                  Navigace a vyhledávání v systému
                </p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Vymazat chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <MessageContent content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* Loading states */}
            {(isLoading || isSearching) && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-lg rounded-bl-sm flex items-center gap-2">
                  {isSearching ? (
                    <>
                      <Search className="w-4 h-4 animate-pulse text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Hledám v systému...
                      </span>
                    </>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            )}

            {/* Suggestions - only show at start */}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Napiš dotaz nebo hledej... (např. "Najdi akce svatba")'
                rows={1}
                className={cn(
                  "flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2",
                  "text-sm placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  "max-h-24"
                )}
                style={{
                  height: "auto",
                  minHeight: "2.5rem",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 96) + "px";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
