import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import type { ReservationFood } from '@shared/types';

// AI server configuration with priority-based failover
interface AiServer {
  endpoint: string;
  apiKey: string;
  model: string;
  priority: number;
}

const AI_SERVERS: AiServer[] = [
  {
    endpoint: 'https://ai1.ai-servis.online',
    apiKey: 'sk-lm-y4kZpbN3:mQJmOGnRCFFxPGlMiZNF',
    model: 'google/gemma-3-4b',
    priority: 1,
  },
  {
    endpoint: 'https://ai2.ai-servis.online',
    apiKey: 'sk-lm-RWjTUYjr:6SG1lQK5XJYzN1wgAPyD',
    model: 'openai/gpt-oss-20b-lora',
    priority: 2,
  },
].sort((a, b) => a.priority - b.priority);

export const isAiConfigured = () => AI_SERVERS.length > 0;

// Zod schema for AI parsed reservation payload
export const AiMenuItemSchema = z.object({
  menuName: z.string().min(1),
  count: z.number().int().nonnegative(),
  unitPrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const AiParsedReservationSchema = z.object({
  sourceSummary: z.string().optional(),
  reservation: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm, optional
    status: z.enum(['RECEIVED','WAITING_PAYMENT','PAID','CANCELLED','AUTHORIZED','CONFIRMED']).optional(),
    notes: z.string().optional(),
  }),
  pax: z.object({
    adults: z.number().int().nonnegative().default(0),
    children: z.number().int().nonnegative().default(0),
    infants: z.number().int().nonnegative().default(0),
    freeTourLeaders: z.number().int().nonnegative().default(0),
    freeDrivers: z.number().int().nonnegative().default(0),
  }),
  menus: z.array(AiMenuItemSchema).default([]),
  contact: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    nationality: z.string().optional(),
    company: z.string().optional(),
    invoiceName: z.string().optional(),
    invoiceCompany: z.string().optional(),
    invoiceIc: z.string().optional(),
    invoiceDic: z.string().optional(),
    invoiceEmail: z.string().email().optional(),
    invoicePhone: z.string().optional(),
  }).default({}),
  extra: z.record(z.any()).optional(),
});

export type AiParsedReservation = z.infer<typeof AiParsedReservationSchema>;

// Build a strict system prompt for the AI
export function buildReservationSystemPrompt(foods: ReservationFood[]): string {
  const foodsList = foods.map(f => `- name: "${f.name}", children: ${f.isChildrenMenu ? 'yes' : 'no'}`).join('\n');
  return [
    'Jsi asistent pro zpracování e-mailů a zpráv o skupinových rezervacích Folklore Garden v Praze.',
    'Tvůj úkol: z volného textu vyextrahovat údaje a vrátit POUZE jeden JSON objekt dle přesného schématu.',
    'Nesmíš vracet žádný text kolem, žádné vysvětlení, žádné formátování ani Markdown. Jen samotný JSON.',
    '',
    'Pravidla a normalizace:',
    '- Datum vždy ve formátu YYYY-MM-DD (např. 2025-12-29).',
    '- Čas, pokud je uveden, jako HH:mm (24h).',
    '- V poli menus používej názvy menu přesně z následujícího seznamu (case-sensitive):',
    foodsList || '- (seznam menu není k dispozici, ponech menuName dle textu) ',
    '- Pokud není menu rozděleno, uveď alespoň jednu položku s menuName odpovídající dospělému menu a count = počtu platících osob.',
    '- Definice pax: pax.adults + pax.children = pouze PLATÍCÍ osoby. Nikdy do pax nezahrnuj tour leadera ani drivera, kteří jsou zdarma.',
    '- Tour leader(ři) a driver(ři) uveď do příslušných polí pax.freeTourLeaders a pax.freeDrivers (počty zdarma osob).',
    '- Vzorce jako "Pax X+Y" interpretuj takto: X+Y je celkový počet osob skupiny, pokud z kontextu není zřejmé něco jiného. Pokud jsou současně uvedeni free role (např. 1 tour leader a 1 driver zdarma), vypočti platící pax jako (X+Y) mínus počty free rolí. Pokud text jasně říká, že "+Y" znamená osobu čekající (např. vízum) a nemusí přijít, použij pro platící pax pouze X a vysvětli to v reservation.notes.',
    '- Pokud text uvádí "celkem N osob, z toho M zdarma", nastav platící pax = N - M a free* podle rolí.',
    '- Součet menus[].count MUSÍ přesně odpovídat počtu platících pax (adults + children). Kojence (infants) do menus nezahrnuj.',
    '- Je-li uvedena jednotková cena (např. "menu price: 740 CZK"), nastav unitPrice u příslušných položek; výjimky (dětské menu/jiná cena) respektuj, pokud jsou zmíněny.',
    '- Pokud je význam nejasný, zvol konzervativně nižší počet PLATÍCÍCH pax a uveď přesné zdůvodnění interpretace do reservation.notes (např. "Pax 17+1 (1 čeká na vízum), 1 TL a 1 driver zdarma => 16 platících").',
    '- Fakturační údaje, pokud jsou v textu, doplň do contact.invoice*.',
    '',
    'Výstupní JSON schema (TypeScript-like popis):',
    '{',
    '  reservation: { date: "YYYY-MM-DD", time?: "HH:mm", status?: "RECEIVED|WAITING_PAYMENT|PAID|CANCELLED|AUTHORIZED|CONFIRMED", notes?: string },',
    '  pax: { adults: number, children: number, infants: number, freeTourLeaders: number, freeDrivers: number },',
    '  menus: Array<{ menuName: string, count: number, unitPrice?: number, notes?: string }>,',
    '  contact: { name?: string, email?: string, phone?: string, nationality?: string, company?: string, invoiceName?: string, invoiceCompany?: string, invoiceIc?: string, invoiceDic?: string, invoiceEmail?: string, invoicePhone?: string },',
    '  sourceSummary?: string,',
    '  extra?: object',
    '}',
    '',
    'Vrať pouze JSON dle schématu. Pokud něco chybí v podkladu, pole ponech prázdné nebo 0 a přidej vysvětlení do reservation.notes.',
  ].join('\n');
}

// AI API clients - one per server, cached
const aiClients = new Map<string, AxiosInstance>();

function getClientForServer(server: AiServer): AxiosInstance {
  let client = aiClients.get(server.endpoint);
  if (!client) {
    client = axios.create({
      baseURL: server.endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${server.apiKey}`,
      },
      timeout: 30_000,
    });
    aiClients.set(server.endpoint, client);
  }
  return client;
}

// Send a chat completion request, trying servers in priority order
async function aiChatCompletion(systemPrompt: string, userMessage: string): Promise<string> {
  if (AI_SERVERS.length === 0) throw new Error('Žádné AI servery nejsou nakonfigurované');

  let lastError: unknown;
  for (const server of AI_SERVERS) {
    try {
      const client = getClientForServer(server);
      const res = await client.post('/v1/chat/completions', {
        model: server.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0,
      });
      const content = res.data?.choices?.[0]?.message?.content ?? '';
      if (!content) throw new Error('Prázdná odpověď z AI serveru');
      return content;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// Utility: try extract JSON object from possibly wrapped content
export function extractFirstJsonObject(text: string): any {
  // Quick path: try direct parse
  try { return JSON.parse(text); } catch {}
  // Remove markdown fences
  const withoutFences = text.replace(/```[a-z]*\n?|```/gi, '');
  try { return JSON.parse(withoutFences); } catch {}
  // Find first JSON object via braces
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = withoutFences.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch {}
  }
  throw new Error('Nepodařilo se extrahovat JSON z AI odpovědi');
}

export async function parseReservationWithAI(params: {
  text: string;
  foods: ReservationFood[];
}): Promise<AiParsedReservation> {
  const { text, foods } = params;
  const systemPrompt = buildReservationSystemPrompt(foods);
  const content = await aiChatCompletion(systemPrompt, text);
  const payload = extractFirstJsonObject(content);
  return AiParsedReservationSchema.parse(payload);
}

// Helper: map AI menus onto known foods by name
export function resolveMenuToFoodId(menuName: string, foods: ReservationFood[]): ReservationFood | undefined {
  // exact match first
  let found = foods.find(f => f.name === menuName);
  if (found) return found;
  // try case-insensitive
  found = foods.find(f => f.name.toLowerCase() === menuName.toLowerCase());
  if (found) return found;
  // naive heuristics ("chicken" -> contains "chicken")
  const n = menuName.toLowerCase();
  found = foods.find(f => f.name.toLowerCase().includes(n) || n.includes(f.name.toLowerCase()));
  return found;
}

// ============================================================================
// MULTI-RESERVATION PARSING (for emails with multiple dates)
// ============================================================================

// Schema for a single reservation entry in multi-reservation response
export const AiMultiReservationEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  adults: z.number().int().nonnegative().default(0),
  children: z.number().int().nonnegative().default(0),
  infants: z.number().int().nonnegative().default(0),
  freeTourLeaders: z.number().int().nonnegative().default(0),
  freeDrivers: z.number().int().nonnegative().default(0),
  menu: z.string().nullable().optional(), // Menu type for this group (e.g., "Chicken Menu halal", "Traditional")
  groupCode: z.string().nullable().optional(), // Group identifier (e.g., "BC 5313")
  pricePerPerson: z.number().nonnegative().nullable().optional(), // Price per adult in CZK (e.g., 995)
  notes: z.string().nullable().optional(),
});

// Schema for shared contact info across all reservations
export const AiMultiReservationContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  company: z.string().optional(),
  invoiceName: z.string().optional(),
  invoiceCompany: z.string().optional(),
  invoiceIc: z.string().optional(),
  invoiceDic: z.string().optional(),
  invoiceEmail: z.string().optional(),
  invoicePhone: z.string().optional(),
});

// Main schema for multi-reservation AI response
export const AiParsedMultiReservationSchema = z.object({
  contact: AiMultiReservationContactSchema.default({}),
  reservations: z.array(AiMultiReservationEntrySchema).min(1),
});

export type AiParsedMultiReservation = z.infer<typeof AiParsedMultiReservationSchema>;
export type AiMultiReservationEntry = z.infer<typeof AiMultiReservationEntrySchema>;

// Build system prompt for multi-reservation parsing
export function buildMultiReservationSystemPrompt(): string {
  const currentYear = new Date().getFullYear();
  return [
    'Jsi asistent pro zpracování e-mailů se skupinovými rezervacemi pro Folklore Garden v Praze.',
    'Tvůj úkol: z textu vyextrahovat VÍCE rezervací a vrátit JSON objekt.',
    'Nesmíš vracet žádný text kolem, žádné vysvětlení, žádné formátování ani Markdown. Jen samotný JSON.',
    '',
    'DŮLEŽITÉ - Zpracování e-mailových konverzací:',
    '- E-mail může být KONVERZACE (vlákno) s historií - nejnovější zpráva je NAHOŘE, nejstarší DOLE.',
    '- Pokud najdeš více zmínek stejné skupiny/rezervace (např. "BC 5313"), vezmi POUZE NEJNOVĚJŠÍ údaje (z horní části emailu).',
    '- Starší zprávy ve vlákně ignoruj - obsahují zastaralé informace.',
    '- Každá UNIKÁTNÍ skupina (identifikovaná kódem jako BC 5313, BC 5284 apod.) = jedna rezervace.',
    '- Na STEJNÉ DATUM může být VÍCE RŮZNÝCH skupin - to jsou ODDĚLENÉ rezervace, ne duplikáty!',
    '',
    'Pravidla:',
    `- Aktuální rok je ${currentYear}. Pokud rok není uveden, použij ${currentYear}.`,
    '- Datum vždy ve formátu YYYY-MM-DD (např. 2025-12-29).',
    '- "Persons: X + Y" znamená X platících osob + Y průvodců/řidičů zdarma.',
    '- "pax" nebo číslo před "pax" = počet PLATÍCÍCH dospělých (adults).',
    '- "+1", "+2" za počtem osob = freeTourLeaders nebo freeDrivers (celkem, rozděl dle kontextu).',
    '- "sprievodca/sprievodci/tour leader/TL" = freeTourLeaders (zdarma).',
    '- "šoféri/driver/drivers" = freeDrivers (zdarma).',
    '- Pokud jsou v textu fakturační údaje (IČO, DIČ, firma, adresa), vyplň je do contact.',
    '- Kontaktní email a jméno získej z podpisu emailu nebo hlavičky ODESÍLATELE (ne příjemce).',
    '- Do notes uveď identifikátor skupiny (např. "BC 5313") a speciální požadavky na menu.',
    '',
    'Pravidla pro menu:',
    '- Pokud je uvedeno "Menu: X" nebo "Menu : X", extrahuj název menu do pole "menu".',
    '- Běžné typy menu: "Traditional", "Chicken Menu", "Chicken Menu halal", "Vegetarian", "Vegan".',
    '- Pokud je menu s přílohou (např. "Chicken Menu + halal meat 70g"), uveď celý popis.',
    '- Pokud menu není uvedeno, pole "menu" vynech nebo nastav na prázdný string.',
    '',
    'Pravidla pro cenu:',
    '- Hledej v emailu zmínky o ceně za osobu: "X Kč/os", "X CZK per person", "price is X", "makes it X Kč".',
    '- Pokud najdeš konkrétní cenu (např. "995 Kč/os"), nastav pricePerPerson na tuto hodnotu.',
    '- Cena může být výpočet jako "850 + 75 + 70 = 995" - použij výslednou částku.',
    '- Pokud cena není uvedena, pole pricePerPerson vynech (použije se výchozí cena systému).',
    '- Cena se typicky vztahuje na všechny rezervace v emailu, pokud není řečeno jinak.',
    '',
    'Výstupní JSON schema:',
    '{',
    '  "contact": {',
    '    "name": "jméno kontaktní osoby",',
    '    "email": "email@example.com",',
    '    "phone": "+420...",',
    '    "nationality": "SK" nebo "CZ" nebo jiná,',
    '    "company": "název firmy",',
    '    "invoiceName": "fakturační jméno",',
    '    "invoiceCompany": "fakturační firma",',
    '    "invoiceIc": "IČO",',
    '    "invoiceDic": "DIČ",',
    '    "invoiceEmail": "fakturační email",',
    '    "invoicePhone": "fakturační telefon"',
    '  },',
    '  "reservations": [',
    '    {',
    '      "date": "YYYY-MM-DD",',
    '      "adults": 16,',
    '      "children": 0,',
    '      "infants": 0,',
    '      "freeTourLeaders": 1,',
    '      "freeDrivers": 1,',
    '      "menu": "Chicken Menu halal",',
    '      "groupCode": "BC 5408",',
    '      "pricePerPerson": 995,',
    '      "notes": "baked potatoes instead of mashed"',
    '    }',
    '  ]',
    '}',
    '',
    'Vrať pouze JSON dle schématu. Pole reservations musí obsahovat alespoň jednu položku.',
    'NEKOMBINUJ skupiny na stejný den - každá skupina je samostatná rezervace!',
  ].join('\n');
}

// Parse multiple reservations from email text
export async function parseMultiReservationWithAI(params: {
  text: string;
}): Promise<AiParsedMultiReservation> {
  const { text } = params;
  const systemPrompt = buildMultiReservationSystemPrompt();
  const content = await aiChatCompletion(systemPrompt, text);
  const payload = extractFirstJsonObject(content);
  return AiParsedMultiReservationSchema.parse(payload);
}
