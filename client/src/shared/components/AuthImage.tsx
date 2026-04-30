import { useEffect, useState } from "react";
import { apiClient } from "@/shared/lib/api";
import { Loader2, ImageOff } from "lucide-react";

interface Props {
  /** Relative API URL (např. /api/tickets/20/attachments/5). */
  src: string;
  alt?: string;
  className?: string;
  /** Volitelný onClick — když se obrázek používá jako thumbnail v lightboxu. */
  onClick?: () => void;
}

/**
 * `<img>` wrapper, který načte URL přes axios (s `Authorization: Bearer` header)
 * a převede response na blob URL. Bez toho by `<img src>` šel přímo z prohlížeče
 * bez JWT a auth-protected endpointy by vracely 401 → prázdný obrázek.
 *
 * Blob URL se cleanupne při unmountu nebo změně src (žádný memory leak).
 */
export function AuthImage({ src, alt = "", className, onClick }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    setError(null);
    setBlobUrl(null);

    apiClient
      .get<Blob>(src, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(res.data);
        setBlobUrl(createdUrl);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e?.response?.status === 401
          ? "Nemáš oprávnění (401)"
          : e?.response?.status === 404
          ? "Soubor nenalezen (404)"
          : (e instanceof Error ? e.message : "Chyba načítání");
        setError(msg);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  if (error) {
    return (
      <div className={`${className ?? ""} flex flex-col items-center justify-center bg-muted/30 text-muted-foreground p-2`}>
        <ImageOff className="w-6 h-6 mb-1" />
        <span className="text-xs text-center">{error}</span>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className={`${className ?? ""} flex items-center justify-center bg-muted/20`}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} onClick={onClick} />;
}
