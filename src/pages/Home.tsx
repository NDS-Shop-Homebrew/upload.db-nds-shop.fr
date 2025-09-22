import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

interface Game {
  title: string;
  author: string;
  version: string;
  updated: string;
  fileName: string;
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);

  const fetchGames = async () => {
    try {
      // On appelle directement ton backend Express
      const res = await fetch("http://localhost:3000/api/games");
      const data: Game[] = await res.json();

      // On ajoute le nom de fichier pour chaque jeu
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Liste des jeux</h1>
        <Link to="/edit/new">
          <Button>Ajouter un jeu</Button>
        </Link>
      </div>

      <Table>
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
          {games.length > 0 ? (
            games.map((game) => (
              <TableRow key={game.fileName}>
                <TableCell>{game.fileName}</TableCell>
                <TableCell>{game.title}</TableCell>
                <TableCell>{game.author}</TableCell>
                <TableCell>{game.version}</TableCell>
                <TableCell>
                  {new Date(game.updated).toLocaleDateString()}
                </TableCell>
                <TableCell className="space-x-2">
                  <Link to={`/edit/${game.fileName}`}>
                    <Button size="sm">Modifier</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500">
                Aucun jeu trouvé. Cliquez sur “Ajouter un jeu” pour en créer un.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
