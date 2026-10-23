# 5. The search page evaluates criteria in the browser

Status: Accepted

## Context

The first search page sent the filter to `POST /api/v1/stages/search` and listed
the stages that came back. A tournament organizer needs more than a list: why a
stage failed, which stages only just missed, how the options compare with
Battlefield, and later a stage-list builder, shareable links and an export. All of
that needs every stage's measurements and the result of every check, not only the
stages that matched.

The tool should also be usable for free, always on, without anyone running a
server. Free static hosting (GitHub Pages) cannot call the Spring API.

## Decision

The page loads the full stage list once, from `data/stages.json` (about 50 KB), and
evaluates every criterion in the browser. The API and Swagger UI stay as they are
and remain the reference implementation.

Two implementations of the same rules now exist, so they are kept in agreement:

- **Stage snapshot.** `src/main/resources/static/data/stages.json` holds exactly what
  `GET /api/v1/stages` returns. `StageDataSnapshotSpec` compares the parsed JSON with
  the API and fails on any difference. After a data change, regenerate the file with
  `./gradlew test --tests '*StageDataSnapshotSpec' -PupdateStageSnapshot`.
- **Shared conformance cases.** `src/test/resources/search-conformance.json` is a list
  of `{ name, request, expected }` cases. `StageConformanceSpec` runs each one against
  the real API, and `src/test/js/conformance.test.mjs` runs each one through the
  JavaScript evaluator over the snapshot. The two can only disagree if a test fails.
- **The Flyway migrations stay the only source of truth.** The snapshot is generated
  from them and checked against them.

The page is plain ES modules under `static/js/` with no build step, no npm and no
CDN libraries. Modules that hold logic (`criteria.js`, `explain.js`, `diagram.js`,
`presets.js`) never touch the DOM, so Node's built-in test runner can test them:
`node --test "src/test/js/*.test.mjs"`. `app.js` is DOM wiring only. Every URL in
the page is relative, so it works under a sub-path such as
`/smash5-objective-stage-list/` on GitHub Pages.

The page speaks in plain terms: blast zones are a positive distance from the center.
`criteria.js` converts them to the signed ranges the data and the API use (a distance
range of 180 to 230 on the left is `-230` to `-180`).

## Consequences

- Explanations, near misses, previews and (later) the builder, permalinks and export
  are cheap, because the whole data set and every check result are in the page.
- The matching rules exist twice. The conformance cases are the contract between
  them, so a change to a rule needs a new case.
- Changing the data now means regenerating one file as well as adding a migration.
  The golden-file test fails until that is done, so it can't be forgotten.
- The page ships the entire stage list to every visitor. That is a few tens of
  kilobytes and the data is public.
