import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const prisma = new PrismaClient();

const SOURCE_APPS_DIR = "D:/Projets/NDS-Shop-all-project/db-nds-shop/source/apps";
const MD_DIR = "D:/Projets/NDS-Shop-all-project/db-nds-shop/frontend/public/_ds";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("🚀 Starting migration: JSON/MD → Database");

  const jsonFiles = fs.readdirSync(SOURCE_APPS_DIR).filter(f => f.endsWith(".json"));
  console.log(`📁 Found ${jsonFiles.length} JSON files in source/apps`);

  for (const file of jsonFiles) {
    const filePath = path.join(SOURCE_APPS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const app = JSON.parse(raw);

    // Find corresponding MD file
    let descriptionMd = "";
    const mdFile = `${slugify(app.title)}.md`;
    const mdPath = path.join(MD_DIR, mdFile);
    if (fs.existsSync(mdPath)) {
      const mdContent = fs.readFileSync(mdPath, "utf8");
      const { content } = matter(mdContent);
      descriptionMd = content;
    }

    // Upsert Game
    const game = await prisma.game.upsert({
      where: { slug: slugify(app.title) },
      update: {
        title: app.title,
        titleId: app.titleId,
        version: app.version,
        author: app.author,
        developer: app.developer,
        publisher: app.publisher,
        descriptionMd,
        systems: app.systems || [],
        genres: app.genres || [],
        categories: app.categories || ["game"],
        color: app.color,
        colorBg: app.color_bg,
        priority: app.priority || false,
        stars: app.stars || 0,
        iconUrl: app.icon,
        imageUrl: app.image,
        boxartUrl: app.boxart,
      },
      create: {
        slug: slugify(app.title),
        title: app.title,
        titleId: app.titleId,
        version: app.version,
        author: app.author,
        developer: app.developer,
        publisher: app.publisher,
        descriptionMd,
        systems: app.systems || [],
        genres: app.genres || [],
        categories: app.categories || ["game"],
        color: app.color,
        colorBg: app.color_bg,
        priority: app.priority || false,
        stars: app.stars || 0,
        iconUrl: app.icon,
        imageUrl: app.image,
        boxartUrl: app.boxart,
      },
    });

    // Screenshots
    if (app.screenshots) {
      await prisma.gameScreenshot.deleteMany({ where: { gameId: game.id } });
      for (let i = 0; i < app.screenshots.length; i++) {
        const s = app.screenshots[i];
        await prisma.gameScreenshot.create({
          data: {
            gameId: game.id,
            description: s.description,
            url: s.url,
            order: i,
          },
        });
      }
    }

    // Downloads
    if (app.downloads) {
      await prisma.gameDownload.deleteMany({ where: { gameId: game.id } });
      for (const [fileName, dl] of Object.entries(app.downloads)) {
        const d = dl as { url: string; size?: number };
        await prisma.gameDownload.create({
          data: {
            gameId: game.id,
            fileName,
            url: d.url,
            size: d.size ? BigInt(d.size) : null,
            type: fileName.split(".").pop()?.toLowerCase() || "unknown",
          },
        });
      }
    }

    // Scripts
    if (app.scripts) {
      await prisma.gameScript.deleteMany({ where: { gameId: game.id } });
      for (const [name, script] of Object.entries(app.scripts)) {
        await prisma.gameScript.create({
          data: {
            gameId: game.id,
            name,
            script: script as any,
          },
        });
      }
    }

    console.log(`✅ Migrated: ${app.title}`);
  }

  console.log("🎉 Migration completed!");
}

main()
  .catch(e => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });