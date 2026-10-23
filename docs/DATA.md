# Stage data

The stage list lives in the Flyway migrations under
[`src/main/resources/db/migration`](../src/main/resources/db/migration).
`V1` inserts the original stages. Later migrations correct them.

## Read this first

- **Every measurement assumes stage hazards are off.** That is how tournaments
  play. A stage that changes during a match (Delfino Plaza, Lylat Cruise) is
  stored as a range, such as `-230` to `-180`.
- **The data is for Super Smash Bros. Ultimate**, as it was when the stages were
  compiled. No game version number was recorded with the original data.
- **The measurements were compiled manually by the project author.** No source
  is recorded per row. If you know a value is wrong, please report it (below).

## What each field means

All distances are in the game's own units. Blast zones are signed positions
measured from the center of the stage: a left blast zone of `-240` is 240 units
left of center, and a right blast zone of `240` is 240 units right of it.

| Field | Meaning |
|---|---|
| `blastZones.left` / `right` / `top` / `bottom` | Where a fighter is knocked out. Left and bottom are negative, right and top are positive. Each is a `min` and `max` because some stages move their blast zones. |
| `stageWidth` | Width of the main stage platform. A single number. |
| `distanceToBlastZone` | Distance from the edge of the stage to the nearest side blast zone. `0` on walk-off stages. |
| `ledgeCount` | Number of ledges that can be grabbed, as a `min` and `max`. |
| `walkOffs` | A fighter can walk off the edge of the stage into a blast zone without falling. |
| `ceiling` | The stage has a ceiling that stops fighters leaving through the top. |
| `wallInfinite` | A wall extends past the blast zone, so fighters can't be knocked out through it. |
| `random` | The stage chooses its layout at random, so players can't predict it. |
| `water` | The stage has water that a fighter can fall into. |
| `symmetry` | The left and right halves of the stage are mirror images. |
| `transform` | The stage changes shape during the match. |
| `twoDimensional` | The stage is a flat 2D scene. |
| `ice` | Part of the stage is slippery. |
| `hurtBox` | Part of the stage can damage fighters. |

The flag descriptions were written from the field names, not from a definition
the author recorded. `random`, `transform` and `hurtBox` in particular still
need the author to confirm exactly what counts. Treat them as provisional.

## Range filters

A search can match a range either by **containment** (the stage always stays
inside the filter, the default) or by **overlap** (the stage can reach it at some
point). See [ADR-0001](adr/0001-range-containment-filter-semantics.md) and
[ADR-0004](adr/0004-opt-in-overlap-matching.md).

## Change history

| Migration | Change |
|---|---|
| `V1` | Inserted 109 stages. |
| `V3` | Removed `BattleField (Common)` (a duplicate of `Battlefield`) and `Final Destination (Large)` (only available with five or more players). Renamed `Yoshi Island` to `Yoshi's Island (Brawl)` and `Mario Bros` to `Mario Bros.`. |

## Known gaps

These are open questions. Nothing here has been changed in the data yet, because
no source has been confirmed.

- **Missing stages:** Hollow Bastion, Northern Cave, Mishima Dojo, Minecraft
  World, King of Fighters Stadium, Garreg Mach Monastery and Mushroom Kingdom U.
- **Princess Peach's Castle** has a bottom blast zone of `0`, while every other
  stage has a negative one.
- **WarioWare, Inc.** has a top blast zone of `210`. Another source gives `199`.
- **Platform counts and layout details** (how many platforms a stage has, whether
  they move, whether the stage tilts) aren't in the data. A search can't filter
  on them yet.

## How to report a correction

Open an issue with the
[stage data correction](../.github/ISSUE_TEMPLATE/stage-data-correction.yml)
form. Give the stage, the field, what it says now, what it should say and where
the correct value comes from. A correction is applied as a new migration; applied
migrations are never edited.
