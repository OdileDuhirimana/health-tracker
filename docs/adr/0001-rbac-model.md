# ADR-0001: Resolve the dual RBAC model — keep the enum-based permission map, remove the relational schema

## Status

Accepted — 2026-07-04

## Context

The codebase carried two parallel, never-reconciled representations of role-based access control:

1. **Enum-based (`backend/src/common/rbac/rbac.config.ts`)** — a static `UserRole` enum on the `User` entity (`Admin` / `Healthcare Staff` / `Guest`), a `Permission` enum, and a `ROLE_PERMISSIONS: Record<UserRole, Permission[]>` map. `RolesGuard` and `PermissionsGuard` — applied via `@Roles()`/`@RequirePermissions()` decorators on essentially every controller — check exclusively against this map.
2. **Relational (`Role`/`Permission` entities)** — `roles` and `permissions` tables with a `user_roles` many-to-many join table, intended (per an inline comment reading "useful for future dynamic RBAC features") to eventually support runtime-configurable roles defined in the database rather than in code.

Only (1) was ever wired into an actual guard. (2) was pure scaffolding: registered in `UsersModule` so TypeORM's metadata loader wouldn't crash on `User.roles`, referenced by seed scripts, and rendered in the README's ERD — but never read by any authorization check anywhere in the application. This was flagged by an external code review as:

- A direct violation of the project's own "no speculative/future code" standard (`DynamicRole` / `extendRolePermissions()` in `rbac.config.ts`, explicitly commented as being for "future" use, was never called anywhere).
- Unnecessary abstraction / maintenance surface with no corresponding behavior (`MAIN-05`).
- A source of confusion for anyone reading the schema and reasonably assuming the relational tables were the enforcement mechanism.

## Decision

**Keep the enum-based `ROLE_PERMISSIONS` model as the single, authoritative RBAC implementation. Delete the relational `Role`/`Permission` entities, the `user_roles` join table mapping, and the dead `DynamicRole`/`extendRolePermissions()` scaffolding.**

Concretely:

- Removed `backend/src/entities/role.entity.ts` and `backend/src/entities/permission.entity.ts`.
- Removed the `roles: Role[]` many-to-many relation from `User`.
- Removed `Role`/`Permission` from `UsersModule`'s `TypeOrmModule.forFeature()` registration and from every seed script that referenced them.
- Removed `DynamicRole`, `extendRolePermissions()`, and their unit tests from `rbac.config.ts`.
- Updated the README's ERD and RBAC section to drop the relational tables and stop describing them as present-but-unused technical debt (they're no longer present at all).

## Why the enum-based model, not the relational one

- **It's the one that actually works.** Every guard, every controller, and 80+ passing unit/e2e tests already depend on it. Migrating enforcement onto the relational schema would have been a genuine, non-trivial feature (guard rewrites, a permissions-admin UI, migration of existing role assignments) — not something to bolt on as a side effect of a cleanup pass.
- **The relational tables were never actually created by a migration.** Like the `Dispensation` bucket columns (see the code-review's DB-05 finding and `1740000000000_fix_dispensation_bucket_schema.ts`), `roles`/`permissions`/`user_roles` only ever existed via TypeORM `synchronize` in development — they were never real in a production (`synchronize: false`) deployment. Formalizing them would have required writing that migration from scratch anyway.
- **This application's actual permission model is small and stable** (3 roles, ~25 permissions, changed rarely). Runtime-configurable, database-driven RBAC solves a scaling problem (many tenants/roles, non-developer role administration) this application doesn't have. Introducing it now would be exactly the kind of premature, YAGNI-violating abstraction the original review flagged the *speculative code comment* for in the first place.

## Consequences

- **Adding a new role or permission requires a code change and redeploy**, not a database row insert. This is an intentional, disclosed tradeoff, not an oversight — acceptable for an application of this size and change cadence.
- Ownership-level checks that go beyond simple role gates (e.g. "Healthcare Staff can only edit patients assigned to them" in `PatientsService`) remain hand-written in service methods rather than expressed declaratively. This is unchanged by this decision either way — the relational schema was never granular enough to express resource-level ownership regardless.
- If this application's requirements later genuinely demand runtime-configurable roles (e.g. a customer-facing "invite an admin with a custom permission set" feature), that should be scoped and built deliberately as its own feature with its own migration, guard changes, and admin UI — not resurrected from this removed scaffolding, which was never validated against a real use case.

## Alternatives considered

- **Wire enforcement onto the relational model instead.** Rejected: would have required rewriting every guard, backfilling role/permission data, and building an admin UI to manage it, none of which was in scope, and none of which is justified by current requirements.
- **Keep both, more clearly documented.** Rejected: this is what the codebase already did (the enum model's own file comment described the relational schema as "optional until fully switched from enum role"), and it was correctly identified as a code smell — unresolved technical debt disclosed indefinitely is still debt. A decision was overdue.
