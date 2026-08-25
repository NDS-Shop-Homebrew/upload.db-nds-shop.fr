import { useEffect, useState } from "react";
import { ThumbsUp, Trash2, RefreshCw, Loader2, Inbox } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";

interface RequestRow {
  id: string;
  title: string;
  systems: string | null;
  note: string | null;
  requester: string | null;
  createdAt: string;
  votes: number;
}

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Requests() {
  const { isAdmin } = useAuth();
  const { t } = useUI();
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/admin/requests`, { credentials: "include" });
      setRows(r.ok ? await r.json() : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm(t("requests.confirmDelete"))) return;
    setDeleting(id);
    try {
      await fetch(`${API_URL}/api/admin/requests/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? []);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("requests.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("requests.subtitle")}</p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}{" "}
          {t("requests.refresh")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3 text-muted-foreground">
            <Inbox size={32} />
            <p className="text-sm">{t("requests.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[
                        r.systems,
                        `${t("requests.requesterCol")}: ${r.requester || t("requests.anonymous")}`,
                        new Date(r.createdAt).toLocaleDateString(),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {r.note && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ThumbsUp size={14} /> {r.votes}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={!isAdmin || deleting === r.id}
                      title={!isAdmin ? undefined : t("requests.delete")}
                      onClick={() => remove(r.id)}
                    >
                      {deleting === r.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
