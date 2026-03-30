import { db } from "../src/db/db";
import { files, quota as quotaTable } from "../src/db/schema";
import fs from "fs";
import path from "path";
import { FileItem } from "../src/types/file";

async function migrate() {
  const dataPath = path.join(process.cwd(), "data", "files.json");
  if (!fs.existsSync(dataPath)) {
    console.log("No files.json found to migrate.");
  } else {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const data: Record<string, FileItem> = JSON.parse(rawData);

    console.log(`Found ${Object.keys(data).length} files to migrate.`);

    for (const [id, file] of Object.entries(data)) {
      try {
        await db.insert(files).values({
          ...file,
          id
        }).onConflictDoUpdate({
          target: files.id,
          set: {
              ...file
          }
        });
        console.log(`Migrated file: ${file.name} (${id})`);
      } catch (err) {
        console.error(`Failed to migrate file ${id}:`, err);
      }
    }
  }

  // Migrate quota
  console.log("Migrating quota files...");
  const dataDir = path.join(process.cwd(), "data");
  if (fs.existsSync(dataDir)) {
    const files_in_data = fs.readdirSync(dataDir);
    const quotaFiles = files_in_data.filter(f => f.startsWith("usage-") && f.endsWith(".json"));

    for (const qf of quotaFiles) {
      try {
        const key = qf.replace("usage-", "").replace(".json", "");
        const rawQuota = fs.readFileSync(path.join(dataDir, qf), "utf-8");
        const usage = JSON.parse(rawQuota);
        
        await db.insert(quotaTable).values({
          userId: key,
          ...usage
        }).onConflictDoUpdate({
          target: quotaTable.userId,
          set: usage
        });
        console.log(`Migrated quota: ${key}`);
      } catch (err) {
        console.error(`Failed to migrate quota ${qf}:`, err);
      }
    }
  }
  console.log("Migration and Quota migration finished.");
}

migrate().catch(console.error);
