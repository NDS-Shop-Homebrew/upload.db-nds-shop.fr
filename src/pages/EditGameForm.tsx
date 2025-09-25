import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

interface Screenshot {
  url: string;
  description: string;
}
interface Downloads {
  [name: string]: { url: string };
}
interface Game {
  title: string;
  author: string;
  categories: string[];
  systems: string[];
  downloads: Downloads;
  screenshots: Screenshot[];
  icon: string;
  version: string;
  updated: string;
}

const availableCategories = ["game", "homebrew", "emulator"];
const availableSystems = ["DS", "3DS"];
const availableVersions = ["(Europe)", "(Europe) (En,Fr,De,Es,It)"];

const formatDate = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+02:00`;
};

export default function EditGameForm() {
  const { fileName } = useParams<{ fileName: string }>();
  const [game, setGame] = useState<Game>({
    title: "",
    author: "",
    categories: ["game"],
    systems: ["DS"],
    downloads: {},
    screenshots: [],
    icon: "",
    version: "",
    updated: formatDate(),
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forwarderFile, setForwarderFile] = useState<string | null>(null);

  useEffect(() => {
    if (!fileName || fileName === "new") return;
    const fetchGame = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:3000/api/games");
        const games: Game[] = await res.json();
        const g = games.find(
          (game) =>
            `${game.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")}.json` === fileName
        );
        if (g) setGame({ ...g, updated: g.updated });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [fileName]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGame((prev) => ({ ...prev, [name]: value }));
  };

  const toggleArrayValue = (field: "categories" | "systems", value: string) => {
    setGame((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  const uploadFile = async (endpoint: string, file: File, field: string) => {
    try {
      const formData = new FormData();
      formData.append(field, file);
      const res = await fetch(`http://localhost:3000/api/upload/${endpoint}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (err) {
      console.error(err);
      setError(`Erreur upload ${endpoint}: ${err}`);
      return null;
    }
  };

  const handleUpload = async (
    type: "icon" | "screenshot" | "nds" | "cia",
    file: File
  ) => {
    const data = await uploadFile(type, file, type);
    if (!data) return;
    if (type === "icon") setGame((prev) => ({ ...prev, icon: data.url }));
    if (type === "screenshot")
      setGame((prev) => ({
        ...prev,
        screenshots: [
          ...prev.screenshots,
          {
            url: `https://db-nds-shop.fr/assets/images/boxart/${encodeURIComponent(
              file.name
            )}`,
            description: "Boxart",
          },
        ],
      }));
    if (type === "nds")
      setGame((prev) => ({
        ...prev,
        downloads: {
          ...prev.downloads,
          [file.name]: {
            url: `https://db-nds-shop.fr/games/${encodeURIComponent(
              file.name
            )}`,
          },
        },
      }));
    if (type === "cia") setForwarderFile(file.name);
  };

  const saveGame = async () => {
    setMessage(null);
    setError(null);
    const method = fileName && fileName !== "new" ? "PUT" : "POST";
    const url =
      method === "PUT"
        ? `http://localhost:3000/api/games/${fileName}`
        : "http://localhost:3000/api/games";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(game),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage(
        method === "PUT"
          ? "Jeu mis à jour avec succès"
          : "Nouveau jeu créé avec succès"
      );
    } catch (err: any) {
      console.error(err);
      setError(`Erreur lors de la sauvegarde: ${err.message}`);
    }
  };

  const renderFileInput = (
    label: string,
    accept: string,
    type: "icon" | "screenshot" | "nds" | "cia",
    multiple = false
  ) => {
    const selectedFiles =
      type === "icon"
        ? game.icon
          ? [game.icon.split("/").pop()!]
          : []
        : type === "screenshot"
        ? game.screenshots.map((s) => s.url.split("/").pop()!)
        : type === "nds"
        ? Object.keys(game.downloads).filter((n) => n.endsWith(".nds"))
        : type === "cia"
        ? forwarderFile
          ? [forwarderFile]
          : []
        : [];
    return (
      <div>
        <Label>{label}</Label>
        <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded cursor-pointer mt-2">
          Sélectionner
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={(e) => {
              if (!e.target.files) return;
              Array.from(e.target.files).forEach((f) => handleUpload(type, f));
            }}
          />
        </label>
        {selectedFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedFiles.map((f, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-gray-800 text-white rounded text-xs"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-6 text-center">Chargement...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Card className="shadow-xl dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Ajouter / Éditer un jeu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                name="title"
                value={game.title}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="author">Auteur</Label>
              <Input
                id="author"
                name="author"
                value={game.author}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Version</Label>
              <div className="flex gap-4 mt-2">
                {availableVersions.map((v) => (
                  <div key={v} className="flex items-center space-x-2">
                    <Checkbox
                      checked={game.version === v}
                      onCheckedChange={() =>
                        setGame((prev) => ({ ...prev, version: v }))
                      }
                    />
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="updated">Mise à jour</Label>
              <Input
                type="datetime-local"
                id="updated"
                name="updated"
                value={game.updated}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Catégories</Label>
            <div className="flex gap-4 mt-2">
              {availableCategories.map((c) => (
                <div key={c} className="flex items-center space-x-2">
                  <Checkbox
                    checked={game.categories.includes(c)}
                    onCheckedChange={() => toggleArrayValue("categories", c)}
                  />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Systèmes</Label>
            <div className="flex gap-4 mt-2">
              {availableSystems.map((s) => (
                <div key={s} className="flex items-center space-x-2">
                  <Checkbox
                    checked={game.systems.includes(s)}
                    onCheckedChange={() => toggleArrayValue("systems", s)}
                  />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {renderFileInput("Icône", ".png,.jpg,.jpeg", "icon")}
          {renderFileInput(
            "Screenshots",
            ".png,.jpg,.jpeg",
            "screenshot",
            true
          )}
          {renderFileInput("ROM (.nds)", ".nds", "nds")}
          {renderFileInput("Forwarder (.cia)", ".cia", "cia")}

          <div className="pt-4 flex flex-col gap-2">
            <Button
              onClick={saveGame}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Sauvegarder
            </Button>
            {message && <p className="text-green-400">{message}</p>}
            {error && <p className="text-red-400">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
