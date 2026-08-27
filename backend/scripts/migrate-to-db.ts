import fs from "fs";
import path from "path";
import matter from "gray-matter";
import prisma from "../src/lib/prisma";

const SOURCE_APPS_DIR =
  process.env.SOURCE_APPS_DIR || "D:/Projets/NDS-Shop-all-project/db-nds-shop/source/apps";
const MD_DIR =
  process.env.MD_DIR || "D:/Projets/NDS-Shop-all-project/db-nds-shop/frontend/public/_ds";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("🚀 Lancement de la migration : JSON/MD → MySQL (Prisma)\n");

  if (!fs.existsSync(SOURCE_APPS_DIR)) {
    console.error(`❌ Dossier source introuvable : ${SOURCE_APPS_DIR}`);
    process.exit(1);
  }

  const jsonFiles = fs.readdirSync(SOURCE_APPS_DIR).filter((f: string) => f.endsWith(".json"));
  console.log(`📁 ${jsonFiles.length} fichier(s) JSON trouvé(s) dans source/apps\n`);

  let count = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(SOURCE_APPS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const app = JSON.parse(raw);

    const slug = slugify(app.title || file.replace(/\.json$/i, ""));

    let descriptionMd = app.description || "";
    const mdFile = `${slug}.md`;
    const mdPath = path.join(MD_DIR, mdFile);

    if (fs.existsSync(mdPath)) {
      try {
        const mdContent = fs.readFileSync(mdPath, "utf8");
        const { content } = matter(mdContent);
        if (content.trim()) {
          descriptionMd = content.trim();
        }
      } catch {}
    }

    const game = await prisma.game.upsert({
      where: { id: slug },
      update: {
        title: app.title,
        titleId: app.titleId || null,
        version: app.version || null,
        author: app.author || null,
        developer: app.developer || null,
        publisher: app.publisher || null,
        descriptionMd: descriptionMd || null,
        systems: JSON.stringify(app.systems || ["DS"]),
        genres: JSON.stringify(app.genres || []),
        categories: JSON.stringify(app.categories || ["game"]),
        color: app.color || null,
        colorBg: app.color_bg || app.colorBg || null,
        priority: Boolean(app.priority),
        stars: Number(app.stars || 0),
        iconUrl: app.icon || null,
        imageUrl: app.image || null,
        boxartUrl: app.boxart || null,
      },
      create: {
        id: slug,
        title: app.title,
        titleId: app.titleId || null,
        version: app.version || null,
        author: app.author || null,
        developer: app.developer || null,
        publisher: app.publisher || null,
        descriptionMd: descriptionMd || null,
        systems: JSON.stringify(app.systems || ["DS"]),
        genres: JSON.stringify(app.genres || []),
        categories: JSON.stringify(app.categories || ["game"]),
        color: app.color || null,
        colorBg: app.color_bg || app.colorBg || null,
        priority: Boolean(app.priority),
        stars: Number(app.stars || 0),
        iconUrl: app.icon || null,
        imageUrl: app.image || null,
        boxartUrl: app.boxart || null,
      },
    });

    await prisma.gameScreenshot.deleteMany({ where: { gameId: game.id } });
    if (Array.isArray(app.screenshots)) {
      for (let i = 0; i < app.screenshots.length; i++) {
        const s = app.screenshots[i];
        if (s?.url) {
          await prisma.gameScreenshot.create({
            data: {
              gameId: game.id,
              url: s.url,
              order: s.order !== undefined ? s.order : i,
            },
          });
        }
      }
    }

    await prisma.gameDownload.deleteMany({ where: { gameId: game.id } });
    if (app.downloads && typeof app.downloads === "object") {
      for (const [filename, dl] of Object.entries(app.downloads)) {
        const d = dl as { url: string; size?: number };
        const ext = filename.split(".").pop()?.toLowerCase() || "unknown";
        await prisma.gameDownload.create({
          data: {
            gameId: game.id,
            filename,
            url: d.url || "",
            size: d.size ? BigInt(Math.floor(Number(d.size))) : null,
            type: ext === "cia" ? "cia" : "nds",
          },
        });
      }
    }

    await prisma.gameScript.deleteMany({ where: { gameId: game.id } });
    if (app.scripts && typeof app.scripts === "object") {
      for (const [romName, steps] of Object.entries(app.scripts)) {
        if (Array.isArray(steps)) {
          for (const step of steps) {
            await prisma.gameScript.create({
              data: {
                gameId: game.id,
                name: romName,
                type: step.type || "downloadFile",
                file: step.file || "",
                output: step.output || null,
              },
            });
          }
        }
      }
    }

    count++;
    console.log(`  ✓ [${count}/${jsonFiles.length}] ${app.title}`);
  }

  console.log(`\n🎉 Migration terminée : ${count} jeux importés !`);
}

main()
  .catch((e) => {
    console.error("\n❌ Erreur pendant la migration :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });