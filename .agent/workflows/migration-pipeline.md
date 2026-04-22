---
description: Database Migration Pipeline & Troubleshooting
---

# Database Migration Pipeline

## 1. Standard Development Flow
When you modify `packages/database/prisma/schema.prisma`:

1.  **Generate Migration**:
    ```bash
    # Creates a new migration file in prisma/migrations
    # Applies it to your LOCAL development database
    pnpm --filter @dashtec/database db:migrate --name <descriptive_name>
    ```
2.  **Commit**:
    Commit the new `prisma/migrations/<timestamp>_<name>` folder to git.

## 2. Production Deployment Flow
When deploying to a server (like `10.10.10.61`):

1.  **Deploy Migrations**:
    ```bash
    # Applies pending migrations from prisma/migrations to the DB
    # DOES NOT reset the database or lose data
    pnpm --filter @dashtec/database db:deploy
    ```

---

## 3. Troubleshooting: Migration Divergence
**Issue**: "The migrations recorded in the database diverge from the local migrations directory."
**Cause**: The production database has a migration history that doesn't match your local `prisma/migrations` folder (e.g., a migration was re-created or deleted locally).

### Resolution Steps (DO NOT RESET)

1.  **Backup the Database** (Critical):
    ```bash
    # Run on the server
    docker exec dashtec-postgres-mainnet pg_dump -U dashtec dashtec > backup_safety.sql
    ```

2.  **List Migration Status**:
    ```bash
    pnpm --filter @dashtec/database exec prisma migrate status
    ```
    *Look for "failed" or "diverged" migrations.*

2.  **Verify Database State** (Recommended):
    Check if the database structure actually matches your local schema.
    ```bash
    # Compare live DB with local schema (Prisma 7)
    pnpm --filter @dashtec/database exec prisma migrate diff \
      --from-config-datasource prisma.config.ts \
      --to-schema prisma \
      --script
    ```
    *   **Empty Output**: The DB is correct. Safe to use `resolve`.
    *   **SQL Output**: The DB is missing these changes. You may need to apply them manually or use `db push`.

3.  **Resolve the Divergence**:
    *   **Case A: The DB is correct** (Diff was empty):
        ```bash
        pnpm --filter @dashtec/database exec prisma migrate resolve --applied <migration_name>
        ```
    *   **Case B: The DB is wrong** (The migration failed halfway):
        ```bash
        pnpm --filter @dashtec/database exec prisma migrate resolve --rolled-back <migration_name>
        ```

### 4. Special Case: Baselining (Squashed Migrations)
**Issue**: Local migrations were reset/squashed (e.g., you have one new `initial` migration), but production has a long history of old migrations.
**Fix**: Tell production to "adopt" the new initial migration as the baseline.

1.  **Resolve the new initial migration**:
    ```bash
    pnpm --filter @dashtec/database exec prisma migrate resolve --applied <new_initial_migration_name>
    ```
    *Example: `20251126020749_initial`*

2.  **Verify**:
    ```bash
    pnpm --filter @dashtec/database exec prisma migrate status
    ```

3.  **Deploy Pending Migrations**:
    If `migrate status` shows pending migrations (and `migrate diff` confirms they are missing from the DB), deploy them:
    ```bash
    pnpm --filter @dashtec/database exec prisma migrate deploy
    ```

## 5. Verify
    ```bash
    pnpm --filter @dashtec/database prisma migrate status
    # Should report "Database schema is up to date"
    ```