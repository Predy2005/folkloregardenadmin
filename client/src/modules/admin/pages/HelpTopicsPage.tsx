import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/shared/lib/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { PageHeader } from "@/shared/components/PageHeader";
import { useToast } from "@/shared/hooks/use-toast";

interface Topic {
  id: number;
  slug: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
  relatedRoutes: string[];
  updatedAt: string;
}

type Draft = Omit<Topic, "id" | "updatedAt"> & { id?: number };

const EMPTY: Draft = {
  slug: "",
  title: "",
  category: "general",
  content: "",
  keywords: [],
  relatedRoutes: [],
};

export default function HelpTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const data = await api.get<Topic[]>("/api/documentation-topics");
    setTopics(data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async () => {
    if (!selected) return;
    if (!selected.title.trim()) {
      toast({ title: "Chybí název", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (selected.id) {
        await api.put(`/api/documentation-topics/${selected.id}`, selected);
      } else {
        await api.post(`/api/documentation-topics`, selected);
      }
      toast({ title: "Uloženo" });
      await load();
      setSelected(null);
    } catch (err) {
      toast({ title: "Chyba při ukládání", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [selected, toast, load]);

  const remove = useCallback(async (id: number) => {
    if (!confirm("Smazat téma?")) return;
    await api.delete(`/api/documentation-topics/${id}`);
    toast({ title: "Smazáno" });
    await load();
    if (selected?.id === id) setSelected(null);
  }, [load, selected, toast]);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Nápověda / AI dokumentace"
        description="Témata, ve kterých AI asistent vyhledává odpovědi na dotazy uživatelů."
      >
        <Button onClick={() => setSelected({ ...EMPTY })}>
          <Plus className="w-4 h-4 mr-1" /> Nové téma
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="border rounded-md divide-y max-h-[70vh] overflow-y-auto">
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected({ ...t })}
              className={`w-full text-left px-3 py-2 hover:bg-muted text-sm ${selected?.id === t.id ? "bg-muted" : ""}`}
            >
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-muted-foreground">{t.category} · {t.keywords.length} klíč. slov</div>
            </button>
          ))}
          {topics.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Žádná témata.</div>
          )}
        </div>

        <div>
          {selected ? (
            <div className="space-y-3 border rounded-md p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {selected.id ? "Upravit téma" : "Nové téma"}
                </h2>
                <div className="flex gap-2">
                  {selected.id && (
                    <Button variant="destructive" size="sm" onClick={() => remove(selected.id!)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={save} disabled={saving}>
                    <Save className="w-4 h-4 mr-1" /> Uložit
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Název</Label>
                  <Input
                    value={selected.title}
                    onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Kategorie</Label>
                  <Input
                    value={selected.category}
                    onChange={(e) => setSelected({ ...selected, category: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Slug {selected.id ? "(neměnit)" : "(nechat prázdné = podle názvu)"}</Label>
                <Input
                  value={selected.slug}
                  onChange={(e) => setSelected({ ...selected, slug: e.target.value })}
                  disabled={!!selected.id}
                />
              </div>

              <div>
                <Label>Klíčová slova (čárkou oddělená)</Label>
                <Input
                  value={selected.keywords.join(", ")}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>

              <div>
                <Label>Související routy (čárkou oddělené)</Label>
                <Input
                  value={selected.relatedRoutes.join(", ")}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      relatedRoutes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>

              <div>
                <Label>Obsah (zobrazí se AI asistentovi)</Label>
                <Textarea
                  rows={14}
                  value={selected.content}
                  onChange={(e) => setSelected({ ...selected, content: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="border rounded-md p-8 text-center text-sm text-muted-foreground">
              Vyber téma vlevo, nebo klikni na „Nové téma".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
