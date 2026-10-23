# 2. Flyway owns the schema, Hibernate only validates it

Status: Accepted

## Context

The application stores its 107 stages in PostgreSQL. A developer, a CI runner
and the container all need to arrive at the identical schema and data without
manual steps. Hibernate can generate DDL itself (`ddl-auto=update|create`), but
that hides the real schema in entity annotations and makes data seeding a
separate problem.

An earlier version of this repository also ran Flyway from a Gradle plugin with
connection details that did not match `compose.yaml`, so migrations were never
applied by the application itself.

## Decision

- Flyway migrations in `src/main/resources/db/migration` are the single source of
  truth for schema and seed data. Spring Boot runs them at startup.
- Hibernate runs with `spring.jpa.hibernate.ddl-auto=validate`. If an entity
  drifts from the schema, the application fails fast at startup.
- Applied migrations are never edited. Changes are new versions: `V2` adds the
  `NOT NULL` and `CHECK (min <= max)` constraints that the domain relies on.
- The Flyway Gradle plugin is not used. The datasource comes from Spring Boot's
  Docker Compose support in development, from `SPRING_DATASOURCE_*` variables in
  the container, and from Testcontainers in tests.
- To add or correct a stage, add a new migration.

## Consequences

- A fresh database is always built the same way, so there is no seed script to
  forget and no "works on my machine" schema.
- Mapping mistakes surface immediately. For instance, `SMALLINT` ledge columns
  need an explicit `SMALLINT` JDBC type on the `Integer` fields, or validation
  fails.
- The schema can only move forward. Rolling back means writing a compensating
  migration.
