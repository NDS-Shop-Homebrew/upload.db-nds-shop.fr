import { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Link } from "react-router-dom";
import { Search, Plus, Edit } from "lucide-react";
import BuildStatus from "../components/BuildStatus";

interface Game {
  title: string;
  author: string;
  version: string;
  updated: string;
  fileName?: string;
}

type SortKey = "title" | "author" | "version" | "updated";
type SortOrder = "asc" | "desc";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

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
          g.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") + ".json",
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
    <div className="p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bibliothèque de jeux
          </h1>
          <p className="text-muted-foreground">
            Gérez vos fichiers JSON et métadonnées.
          </p>
        </div>
        <Link to="/edit/new">
          <Button className="gap-2">
            <Plus size={18} />
            Ajouter un jeu
          </Button>
        </Link>
      </div>

      <BuildStatus onTriggered={() => fetchGames()} />

      <div className="flex flex-col md:flex-row items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            placeholder="Rechercher par titre ou auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Titre</SelectItem>
              <SelectItem value="author">Auteur</SelectItem>
              <SelectItem value="version">Version</SelectItem>
              <SelectItem value="updated">Mise à jour</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as SortOrder)}
          >
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

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead className="hidden md:table-cell">Auteur</TableHead>
              <TableHead className="hidden md:table-cell">Version</TableHead>
              <TableHead className="hidden md:table-cell">
                Dernière MAJ
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredGames.length > 0 ? (
              filteredGames.map((game) => (
                <TableRow key={game.fileName}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{game.title}</span>
                      <span className="text-xs text-muted-foreground md:hidden">
                        {game.author}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {game.author}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {game.version}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(game.updated).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/edit/${game.fileName}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Edit size={14} />
                        Modifier
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Aucun jeu trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
