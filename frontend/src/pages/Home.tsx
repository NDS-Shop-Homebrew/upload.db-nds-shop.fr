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
import { Input } from "../components/ui/input"; // shadecn/ui
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"; // shadecn/ui
import { Link } from "react-router-dom";

interface Game {
  title: string;  
  author: string;
  version: string;
  updated: string;
  fileName: string;
}

type SortKey = "title" | "author" | "version" | "updated";
type SortOrder = "asc" | "desc";

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const fetchGames = async () => {
    try {
      const res = await fetch("http://localhost:3002/api/games");
      const data: Game[] = await res.json();

      const gamesWithFileName = data.map((g: Game) => ({
        ...g,
        fileName:
          g.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") + ".json",
      }));

      setGames(gamesWithFileName);
    } catch (err) {
      console.error("Erreur récupération jeux :", err);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const filteredGames = useMemo(() => {
    return games
      .filter(
        (g) =>
          g.title.toLowerCase().includes(search.toLowerCase()) ||
          g.author.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        let valA: string | number = a[sortKey];
        let valB: string | number = b[sortKey];

        if (sortKey === "updated") {
          valA = new Date(a.updated).getTime();
          valB = new Date(b.updated).getTime();
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [games, search, sortKey, sortOrder]);

  return (
    <div className="p-8 w-full space-y-6 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Liste des jeux</h1>
        <Link to="/edit/new">
          <Button>Ajouter un jeu</Button>
        </Link>
      </div>

      {/* Recherche et tri */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-4 space-y-2 sm:space-y-0">
        <Input
          placeholder="Rechercher par titre ou auteur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500"
        />

        <Select
          value={sortKey}
          onValueChange={(value) => setSortKey(value as SortKey)}
        >
          <SelectTrigger className="w-48 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <SelectItem value="title">Titre</SelectItem>
            <SelectItem value="author">Auteur</SelectItem>
            <SelectItem value="version">Version</SelectItem>
            <SelectItem value="updated">Mise à jour</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortOrder}
          onValueChange={(value) => setSortOrder(value as SortOrder)}
        >
          <SelectTrigger className="w-32 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
            <SelectValue placeholder="Ordre" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <SelectItem value="asc">Croissant</SelectItem>
            <SelectItem value="desc">Décroissant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <Table className="w-full table-auto border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <TableHeader>
            <TableRow>
              <TableHead>Fichier</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Mise à jour</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredGames.length > 0 ? (
              filteredGames.map((game) => (
                <TableRow
                  key={game.fileName}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <TableCell>{game.fileName}</TableCell>
                  <TableCell>{game.title}</TableCell>
                  <TableCell>{game.author}</TableCell>
                  <TableCell>{game.version}</TableCell>
                  <TableCell>
                    {new Date(game.updated).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link to={`/edit/${game.fileName}`}>
                      <Button size="sm">Modifier</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-gray-500 dark:text-gray-400"
                >
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
