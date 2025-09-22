import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";

interface DownloadFile {
  url: string;
}

interface Screenshot {
  url: string;
  description: string;
}

interface ScriptStep {
  type: string;
  file?: string;
  input?: string;
  output?: string;
  message?: string;
  count?: number;
}

interface Game {
  title: string;
  author: string;
  categories: string[];
  systems: string[];
  downloads: Record<string, DownloadFile>;
  screenshots: Screenshot[];
  icon: string;
  version: string;
  updated: string;
  scripts: Record<string, ScriptStep[]>;
  fileName?: string;
}

export default function EditGameForm() {
  const { fileName } = useParams<{ fileName: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<Game>({
    title: "",
    author: "",
    categories: [],
    systems: [],
    downloads: {},
    screenshots: [],
    icon: "",
    version: "",
    updated: new Date().toISOString(),
    scripts: {},
  });

  const [newCategory, setNewCategory] = useState("");
  const [newSystem, setNewSystem] = useState("");

  useEffect(() => {
    if (fileName && fileName !== "new") {
      fetch(`http://localhost:3000/api/games`)
        .then((res) => res.json())
        .then((data: Game[]) => {
          const gameData = data.find((g) => {
            const generatedFileName =
              g.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "") + ".json";
            return generatedFileName === fileName;
          });
          if (gameData) setGame(gameData);
        });
    }
  }, [fileName]);

  const addCategory = () => {
    if (newCategory.trim()) {
      setGame((prev) => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()],
      }));
      setNewCategory("");
    }
  };

  const addSystem = () => {
    if (newSystem.trim()) {
      setGame((prev) => ({
        ...prev,
        systems: [...prev.systems, newSystem.trim()],
      }));
      setNewSystem("");
    }
  };

  const handleSubmit = async () => {
    const isNew = fileName === "new";

    // Générer le nom de fichier automatiquement si nouveau
    const generatedFileName = isNew
      ? game.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") + ".json"
      : fileName;

    await fetch(
      isNew
        ? "http://localhost:3000/api/games"
        : `http://localhost:3000/api/games/${generatedFileName}`,
      {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(game, null, 2),
      }
    );

    alert("Jeu sauvegardé !");
    navigate("/");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        {fileName === "new"
          ? "Ajouter un nouveau jeu"
          : `Modifier ${game.title}`}
      </h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">Titre</label>
          <Input
            value={game.title}
            onChange={(e) => setGame({ ...game, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Auteur</label>
          <Input
            value={game.author}
            onChange={(e) => setGame({ ...game, author: e.target.value })}
          />
        </div>

        {/* Categories */}
        <div>
          <label className="block mb-1 font-semibold">Catégories</label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Ajouter une catégorie"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <Button onClick={addCategory}>Ajouter</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {game.categories.map((c, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Systems */}
        <div>
          <label className="block mb-1 font-semibold">Systèmes</label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Ajouter un système"
              value={newSystem}
              onChange={(e) => setNewSystem(e.target.value)}
            />
            <Button onClick={addSystem}>Ajouter</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {game.systems.map((s, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-green-100 text-green-800 rounded"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className="block mb-1 font-semibold">Icon URL</label>
          <Input
            value={game.icon}
            onChange={(e) => setGame({ ...game, icon: e.target.value })}
          />
        </div>

        {/* Version */}
        <div>
          <label className="block mb-1 font-semibold">Version</label>
          <Input
            value={game.version}
            onChange={(e) => setGame({ ...game, version: e.target.value })}
          />
        </div>

        {/* Updated */}
        <div>
          <label className="block mb-1 font-semibold">
            Date de mise à jour
          </label>
          <Input
            type="datetime-local"
            value={new Date(game.updated).toISOString().slice(0, 16)}
            onChange={(e) =>
              setGame({
                ...game,
                updated: new Date(e.target.value).toISOString(),
              })
            }
          />
        </div>

        {/* Downloads */}
        <div>
          <label className="block mb-1 font-semibold">
            Téléchargements (clé → URL)
          </label>
          <Textarea
            placeholder="Nom du fichier : URL"
            value={Object.entries(game.downloads)
              .map(([key, val]) => `${key} : ${val.url}`)
              .join("\n")}
            onChange={(e) => {
              const lines = e.target.value.split("\n");
              const obj: Record<string, DownloadFile> = {};
              lines.forEach((line) => {
                const [key, ...rest] = line.split(":");
                if (key && rest.length)
                  obj[key.trim()] = { url: rest.join(":").trim() };
              });
              setGame({ ...game, downloads: obj });
            }}
            rows={4}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit}>Sauvegarder</Button>
        <Button variant="secondary" onClick={() => navigate("/")}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
