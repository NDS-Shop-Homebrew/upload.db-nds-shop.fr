import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const GAMES_PATH = process.env.GAMES_PATH!;

// GET tous les jeux
app.get("/api/games", (req, res) => {
  try {
    const files = fs.readdirSync(GAMES_PATH).filter((f) => f.endsWith(".json"));

    const games = files
      .map((file) => {
        const filePath = path.join(GAMES_PATH, file);
        try {
          const data = fs.readFileSync(filePath, "utf-8");
          return JSON.parse(data);
        } catch (err) {
          console.error("Erreur lecture JSON:", file, err);
          return null;
        }
      })
      .filter(Boolean); // enlever les nulls

    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT pour modifier un JSON existant
app.put("/api/games/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(GAMES_PATH, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), "utf-8");
    res.send({ message: "Modifié avec succès !" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur lors de la modification");
  }
});

// POST pour créer un nouveau JSON
app.post("/api/games", (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Le titre est requis" });

    // Générer le nom de fichier automatiquement
    const fileName =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + ".json";

    const filePath = path.join(GAMES_PATH, fileName);

    // Ajouter une date de création si besoin
    const gameData = { ...req.body, updated: new Date().toISOString() };

    fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2), "utf-8");
    res.json({ message: "JSON créé avec succès !", fileName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création du JSON" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
