---
name: review-migration
description: Reviews Prisma and PostgreSQL schema changes,
  migrations, relations, indexes and data safety for ProcurePilot.
---

# ProcurePilot Database Migration Review

## 1. Inspect current state

Read:
- prisma/schema.prisma
- Existing migrations
- Relevant database query modules
- Related API routes
- Seed scripts

## 2. Review schema design

Check:
- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Nullability
- Cascade behavior
- Ownership relations
- Enum changes
- Decimal versus integer money representation

## 3. Review data safety

Determine whether migration:
- Deletes existing data
- Changes meanings of existing columns
- Introduces unsafe defaults
- Creates inconsistent records
- Breaks existing queries
- Makes rollback difficult

## 4. Prisma workflow

Inspect generated migration SQL before applying it.

Use:
- npx prisma validate
- npx prisma migrate dev
- npx prisma generate

Never apply destructive migrations without explicit approval.

Never print database credentials.

## 5. Application consistency

Check all affected:
- Prisma models
- Query functions
- API schemas
- Domain types
- Seed data
- Tests

## 6. Output

Provide:
- Schema changes
- Migration risks
- SQL behavior
- Compatibility impact
- Test requirements
- Rollback considerations

Wait for approval before applying risky migrations.
