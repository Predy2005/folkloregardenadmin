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
    endpoint: "https://ai2.ai-servis.online",
    apiKey: "sk-lm-RWjTUYjr:6SG1lQK5XJYzN1wgAPyD",
    //model: 'qwen2.5-14b-instruct-1m',
    model: "openai/gpt-oss-20b",
    priority: 1,
  },
  {
    endpoint: "https://ai1.ai-servis.online",
    apiKey: "sk-lm-y4kZpbN3:mQJmOGnRCFFxPGlMiZNF",
    model: "google/gemma-3-4b",
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
  extra: z.record(z.unknown()).optional(),
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
      timeout: 180_000,
    });
    aiClients.set(server.endpoint, client);
  }
  return client;
}


// Send a single request to an AI server (no retry for 500 — model crash won't recover)
async function aiRequest(
  server: AiServer,
  body: Record<string, unknown>,
): Promise<{ content: string; finishReason: string }> {
  const client = getClientForServer(server);
  const res = await client.post('/v1/chat/completions', body);
  const content = res.data?.choices?.[0]?.message?.content ?? '';
  const finishReason = res.data?.choices?.[0]?.finish_reason ?? '';
  if (!content) throw new Error('Prázdná odpověď z AI serveru');
  return { content, finishReason };
}

// Send a chat completion request, trying servers in priority order
// onlyPrimary=true → use only ai2 (large model), skip ai1 to avoid crashing it
async function aiChatCompletion(systemPrompt: string, userMessage: string, onlyPrimary = false): Promise<string> {
  if (AI_SERVERS.length === 0) throw new Error('Žádné AI servery nejsou nakonfigurované');

  // Fixed max_tokens — 4096 works on ai2, higher may exceed context window
  const maxTokens = 4096;

  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0,
    max_tokens: maxTokens,
  };

  const servers = onlyPrimary ? AI_SERVERS.slice(0, 1) : AI_SERVERS;
  let lastError: unknown;
  let truncatedContent: string | null = null;

  for (const server of servers) {
    try {
      const { content, finishReason } = await aiRequest(
        server,
        { model: server.model, ...body },
      );
      console.warn('[AI] Server ' + server.endpoint + ' (' + server.model + ') finish_reason=' + finishReason + ', length=' + content.length);

      // If response was truncated (finish_reason=length), try next server with bigger model
      if (finishReason === 'length' && server.priority < AI_SERVERS.length) {
        console.warn('[AI] Response truncated (' + content.length + ' chars), trying next server...');
        truncatedContent ??= content;
        lastError = new Error('Odpověď oříznutá (' + content.length + ' znaků)');
        continue;
      }

      return content;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
      const status = axiosErr?.response?.status;
      const detail = axiosErr?.response?.data?.error?.message || axiosErr?.message || String(err);
      console.warn('[AI] Server ' + server.endpoint + ' failed (HTTP ' + (status || 'N/A') + '):', detail);
      // Wrap with more context for user-facing error
      lastError = new Error(
        'AI server ' + server.endpoint + ' (HTTP ' + (status || 'timeout') + '): ' + detail,
      );
    }
  }
  // If we have a truncated response from an earlier server, use it as fallback
  if (truncatedContent) {
    console.warn('[AI] All servers exhausted, using truncated response as fallback');
    return truncatedContent;
  }
  throw lastError;
}

// Utility: try extract JSON object from possibly wrapped content (handles truncated output)
export function extractFirstJsonObject(text: string): unknown {
  if (!text?.trim()) {
    throw new Error('AI vrátila prázdnou odpověď');
  }
  // Remove markdown fences
  const clean = text.replaceAll(/```[a-z]*\n?|```/gi, '').trim();

  // Quick path
  try { return JSON.parse(clean); } catch {}

  // Find first { and try balanced parse
  const start = clean.indexOf('{');
  if (start === -1) {
    throw new Error(`AI nevrátila JSON. Výstup: "${text.substring(0, 300)}"`);
  }

  let depth = 0;
  for (let i = start; i < clean.length; i++) {
    if (clean[i] === '{') depth++;
    else if (clean[i] === '}') depth--;
    if (depth === 0) {
      const candidate = clean.slice(start, i + 1);
      try { return JSON.parse(candidate); } catch {}
      break;
    }
  }

  // Truncated JSON — try to repair by closing open brackets
  const truncated = clean.slice(start);
  const repaired = repairTruncatedJson(truncated);
  if (repaired) {
    try { return JSON.parse(repaired); } catch {}
  }

  throw new Error(`Nepodařilo se extrahovat JSON. Výstup: "${text.substring(0, 300)}"`);
}

// Attempt to repair truncated JSON by closing open structures
function repairTruncatedJson(json: string): string | null {
  // Remove trailing incomplete key-value pair (e.g. `"children"`)
  let s = json.replace(/,\s*"[^"]*"?\s*$/, '');
  // Remove trailing incomplete value
  s = s.replace(/:\s*"[^"]*$/, ': ""');
  s = s.replace(/:\s*\d+[^,}\]]*$/, ': 0');

  // Count open brackets
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  // Close open structures
  if (braces <= 0 && brackets <= 0) return null;
  let closing = '';
  for (let i = 0; i < braces; i++) closing += '}';
  // Insert ] before last } if we have open arrays inside the object
  if (brackets > 0) {
    const lastBrace = closing.lastIndexOf('}');
    const arrayClosers = ']'.repeat(brackets);
    closing = closing.substring(0, lastBrace) + arrayClosers + closing.substring(lastBrace);
  }

  const result = s + closing;
  console.warn(`[AI] Repaired truncated JSON (added "${closing}")`);
  return result;
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
  transferAddress: z.string().nullable().optional(), // Return transport address (odvoz z akce)
  transferCount: z.number().int().nonnegative().nullable().optional(), // Number of people for transfer
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
  priceCurrency: z.string().default('CZK'),
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
    '- Cena se VŽDY vztahuje na VŠECHNY rezervace v emailu, pokud není EXPLICITNĚ řečeno jinak pro konkrétní skupinu. Nastav pricePerPerson u KAŽDÉ rezervace.',
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
    '      "transferAddress": "Hotel Name, address (odvoz z akce)",',
    '      "transferCount": 16,',
    '      "notes": "baked potatoes instead of mashed"',
    '    }',
    '  ]',
    '}',
    '',
    'Pravidla pro transport/transfer:',
    '- Nabízíme ODVOZ Z AKCE (po skončení večera), NE svoz na akci.',
    '- "Pick-up", "pick up from hotel", "transfer from hotel" = cesta NA akci = NEDĚLÁME. Adresu ulož do notes jako "Pickup na akci: ADRESA".',
    '- "What is the PICK-UP TIME?" = dotaz na čas odvozu PO AKCI (pokud není jasně řečeno jinak). Ulož do notes: "Dotaz na čas odvozu".',
    '- "Return transfer", "transfer back to hotel", "drop-off" = ODVOZ Z AKCE = ulož do transferAddress.',
    '- Pokud je zmíněna adresa hotelu a kontext naznačuje odvoz zpět, nastav transferAddress na adresu a transferCount na počet osob.',
    '',
    'Vrať pouze JSON dle schématu. Pole reservations musí obsahovat alespoň jednu položku.',
    'NEKOMBINUJ skupiny na stejný den - každá skupina je samostatná rezervace!',
    '',
    'SPECIÁLNÍ PŘÍPAD - seznam skupin bez detailů:',
    '- Pokud text obsahuje jen kódy skupin a data (bez pax, bez menu), vytvoř pro každou skupinu rezervaci.',
    '- Nastav adults=0 (dosud neznámo), groupCode na kód skupiny, notes na itinerář.',
    '- Datum interpretuj: "7-Jun" = YYYY-06-07 (aktuální rok pokud chybí).',
    '- Formát "PGS 0606 PVB  7-Jun" = groupCode "PGS 0606 PVB", datum 7. června.',
  ].join('\n');
}

// Normalize a reservation entry from AI — maps various field name variants to expected schema
function normalizeReservationEntry(item: Record<string, unknown>): Record<string, unknown> {
  if (!item || typeof item !== 'object') return item;
  return {
    date: item.date || item.reservation_date || item.datum || item.day || null,
    adults: item.adults ?? item.pax ?? item.adult ?? 0,
    children: item.children ?? item.kids ?? 0,
    infants: item.infants ?? 0,
    freeTourLeaders: item.freeTourLeaders ?? item.free_tour_leaders ?? item.tourLeaders ?? 0,
    freeDrivers: item.freeDrivers ?? item.free_drivers ?? item.drivers ?? 0,
    groupCode: item.groupCode ?? item.group_code ?? item.code ?? item.group ?? null,
    menu: item.menu ?? null,
    pricePerPerson: item.pricePerPerson ?? item.price_per_person ?? item.price ?? null,
    notes: item.notes ?? item.note ?? item.itinerary ?? null,
  };
}

// Extract first JSON object OR array from AI response
function extractJsonFromContent(content: string): unknown {
  if (!content?.trim()) throw new Error('AI vrátila prázdnou odpověď');
  const clean = content.replaceAll(/```[a-z]*\n?|```/gi, '').trim();

  // Try parsing as-is first
  try { return JSON.parse(clean); } catch {}

  // Prefer { over [ (AI often wraps object in array)
  const objStart = clean.indexOf('{');
  const arrStart = clean.indexOf('[');
  const start = objStart !== -1 ? objStart : arrStart;
  if (start === -1) throw new Error('AI nevrátila JSON: ' + content.substring(0, 200));

  const opener = clean[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < clean.length; i++) {
    if (clean[i] === opener) depth++;
    else if (clean[i] === closer) depth--;
    if (depth === 0) {
      try { return JSON.parse(clean.slice(start, i + 1)); } catch {}
      break;
    }
  }

  // Try extractFirstJsonObject as last resort
  return extractFirstJsonObject(content);
}

// Parse a single AI response into multi-reservation format
function parseMultiReservationResponse(content: string): AiParsedMultiReservation {
  const payload = extractJsonFromContent(content);

  // If AI returned a bare array, unwrap or normalize
  if (Array.isArray(payload)) {
    // Array of full response objects (e.g. [{"contact":{},"reservations":[...]}])
    const first = payload[0] as Record<string, unknown> | undefined;
    if (payload.length > 0 && first?.reservations) {
      console.warn('[AI] Got array of response objects, unwrapping first');
      return parseMultiReservationResponse(JSON.stringify(first));
    }
    // Array of reservation entries
    console.warn('[AI] Got array with ' + payload.length + ' items');
    const normalized = (payload as Record<string, unknown>[]).map(normalizeReservationEntry);
    const arrayResult = AiParsedMultiReservationSchema.safeParse({
      contact: {},
      reservations: normalized,
    });
    if (arrayResult.success) return arrayResult.data;
    throw new Error('AI vrátila pole ale položky neodpovídají: ' + JSON.stringify(payload[0]).substring(0, 200));
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('AI vrátila neplatný JSON: ' + content.substring(0, 200));
  }

  const payloadObj = payload as Record<string, unknown>;

  // Try multi-reservation format
  const multiResult = AiParsedMultiReservationSchema.safeParse(payloadObj);
  if (multiResult.success) return multiResult.data;

  // Maybe the object has a "reservations" key that's valid but contact is missing
  if (Array.isArray(payloadObj.reservations)) {
    const wrapped = AiParsedMultiReservationSchema.safeParse({
      contact: payloadObj.contact ?? {},
      reservations: payloadObj.reservations,
    });
    if (wrapped.success) return wrapped.data;
  }

  // Fallback: AI returned single-reservation format — convert it
  const singleResult = AiParsedReservationSchema.safeParse(payloadObj);
  if (singleResult.success) {
    const s = singleResult.data;
    return {
      contact: s.contact ?? {},
      reservations: [{
        date: s.reservation.date,
        adults: s.pax.adults,
        children: s.pax.children,
        infants: s.pax.infants,
        freeTourLeaders: s.pax.freeTourLeaders,
        freeDrivers: s.pax.freeDrivers,
        menu: s.menus?.[0]?.menuName ?? null,
        pricePerPerson: s.menus?.[0]?.unitPrice ?? null,
        notes: s.reservation.notes ?? null,
      }],
      priceCurrency: 'CZK',
    };
  }

  const keys = Object.keys(payloadObj).join(', ');
  throw new Error('AI vrátila neočekávaný formát (klíče: ' + (keys || 'žádné') + ')');
}

// Estimate how many reservation entries are in the text (heuristic: count date-like patterns)
function estimateReservationCount(text: string): number {
  // "7-Jun", "12-Aug" etc.
  const monthNames = text.match(/\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi) ?? [];
  // "29/03/2026" (DD/MM/YYYY) or "02.04.2025" (DD.MM.YYYY)
  const numericDates = text.match(/\d{2}[/.]\d{2}[/.]\d{4}/g) ?? [];
  return monthNames.length + numericDates.length;
}

// Parse tabular format with DD/MM/YYYY or DD.MM.YYYY dates followed by time
// Handles multiple formats: Expat (code before date), Riis (code after service text)
// Filters out cancelled entries
function parseTabularReservations(text: string): AiMultiReservationEntry[] {
  const reservations: AiMultiReservationEntry[] = [];
  // Match DD/MM/YYYY or DD.MM.YYYY followed by time HH:MM
  const dateTimeRegex = /(\d{2})[/.](\d{2})[/.](\d{4})\s+(\d{2}:\d{2})/g;
  let match;

  while ((match = dateTimeRegex.exec(text)) !== null) {
    const day = match[1];
    const month = match[2];
    const year = match[3];
    const time = match[4];
    const date = year + '-' + month + '-' + day;
    const pos = match.index;

    const before = text.substring(Math.max(0, pos - 200), pos).trim();
    const after = text.substring(pos + match[0].length, Math.min(text.length, pos + match[0].length + 300)).trim();

    // Skip cancelled entries
    if (/Cancelled|CANCELLED\s*TOUR/i.test(after.substring(0, 50))) continue;

    // Extract group code:
    // A) Before date: "EB200326  Expat Explore  DATE"
    const codeBefore = before.match(/(\S+)\s+(?:Expat Explore|Group Tour Shop)\s*$/i);
    // B) After date+time+service: "19:30  service text  PRA1033025"
    const codeAfter = after.match(/([A-Z]{2,4}\d{4,}[A-Z0-9]*)\b/);
    const groupCode = codeBefore ? codeBefore[1].trim()
      : codeAfter ? codeAfter[1].trim()
      : '';

    // Extract tour leader info (Expat: after "the year)")
    let notes = 'Čas: ' + time;
    const leaderMatch = after.match(/the year\)\s+(.+?)(?=\s+\S+\s+(?:Expat|Group)|$)/);
    if (leaderMatch) {
      const info = leaderMatch[1].trim();
      if (info && !/^#N\/A|^CANCELLED/i.test(info)) {
        notes += ', TL: ' + info;
      }
    }

    reservations.push({
      date,
      adults: 0,
      children: 0,
      infants: 0,
      freeTourLeaders: 0,
      freeDrivers: 0,
      groupCode: groupCode || null,
      menu: null,
      pricePerPerson: null,
      notes: notes || null,
    });
  }

  return reservations;
}

// Classify a line as group-code, date, month-header, or other
function classifyLine(trimmed: string): 'group' | 'date' | 'month' | 'other' {
  if (/^(PGS|MET|SUN|BC|TUI|FTI|DER|ITS)\s+\d{4}/i.test(trimmed)) return 'group';
  if (/^\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(trimmed)) return 'date';
  if (/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(trimmed)) return 'month';
  return 'other';
}

// Split email text into context header and reservation lines for chunking
function _splitEmailForChunking(text: string): { header: string; reservationLines: string[] } {
  const lines = text.split('\n');
  const headerLines: string[] = [];
  const reservationLines: string[] = [];
  let inReservations = false;
  let currentEntry = '';

  for (const line of lines) {
    const trimmed = line.trim();
    const type = classifyLine(trimmed);

    if (type === 'group') {
      if (currentEntry) reservationLines.push(currentEntry);
      currentEntry = trimmed;
      inReservations = true;
      continue;
    }

    if (type === 'date' && inReservations) {
      reservationLines.push(currentEntry + '\n' + trimmed);
      currentEntry = '';
      continue;
    }

    if (type === 'month') {
      if (currentEntry) { reservationLines.push(currentEntry); currentEntry = ''; }
      inReservations = true;
      continue;
    }

    if (inReservations) {
      if (currentEntry) {
        currentEntry += '\n' + trimmed;
      } else if (trimmed) {
        reservationLines.push(trimmed);
      }
    } else {
      headerLines.push(line);
    }
  }
  if (currentEntry) reservationLines.push(currentEntry);

  return {
    header: headerLines.join('\n').trim(),
    reservationLines,
  };
}

const CHUNK_SIZE = 10; // Max reservations per AI call
const MAX_CONCURRENT = 1; // Sequential to avoid overloading server

// Short system prompt for chunk processing (full prompt is too large for some servers)
function _buildChunkSystemPrompt(headerContext: string): string {
  const currentYear = new Date().getFullYear();
  return 'Extrahuj rezervace do JSON. Rok ' + currentYear + '. Vrať POUZE JSON bez textu kolem.\n'
    + 'Kontext: ' + headerContext.substring(0, 300) + '\n'
    + 'JSON format: {"contact":{},"reservations":[{"date":"YYYY-MM-DD","adults":0,"children":0,"infants":0,"freeTourLeaders":0,"freeDrivers":0,"groupCode":"kod","menu":"","pricePerPerson":null,"notes":""}]}\n'
    + 'Každý řádek s kódem (PGS/MET/SUN/BC...) a datem = jedna rezervace. "7-Jun" = ' + currentYear + '-06-07.';
}

// Shared metadata extracted from email header (applied to all reservations)
interface EmailMetadata {
  contact: AiParsedMultiReservation['contact'];
  adults: number;
  children: number;
  infants: number;
  freeTourLeaders: number;
  freeDrivers: number;
  menu: string | null;
  pricePerPerson: number | null;
  priceCurrency: string;
  nationality: string | null;
  notes: string | null;
}

// Extract contact + shared reservation defaults from email via AI
async function extractEmailMetadata(emailText: string): Promise<EmailMetadata> {
  const currentYear = new Date().getFullYear();
  const prompt = 'Z emailu extrahuj kontakt ODESÍLATELE a sdílené údaje pro VŠECHNY rezervace. Rok ' + currentYear + '. Vrať POUZE JSON.\n'
    + 'DŮLEŽITÉ - text může začínat českými instrukcemi od kolegyně (např. "Jedná se o CK..., rezervuj X osob, menu..."). Tyto instrukce mají NEJVYŠŠÍ prioritu.\n'
    + 'Hledej:\n'
    + '- Počet osob/pax na skupinu (z instrukcí nebo emailu)\n'
    + '- Cenu za osobu (hledej "X Kč/os", "X CZK/pax", "price X CZK", "confirm the price X")\n'
    + '- Menu (tradiční/traditional, kuřecí/chicken, halal, vegetarian...)\n'
    + '- Národnost (Dánsko=DK, Turecko=TR, ...)\n'
    + '- Doprovody: "tour leader/průvodce/sprievodca" = freeTourLeaders, "řidič/driver/šofér" = freeDrivers\n'
    + '- Pokud jen "doprovody zdarma" → freeTourLeaders. "X pax + tour leader and driver" → 1 TL + 1 driver.\n'
    + '- priceCurrency: "CZK","EUR","USD". "Kč" nebo "CZK" = CZK, "EUR" nebo "€" = EUR.\n'
    + '- Kontakt hledej v podpisu emailu ODESÍLATELE (jméno, email, telefon, firma).\n'
    + '- notes: speciální požadavky (např. "perník místo štrůdlu", "platba na fakturu", "transfer v 19h")\n'
    + 'JSON: {"contact":{"name":"","email":"","phone":"","company":"","nationality":""},'
    + '"adults":0,"children":0,"infants":0,"freeTourLeaders":0,"freeDrivers":0,'
    + '"menu":"","pricePerPerson":null,"priceCurrency":"CZK","nationality":"","notes":""}';
  // Build smart excerpt: instructions (top) + price mentions (anywhere) + contact (bottom)
  let excerpt = emailText;
  if (emailText.length > 2000) {
    const parts: string[] = [];
    // Top: user instructions + start of email (first 1000 chars)
    parts.push(emailText.substring(0, 1000));
    // Middle: extract lines mentioning price, pax, menu, currency
    const lines = emailText.split('\n');
    const priceLines = lines.filter(l =>
      /\d+\s*(Kč|CZK|EUR|€|czk|eur)\b/i.test(l) ||
      /price|cen[ua]|pax|confirm.*price|platba|faktur/i.test(l)
    );
    if (priceLines.length > 0) {
      parts.push('\n--- Cenové a platební zmínky z emailu ---');
      parts.push(priceLines.join('\n'));
    }
    // Bottom: contact/signature (last 600 chars)
    parts.push('\n...\n' + emailText.substring(emailText.length - 600));
    excerpt = parts.join('\n');
  }
  const defaults: EmailMetadata = {
    contact: {}, adults: 0, children: 0, infants: 0,
    freeTourLeaders: 0, freeDrivers: 0, menu: null, pricePerPerson: null,
    priceCurrency: 'CZK', nationality: null, notes: null,
  };
  try {
    const content = await aiChatCompletion(prompt, excerpt, true);
    const payload = extractJsonFromContent(content);
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const obj = payload as Record<string, unknown>;
      defaults.contact = AiMultiReservationContactSchema.parse(obj.contact ?? payload);
      defaults.adults = (obj.adults as number) ?? 0;
      defaults.children = (obj.children as number) ?? 0;
      defaults.infants = (obj.infants as number) ?? 0;
      defaults.freeTourLeaders = (obj.freeTourLeaders ?? obj.free_tour_leaders ?? 0) as number;
      defaults.freeDrivers = (obj.freeDrivers ?? obj.free_drivers ?? 0) as number;
      defaults.menu = (obj.menu as string) ?? null;
      defaults.pricePerPerson = (obj.pricePerPerson ?? obj.price_per_person ?? null) as number | null;
      defaults.priceCurrency = (obj.priceCurrency ?? obj.price_currency ?? 'CZK') as string;
      defaults.nationality = (obj.nationality as string) ?? defaults.contact.nationality ?? null;
      defaults.notes = (obj.notes as string) ?? null;
    }
  } catch (e: unknown) {
    console.warn('[AI] Metadata extraction failed:', e instanceof Error ? e.message : String(e));
  }
  return defaults;
}

// Process chunks with limited concurrency
async function processChunksWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from(
    { length: Math.min(maxConcurrent, tasks.length) },
    () => runNext(),
  );
  await Promise.all(workers);
  return results;
}

// Clean up email thread: remove repeated signatures, image descriptions, empty lines
function cleanEmailThread(text: string): string {
  return text
    // Remove image descriptions (Czech auto-generated)
    .replace(/Obsah obrázku[^\n]*/g, '')
    .replace(/Popis byl vytvořen automaticky/g, '')
    // Remove repeated Folklore Garden signatures (keep first occurrence)
    .replace(/(Veronika & team[^]*?INSTAGRAM: folkloregarden)/g, (match, _p1, offset) => {
      return offset < 100 ? match : '[--- podpis ---]';
    })
    // Remove repeated Graficon signatures
    .replace(/(Graficon spol[\s\S]*?www\.graficon\.cz)/g, (match, _p1, offset) => {
      return offset < 500 ? match : '[--- podpis ---]';
    })
    // Collapse multiple empty lines
    .replace(/\n{4,}/g, '\n\n')
    // Remove lines with only spaces/dots/dashes
    .replace(/\n[ …·.─—–-]{5,}\n/g, '\n')
    .trim();
}

// Parse date strings like "7-Jun", "12-Jun", "2-Jul" etc. to YYYY-MM-DD
const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDateString(dateStr: string): string | null {
  const currentYear = new Date().getFullYear();
  // "7-Jun" → "2026-06-07"
  const m = dateStr.match(/^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = MONTH_MAP[m[2].toLowerCase()];
    return currentYear + '-' + month + '-' + day;
  }
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

// Deterministic parser: extract group code + date pairs from structured email
function parseReservationsDeterministic(text: string): AiMultiReservationEntry[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const reservations: AiMultiReservationEntry[] = [];
  const groupCodeRegex = /^(PGS|MET|SUN|BC|TUI|FTI|DER|ITS)\s+\d{2,4}/i;
  const dateRegex = /^\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for pattern: GROUP_CODE on one line, DATE on next line
    if (groupCodeRegex.test(line)) {
      const nextLine = lines[i + 1];
      if (nextLine && dateRegex.test(nextLine)) {
        const date = parseDateString(nextLine);
        if (date) {
          reservations.push({
            date,
            adults: 0,
            children: 0,
            infants: 0,
            freeTourLeaders: 0,
            freeDrivers: 0,
            groupCode: line,
            menu: null,
            pricePerPerson: null,
            notes: null,
          });
          i++; // skip the date line
        }
      }
    }
  }
  return reservations;
}

// Parse multiple reservations from email text
export async function parseMultiReservationWithAI(params: {
  text: string;
}): Promise<AiParsedMultiReservation> {
  const { text } = params;
  const systemPrompt = buildMultiReservationSystemPrompt();

  // Estimate reservation count (date patterns like "7-Jun", "12-Aug")
  const estimatedCount = estimateReservationCount(text);

  console.warn('🔵 [AI v3] estimated=' + estimatedCount + ', len=' + text.length);

  // Strategy 1: Many date patterns (>10) = structured list
  // → Use fast deterministic parser + AI for metadata only
  if (estimatedCount > CHUNK_SIZE) {
    console.warn('[AI] Structured list detected (' + estimatedCount + ' dates), using deterministic parser');
    // Try both parsers and use whichever finds more results
    const formatA = parseReservationsDeterministic(text); // "GROUP_CODE\n7-Jun" style
    const formatB = parseTabularReservations(text); // "TOURCODE  DD/MM/YYYY" tabular style
    const reservations = formatA.length >= formatB.length ? formatA : formatB;
    console.warn('[AI] Parser results: formatA=' + formatA.length + ', formatB=' + formatB.length + ', using=' + reservations.length);
    if (reservations.length > 0) {
      const meta = await extractEmailMetadata(text);
      console.warn('[AI] Deterministic: ' + reservations.length + ' reservations, meta:', JSON.stringify(meta));
      for (const r of reservations) {
        r.adults = meta.adults || r.adults;
        r.children = meta.children || r.children;
        r.infants = meta.infants || r.infants;
        r.freeTourLeaders = meta.freeTourLeaders || r.freeTourLeaders;
        r.freeDrivers = meta.freeDrivers || r.freeDrivers;
        r.menu = meta.menu || r.menu;
        r.pricePerPerson = meta.pricePerPerson || r.pricePerPerson;
        if (meta.notes) {
          r.notes = r.notes ? r.notes + ', ' + meta.notes : meta.notes;
        }
      }
      const contact = meta.contact;
      if (meta.nationality && !contact.nationality) {
        contact.nationality = meta.nationality;
      }
      return { contact, reservations, priceCurrency: meta.priceCurrency };
    }
  }

  // Strategy 2: Few/no date patterns = email conversation or complex format
  // → Use full AI parsing (single call with complete system prompt)
  // Clean up email: strip repeated signatures and boilerplate to fit context
  const cleanedEmail = cleanEmailThread(text);
  const maxEmailChars = 4000;
  let emailForAi = cleanedEmail;
  if (cleanedEmail.length > maxEmailChars) {
    emailForAi = cleanedEmail.substring(0, maxEmailChars) + '\n\n[... starší část vlákna oříznutá ...]';
    console.warn('[AI] Email truncated from ' + cleanedEmail.length + ' to ' + maxEmailChars + ' chars');
  }
  console.warn('[AI] Using full AI parsing (' + emailForAi.length + ' chars, original ' + text.length + ')');
  const content = await aiChatCompletion(systemPrompt, emailForAi, true);
  return parseMultiReservationResponse(content);
}

// Process reservations via structured chunks (group code + date pairs)
async function _processChunkedReservations(
  chunkPrompt: string,
  _header: string,
  reservationLines: string[],
): Promise<AiParsedMultiReservation> {
  const chunks: string[][] = [];
  for (let i = 0; i < reservationLines.length; i += CHUNK_SIZE) {
    chunks.push(reservationLines.slice(i, i + CHUNK_SIZE));
  }

  console.warn('[AI] Structured chunking: ' + chunks.length + ' chunks of ~' + CHUNK_SIZE);

  const tasks = chunks.map((chunk, idx) => async () => {
    const label = (idx + 1) + '/' + chunks.length;
    const chunkText = chunk.join('\n');
    console.warn('[AI] Chunk ' + label + ': ' + chunk.length + ' entries');
    const content = await aiChatCompletion(chunkPrompt, chunkText, true);
    return parseMultiReservationResponse(content);
  });

  return _mergeChunkResults(await processChunksWithConcurrency(tasks, MAX_CONCURRENT));
}

// Fallback: split text into roughly equal parts by lines
async function _processNaiveChunkedReservations(
  chunkPrompt: string,
  text: string,
): Promise<AiParsedMultiReservation> {
  const lines = text.split('\n');
  const linesPerChunk = 20; // ~10 reservations × 2 lines each
  const chunks: string[] = [];

  for (let i = 0; i < lines.length; i += linesPerChunk) {
    chunks.push(lines.slice(i, i + linesPerChunk).join('\n'));
  }

  // If only one chunk, just send it directly
  if (chunks.length <= 1) {
    const content = await aiChatCompletion(chunkPrompt, text, true);
    return parseMultiReservationResponse(content);
  }

  console.warn('[AI] Naive chunking: ' + chunks.length + ' chunks of ~' + linesPerChunk + ' lines');

  const tasks = chunks.map((chunk, idx) => async () => {
    const label = (idx + 1) + '/' + chunks.length;
    console.warn('[AI] Naive chunk ' + label + ': ' + chunk.length + ' chars');
    const content = await aiChatCompletion(chunkPrompt, chunk, true);
    return parseMultiReservationResponse(content);
  });

  return _mergeChunkResults(await processChunksWithConcurrency(tasks, MAX_CONCURRENT));
}

// Merge results from multiple chunks
function _mergeChunkResults(results: AiParsedMultiReservation[]): AiParsedMultiReservation {
  const merged: AiParsedMultiReservation = {
    contact: results[0].contact,
    reservations: results.flatMap(r => r.reservations),
    priceCurrency: results[0].priceCurrency,
  };
  console.warn('[AI] Merged ' + results.length + ' chunks -> ' + merged.reservations.length + ' total reservations');
  return merged;
}
