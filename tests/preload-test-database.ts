// Préchargé avant les tests d'intégration, avant tout import de Prisma.
import { applyTestDatabaseUrl } from "./test-database";

applyTestDatabaseUrl();
if (!process.env.CRM_LAB_SESSION_SECRET || process.env.CRM_LAB_SESSION_SECRET.length < 32) {
  process.env.CRM_LAB_SESSION_SECRET = "test-only-session-secret-32chars-minimum";
}
