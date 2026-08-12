import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { ArrowLeft, Save, Lock, Sparkles } from "lucide-react";
import { FileUploader } from "../components/FileUploader";

interface Screenshot {
  url: string;
  description: string;
}
interface Downloads {
  [name: string]: { url: string };
}
interface Game {
  title: string;
  titleId?: string;
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
const availableVersions = [
  "(Europe)",
  "(Europe) (En,Fr,De,Es,It)",
  "(USA)",
  "(Japan)",
];

const API_URL = import.meta.env.VITE_API_URL || "";

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+02:00`;
};

export default function EditGameForm() {
  const { fileName } = useParams<{ fileName: string }>();
  const navigate = useNavigate();
  const isNew = !fileName || fileName === "new";

  const [game, setGame] = useState<Game>({
    title: "",
    author: "",
    categories: ["game"],
    systems: ["DS"],
    downloads: {},
    screenshots: [],
    icon: "",
    version: "(Europe)",
    updated: formatDate(),
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [forwarderFile, setForwarderFile] = useState<string | null>(null);

  const analyzeNds = async (file: File) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("nds", file);
      const res = await fetch(`${API_URL}/api/analyze/nds`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const meta = await res.json();
      const title = meta.title?.split("\n")[0] || "";
      setGame((prev) => ({
        ...prev,
        title: prev.title || title,
        titleId: meta.titleId || prev.titleId,
        author: prev.author || meta.developer || "",
      }));
      if (meta.titleId)
        setMessage({
          text: `ROM analysée: ${title} (${meta.titleId})${meta.developer ? " — " + meta.developer : ""}`,
          type: "success",
        });
    } catch (err) {
      setMessage({ text: "Analyse ROM impossible", type: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isNew) return;
    const fetchGame = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/games`);
        if (!res.ok) throw new Error("Erreur de chargement");
        const games: Game[] = await res.json();
        const g = games.find(
          (game) =>
            `${game.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")}.json` === fileName,
        );
        if (g) {
          setGame(g);
          // Déduit le forwarder .cia depuis la première ROM .nds
          const ndsName = Object.keys(g.downloads || {}).find((k) => /\.nds$/i.test(k));
          if (ndsName) setForwarderFile(ndsName.replace(/\.nds$/i, ".cia"));
        }
      } catch (err) {
        console.error(err);
        setMessage({ text: "Erreur lors du chargement du jeu", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [fileName, isNew]);

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
      const res = await fetch(`${API_URL}/api/upload/${endpoint}`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (err) {
      console.error(err);
      setMessage({ text: `Erreur upload ${endpoint}`, type: "error" });
      return null;
    }
  };

  const handleUpload = async (
    type: "icon" | "screenshot" | "nds" | "cia",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    setMessage(null);

    const files = Array.from(e.target.files);

    for (const file of files) {
      if (type === "nds" && isNew) await analyzeNds(file);

      const data = await uploadFile(type, file, type);
      if (!data) continue;

      if (type === "icon") {
        setGame((prev) => ({ ...prev, icon: data.url }));
      } else if (type === "screenshot") {
        setGame((prev) => ({
          ...prev,
          screenshots: [
            ...prev.screenshots,
            { url: data.url, description: "Boxart" },
          ],
        }));
      } else if (type === "nds") {
        setGame((prev) => ({
          ...prev,
          downloads: {
            ...prev.downloads,
            [file.name]: { url: data.url },
          },
        }));
        // Le forwarder .cia a le même nom que le .nds (généré par le build)
        const ciaName = file.name.replace(/\.nds$/i, ".cia");
        setForwarderFile(ciaName);
      } else if (type === "cia") {
        setForwarderFile(file.name);
      }
    }

    setUploading(false);
  };

  const removeFile = (type: "screenshot" | "nds", identifier: string) => {
    if (type === "screenshot") {
      setGame((prev) => ({
        ...prev,
        screenshots: prev.screenshots.filter((s) => s.url !== identifier),
      }));
    } else if (type === "nds") {
      setGame((prev) => {
        const newDownloads = { ...prev.downloads };
        delete newDownloads[identifier];
        return { ...prev, downloads: newDownloads };
      });
    }
  };

  const saveGame = async () => {
    if (!game.title) {
      setMessage({ text: "Le titre est obligatoire", type: "error" });
      return;
    }

    setMessage(null);
    const method = isNew ? "POST" : "PUT";
    const url = isNew
      ? `${API_URL}/api/games`
      : `${API_URL}/api/games/${fileName}`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ ...game, updated: formatDate() }),
      });

      if (res.status === 409) {
        const data = await res.json();
        setMessage({
          text: `Ce jeu existe déjà (${data.fileName}).`,
          type: "error",
        });
        if (data.fileName)
          setTimeout(
            () => navigate(`/edit/${data.fileName}`, { replace: true }),
            2000,
          );
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setMessage({
        text: data.message || "Sauvegardé avec succès",
        type: "success",
      });

      if (isNew && data.fileName) {
        setTimeout(
          () => navigate(`/edit/${data.fileName}`, { replace: true }),
          1500,
        );
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Erreur lors de la sauvegarde", type: "error" });
    }
  };

  const getFileItems = (type: "icon" | "screenshot" | "nds" | "cia") => {
    if (type === "icon" && game.icon)
      return [{ id: game.icon, display: game.icon.split("/").pop()! }];
    if (type === "screenshot")
      return game.screenshots.map((s) => ({
        id: s.url,
        display: s.url.split("/").pop()!,
      }));
    if (type === "nds")
      return Object.keys(game.downloads).map((k) => ({ id: k, display: k }));
    if (type === "cia" && forwarderFile)
      return [{ id: forwarderFile, display: forwarderFile }];
    return [];
  };

  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse">
        Chargement des données du jeu...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6 gap-2"
      >
        <ArrowLeft size={16} /> Retour à la liste
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isNew ? "Nouveau Jeu" : `Éditer: ${game.title}`}
          </CardTitle>
          <CardDescription>
            Remplissez les métadonnées et uploadez les fichiers nécessaires.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre du jeu *</Label>
              <Input
                id="title"
                name="title"
                value={game.title}
                onChange={handleInputChange}
                placeholder="Ex: Pokémon Version Platine"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Auteur / Éditeur</Label>
              <Input
                id="author"
                name="author"
                value={game.author}
                onChange={handleInputChange}
                placeholder="Ex: Nintendo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titleId">Title ID</Label>
            <div className="flex items-center gap-2">
              <Input
                id="titleId"
                name="titleId"
                value={game.titleId || ""}
                onChange={handleInputChange}
                placeholder="Ex: ABXP"
                className="font-mono uppercase"
                disabled={isNew}
              />
              {isNew && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Lock size={12} /> auto
                </span>
              )}
            </div>
            {isNew && (
              <p className="text-xs text-muted-foreground">
                Rempli automatiquement par l'analyse de la ROM.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-base">Catégories</Label>
            <div className="flex flex-wrap gap-4">
              {availableCategories.map((c) => (
                <div
                  key={c}
                  className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-md"
                >
                  <Checkbox
                    id={`cat-${c}`}
                    checked={game.categories.includes(c)}
                    onCheckedChange={() => toggleArrayValue("categories", c)}
                  />
                  <Label htmlFor={`cat-${c}`} className="cursor-pointer">
                    {c}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Systèmes compatibles</Label>
            <div className="flex flex-wrap gap-4">
              {availableSystems.map((s) => (
                <div
                  key={s}
                  className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-md"
                >
                  <Checkbox
                    id={`sys-${s}`}
                    checked={game.systems.includes(s)}
                    onCheckedChange={() => toggleArrayValue("systems", s)}
                  />
                  <Label htmlFor={`sys-${s}`} className="cursor-pointer">
                    {s}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Version / Région</Label>
            <div className="flex flex-wrap gap-4">
              {availableVersions.map((v) => (
                <div
                  key={v}
                  className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-md"
                >
                  <Checkbox
                    id={`ver-${v}`}
                    checked={game.version === v}
                    onCheckedChange={() =>
                      setGame((prev) => ({ ...prev, version: v }))
                    }
                  />
                  <Label htmlFor={`ver-${v}`} className="cursor-pointer">
                    {v}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Fichiers & Assets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploader
                label="ROM du jeu (.nds)"
                accept=".nds"
                type="nds"
                multiple={true}
                uploading={uploading || analyzing}
                items={getFileItems("nds")}
                onUpload={handleUpload}
                onRemove={removeFile}
              />

              {isNew ? (
                <>
                  <div className="p-4 border rounded-md bg-muted/50 space-y-2">
                    <p className="text-base font-semibold flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" /> Icône
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Extraite automatiquement de la ROM au build.
                    </p>
                  </div>
                  <div className="p-4 border rounded-md bg-muted/50 space-y-2">
                    <p className="text-base font-semibold flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" /> Screenshots
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Téléchargés automatiquement (libretro) au build.
                    </p>
                  </div>
                  <div className="p-4 border rounded-md bg-muted/50 space-y-2">
                    <p className="text-base font-semibold flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" /> Forwarder (.cia)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Généré automatiquement à partir de la ROM au build.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <FileUploader
                    label="Icône (1 seul)"
                    accept=".png,.jpg,.jpeg"
                    type="icon"
                    uploading={uploading}
                    items={getFileItems("icon")}
                    onUpload={handleUpload}
                  />
                  <FileUploader
                    label="Screenshots (Multiples)"
                    accept=".png,.jpg,.jpeg"
                    type="screenshot"
                    multiple={true}
                    uploading={uploading}
                    items={getFileItems("screenshot")}
                    onUpload={handleUpload}
                    onRemove={removeFile}
                  />
                  <FileUploader
                    label="Forwarder (.cia)"
                    accept=".cia"
                    type="cia"
                    uploading={uploading}
                    items={getFileItems("cia")}
                    onUpload={handleUpload}
                  />
                </>
              )}
            </div>
          </div>

          <div className="pt-6 border-t flex flex-col items-center gap-4">
            {message && (
              <div
                className={`w-full p-3 rounded-md text-center font-medium ${
                  message.type === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {message.text}
              </div>
            )}

            <Button
              onClick={saveGame}
              disabled={uploading || !game.title}
              size="lg"
              className="w-full md:w-auto min-w-[200px] gap-2"
            >
              <Save size={18} />
              {isNew ? "Créer le jeu" : "Mettre à jour"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
