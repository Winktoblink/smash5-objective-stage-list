# 3. Test with Spock, and against real PostgreSQL

Status: Accepted

## Context

The interesting logic is a dynamic query: optional range and flag filters turned
into JPA Criteria predicates, then executed against PostgreSQL types
(`NUMERIC(4,1)`, `SMALLINT`, `BOOLEAN`). Mocking the repository would prove
nothing about whether the query is right. An in-memory database such as H2 would
test a different SQL dialect from the one that runs in production.

The project already used Spock, whose data tables suit validation and mapping
cases well. Spring Boot 4 moves to Spring Framework 7, so it was not obvious
that `spock-spring` would still work.

## Decision

- Tests are written in Spock (`2.5-groovy-5.0`, matching the Groovy version
  managed by Spring Boot 4.1).
- Three layers:
  - **Unit specs** with no Spring context: `RangeValidatorSpec`,
    `StageApiMapperSpec`.
  - **Web slice** (`@WebMvcTest`) with a mocked `StageService`, covering response
    shapes and the problem-detail error contract.
  - **Integration** (`@SpringBootTest` + Testcontainers) against `postgres:18-alpine`,
    the same image as `compose.yaml`. Flyway seeds the real 109 stages, and the
    expected results are computed from that data.
- A smoke test confirmed `spock-spring` works with Spring Framework 7, so no
  JUnit fallback was needed.
- JaCoCo enforces at least 80% line coverage as part of `check`, excluding the
  `main` class.

## Consequences

- The integration tests need a Docker daemon, locally and in CI.
- Tests are slower than an H2-based suite, but they exercise the migrations, the
  entity mapping and the SQL together.
- Expected values in the integration spec are facts about the seed data. A
  migration that changes stages must update them.
