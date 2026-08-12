import { useEffect, useState, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Link } from "react-router-dom";
import { Search, Plus, Edit, Image as ImageIcon } from "lucide-react";
import BuildStatus from "../components/BuildStatus";

interface Game {
  title: string;
  author: string;
  version: string;
  updated: string;
  titleId?: string;
  icon?: string;
  screenshots?: { description: string; url: string }[];
  fileName?: string;
}

type SortKey = "title" | "author" | "updated";
type SortOrder = "asc" | "desc";

const API_URL = import.meta.env.VITE_API_URL || "";

function CompletionBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
        ok ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-muted-foreground/50"}`} />
      {label}
    </span>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isLoading, setIsLoading] = useState(true);

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/games`);
      if (!res.ok) throw new Error("Erreur serveur");
      const data: Game[] = await res.json();
      const gamesWithFileName = data.map((g) => ({
        ...g,
        fileName:
          g.fileName ||
          g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".json",
      }));
      setGames(gamesWithFileName);
    } catch (err) {
      console.error("Erreur récupération jeux :", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const filteredGames = useMemo(() => {
    return [...games]
      .filter(
        (g) =>
          g.title.toLowerCase().includes(search.toLowerCase()) ||
          g.author.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        if (sortKey === "updated") {
          const timeA = new Date(a.updated).getTime();
          const timeB = new Date(b.updated).getTime();
          return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
        }
        const valA = (a[sortKey] || "").toString().toLowerCase();
        const valB = (b[sortKey] || "").toString().toLowerCase();
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [games, search, sortKey, sortOrder]);

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bibliothèque de jeux</h1>
          <p className="text-muted-foreground text-sm">Gérez vos fichiers JSON et métadonnées.</p>
        </div>
        <Link to="/edit/new">
          <Button className="gap-2">
            <Plus size={18} /> Ajouter un jeu
          </Button>
        </Link>
      </div>

      <BuildStatus onTriggered={() => fetchGames()} />

      <div className="flex flex-col md:flex-row items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Rechercher par titre ou auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Titre</SelectItem>
              <SelectItem value="author">Auteur</SelectItem>
              <SelectItem value="updated">Mise à jour</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Ordre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Croissant</SelectItem>
              <SelectItem value="desc">Décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border p-4">
              <div className="w-20 h-20 mx-auto rounded-lg bg-muted mb-3" />
              <div className="h-4 w-3/4 rounded bg-muted mb-2 mx-auto" />
              <div className="h-3 w-1/2 rounded bg-muted mx-auto" />
            </div>
          ))}
        </div>
      ) : filteredGames.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGames.map((game) => {
            const hasBoxart = game.screenshots?.some((s) => s.description === "Boxart");
            const hasShot = game.screenshots?.some((s) => s.description !== "Boxart");
            return (
              <div key={game.fileName} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="rounded-lg overflow-hidden bg-muted mb-3 ring-1 ring-border">
                  {game.icon ? (
                    <img src={game.icon} alt="" className="w-20 h-20 mx-auto object-contain" />
                  ) : (
                    <div className="w-20 h-20 mx-auto flex items-center justify-center text-muted-foreground">
                      <ImageIcon size={28} />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm line-clamp-2 leading-snug">{game.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">{game.author}</p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <CompletionBadge ok={!!game.icon} label="Icône" />
                  <CompletionBadge ok={!!game.titleId} label="TitleID" />
                  <CompletionBadge ok={!!hasBoxart} label="Boxart" />
                  <CompletionBadge ok={!!hasShot} label="Screens" />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {new Date(game.updated).toLocaleDateString()}
                  </span>
                  <Link to={`/edit/${game.fileName}`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Edit size={14} /> Modifier
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          Aucun jeu trouvé.
        </div>
      )}
    </div>
  );
}