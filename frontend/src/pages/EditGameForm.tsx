import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Spinner } from "../components/ui/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { ArrowLeft, Save, Lock, Sparkles } from "lucide-react";
import { FileUploader } from "../components/FileUploader";
import { useUI } from "../context/UIContext";

interface Screenshot {
  url: string;
  description?: string;
  order?: number;
}

interface Downloads {
  [name: string]: { url: string; size?: number | null };
}

interface Game {
  id?: string;
  title: string;
  titleId?: string;
  author: string;
  developer?: string;
  publisher?: string;
  genres?: string[] | string;
  description?: string;
  descriptionMd?: string;
  categories: string[] | string;
  systems: string[] | string;
  downloads: Downloads;
  screenshots: Screenshot[];
  icon: string;
  version: string;
  updated: string;
}

interface GameApiResponse {
  id?: string;
  title?: string;
  titleId?: string;
  author?: string;
  developer?: string;
  publisher?: string;
  genres?: string[] | string;
  categories?: string[] | string;
  systems?: string[] | string;
  description?: string;
  descriptionMd?: string;
  downloads?: Downloads;
  screenshots?: Screenshot[];
  iconUrl?: string;
  icon?: string;
  boxartUrl?: string;
  boxart?: string;
  version?: string;
  updated?: string;
}

const availableCategories = ["game", "homebrew", "emulator"];
const availableSystems = ["DS", "3DS"];
const availableVersions = [
  "(Europe)",
  "(Europe) (En,Fr,De,Es,It)",
  "(France)",
  "(USA)",
  "(Japan)",
];

const API_URL = import.meta.env.VITE_API_URL || "";

const formatDate = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+02:00`;
};

const ensureArray = (val: unknown): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
};

export default function EditGameForm() {
  const { t } = useUI();
  const params = useParams<{ fileName?: string; id?: string; slug?: string }>();
  const identifier = params.fileName || params.id || params.slug || "";
  const navigate = useNavigate();

  const isNew = !identifier || identifier === "new";

  const [game, setGame] = useState<Game>({
    title: "",
    author: "",
    developer: "",
    publisher: "",
    genres: [],
    description: "",
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
        credentials: "include",
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
        developer: meta.developer || prev.developer || "",
        publisher: meta.publisher || prev.publisher || "",
        genres: meta.genres?.length ? meta.genres : ensureArray(prev.genres),
        description:
          prev.description ||
          meta.description ||
          meta.description_en ||
          meta.description_fr ||
          "",
        icon: prev.icon || meta.icon || "",
      }));
      if (meta.titleId)
        setMessage({
          text: `ROM analysée: ${title} (${meta.titleId})${meta.developer ? " — " + meta.developer : ""}`,
          type: "success",
        });
    } catch {
      setMessage({ text: t("edit.analyzeFail"), type: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isNew) return;

    const fetchGame = async () => {
      setLoading(true);
      try {
        let g: GameApiResponse | null = null;
        const resSingle = await fetch(
          `${API_URL}/api/games/${encodeURIComponent(identifier)}`,
          {
            credentials: "include",
          },
        );

        if (resSingle.ok) {
          g = (await resSingle.json()) as GameApiResponse;
        } else {
          const resAll = await fetch(`${API_URL}/api/games`, {
            credentials: "include",
          });
          if (!resAll.ok) throw new Error(t("edit.loadDataFail"));
          const games: GameApiResponse[] = await resAll.json();

          const targetSlug = identifier
            .replace(/\.json$/i, "")
            .replace(/[^a-z0-9]/gi, "")
            .toLowerCase();
          g =
            games.find((item) => {
              if (
                item.id &&
                (item.id === identifier || `${item.id}.json` === identifier)
              )
                return true;
              const itemClean = (item.title || "")
                .replace(/[^a-z0-9]/gi, "")
                .toLowerCase();
              return itemClean === targetSlug;
            }) || null;
        }

        if (g) {
          setGame({
            id: g.id,
            title: g.title || "",
            titleId: g.titleId || "",
            author: g.author || "",
            developer: g.developer || "",
            publisher: g.publisher || "",
            genres: ensureArray(g.genres),
            categories: ensureArray(g.categories),
            systems: ensureArray(g.systems),
            description: g.descriptionMd || g.description || "",
            downloads: g.downloads || {},
            screenshots: g.screenshots || [],
            icon: g.iconUrl || g.icon || "",
            version: g.version || "(Europe)",
            updated: g.updated || formatDate(),
          });

          const ndsName = Object.keys(g.downloads || {}).find((k) =>
            /\.nds$/i.test(k),
          );
          if (ndsName) setForwarderFile(ndsName.replace(/\.nds$/i, ".cia"));
        } else {
          setMessage({ text: t("edit.loadFail"), type: "error" });
        }
      } catch (err) {
        console.error(err);
        setMessage({ text: t("edit.loadFail"), type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [identifier, isNew, t]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGame((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGame((prev) => ({
      ...prev,
      genres: value
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    }));
  };

  const toggleArrayValue = (field: "categories" | "systems", value: string) => {
    setGame((prev) => {
      const arr = ensureArray(prev[field]);
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
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (err) {
      console.error(err);
      setMessage({
        text: `${t("edit.uploadFail")} ${endpoint}`,
        type: "error",
      });
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
        const ciaName = file.name.replace(/\.nds$/i, ".cia");
        setForwarderFile(ciaName);
      } else if (type === "cia") {
        setForwarderFile(file.name);
      }
    }

    setUploading(false);
  };

  const removeFile = (type: "screenshot" | "nds", identifierKey: string) => {
    if (type === "screenshot") {
      setGame((prev) => ({
        ...prev,
        screenshots: prev.screenshots.filter((s) => s.url !== identifierKey),
      }));
    } else if (type === "nds") {
      setGame((prev) => {
        const newDownloads = { ...prev.downloads };
        delete newDownloads[identifierKey];
        return { ...prev, downloads: newDownloads };
      });
    }
  };

  const saveGame = async () => {
    if (!game.title) {
      setMessage({ text: t("edit.titleRequired"), type: "error" });
      return;
    }

    setMessage(null);
    const targetId = game.id || identifier;
    const method = isNew ? "POST" : "PUT";
    const url = isNew
      ? `${API_URL}/api/games`
      : `${API_URL}/api/games/${encodeURIComponent(targetId)}`;

    try {
      const payload = {
        ...game,
        genres: ensureArray(game.genres),
        categories: ensureArray(game.categories),
        systems: ensureArray(game.systems),
        descriptionMd: game.description,
        updated: formatDate(),
      };

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const data = await res.json();
        const conflictId = data.game?.id || data.fileName || targetId;
        setMessage({
          text: `${t("edit.exists")} (${conflictId}).`,
          type: "error",
        });
        if (conflictId) {
          setTimeout(
            () =>
              navigate(`/edit/${encodeURIComponent(conflictId)}`, {
                replace: true,
              }),
            1500,
          );
        }
        return;
      }

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setMessage({
        text: data.message || t("edit.saved"),
        type: "success",
      });

      const nextId = data.game?.id || data.fileName;
      if (isNew && nextId) {
        setTimeout(
          () =>
            navigate(`/edit/${encodeURIComponent(nextId)}`, { replace: true }),
          1200,
        );
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: t("edit.saveFail"), type: "error" });
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
      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Spinner /> {t("edit.loading")}
      </div>
    );
  }

  const currentCategories = ensureArray(game.categories);
  const currentSystems = ensureArray(game.systems);
  const currentGenres = ensureArray(game.genres);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6 gap-2"
      >
        <ArrowLeft size={16} /> {t("edit.back")}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isNew ? t("edit.new") : `${t("edit.edit")} ${game.title}`}
          </CardTitle>
          <CardDescription>{t("edit.description")}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">{t("edit.title")}</Label>
              <Input
                id="title"
                name="title"
                value={game.title}
                onChange={handleInputChange}
                placeholder={t("edit.titlePh")}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="author">{t("edit.author")}</Label>
              <Input
                id="author"
                name="author"
                value={game.author}
                onChange={handleInputChange}
                placeholder={t("edit.authorPh")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="developer">{t("edit.developer")}</Label>
              <Input
                id="developer"
                name="developer"
                value={game.developer || ""}
                onChange={handleInputChange}
                placeholder="Ex: Nintendo"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="publisher">{t("edit.publisher")}</Label>
              <Input
                id="publisher"
                name="publisher"
                value={game.publisher || ""}
                onChange={handleInputChange}
                placeholder="Ex: Nintendo"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="genres">{t("edit.genres")}</Label>
              <Input
                id="genres"
                name="genres"
                value={currentGenres.join(", ")}
                onChange={handleGenresChange}
                placeholder="Platform, Adventure"
              />
              <p className="text-xs text-muted-foreground">
                {t("edit.genresHint")}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">{t("edit.descLabel")}</Label>
            <Textarea
              id="description"
              name="description"
              value={game.description || ""}
              onChange={(e) =>
                setGame((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Résumé du jeu..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {t("edit.descHint")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="titleId">{t("edit.titleId")}</Label>
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
                {t("edit.titleIdAuto")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label className="text-base">{t("edit.categories")}</Label>
            <div className="flex flex-wrap gap-4">
              {availableCategories.map((c) => (
                <div
                  key={c}
                  className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md"
                >
                  <Checkbox
                    id={`cat-${c}`}
                    checked={currentCategories.includes(c)}
                    onCheckedChange={() => toggleArrayValue("categories", c)}
                  />
                  <Label htmlFor={`cat-${c}`} className="cursor-pointer">
                    {c}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Label className="text-base">{t("edit.systems")}</Label>
            <div className="flex flex-wrap gap-4">
              {availableSystems.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md"
                >
                  <Checkbox
                    id={`sys-${s}`}
                    checked={currentSystems.includes(s)}
                    onCheckedChange={() => toggleArrayValue("systems", s)}
                  />
                  <Label htmlFor={`sys-${s}`} className="cursor-pointer">
                    {s}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Label className="text-base">{t("edit.version")}</Label>
            <div className="flex flex-wrap gap-4">
              {availableVersions.map((v) => (
                <div
                  key={v}
                  className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md"
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

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              {t("edit.files")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploader
                label={t("edit.romLabel")}
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
                  <div className="p-4 border rounded-md bg-muted/50 flex flex-col gap-2">
                    <p className="text-base font-semibold flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" />{" "}
                      {t("edit.iconAuto")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("edit.iconAutoText")}
                    </p>
                  </div>
                  <div className="p-4 border rounded-md bg-muted/50 flex flex-col gap-2">
                    <p className="text-base font-semibold flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" />{" "}
                      {t("edit.shotsAuto")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("edit.shotsAutoText")}
                    </p>
                  </div>
                  <div className="p-4 border rounded-md bg-muted/50 flex flex-col gap-2">
                    <p className="text-base font-semibold flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" />{" "}
                      {t("edit.fwdAuto")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("edit.fwdAutoText")}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <FileUploader
                    label={t("edit.iconLabel")}
                    accept=".png,.jpg,.jpeg"
                    type="icon"
                    uploading={uploading}
                    items={getFileItems("icon")}
                    onUpload={handleUpload}
                  />
                  <FileUploader
                    label={t("edit.shotsLabel")}
                    accept=".png,.jpg,.jpeg"
                    type="screenshot"
                    multiple={true}
                    uploading={uploading}
                    items={getFileItems("screenshot")}
                    onUpload={handleUpload}
                    onRemove={removeFile}
                  />
                  <FileUploader
                    label={t("edit.fwdLabel")}
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
              <Alert
                variant={message.type === "success" ? "default" : "destructive"}
                className="w-full text-center"
              >
                <AlertDescription className="font-medium">
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={saveGame}
              disabled={uploading || !game.title}
              size="lg"
              className="w-full md:w-auto min-w-50 gap-2"
            >
              <Save size={18} />
              {isNew ? t("edit.create") : t("edit.update")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
