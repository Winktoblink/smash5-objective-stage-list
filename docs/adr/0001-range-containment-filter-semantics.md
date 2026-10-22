# 1. Range filters use containment

Status: Accepted

## Context

Some Smash stages move or transform during a match, so a measurement such as the
left blast zone is not one number but a range: Delfino Plaza's runs from -230 to
-180, for example. The seed data therefore stores a `min` and a `max` for every
blast zone, for the distance to the blast zone, and for the ledge count.

A caller who filters on "left blast zone between -240 and -200" has to be told
what happens to a stage whose range only partly overlaps that interval. There
are two reasonable readings: *overlap* (the stage can reach the interval) and
*containment* (the stage always stays inside it).

## Decision

Range filters use **containment**. A stage matches only if its entire range lies
inside the filter:

    filter.min <= stage.min  AND  stage.max <= filter.max

Either filter bound may be omitted, which leaves that side open. Stage width is
a single value, so it matches when `filter.min <= width <= filter.max`.

Feature flags are tri-state: `null` or omitted means "don't care", while `true`
and `false` must match exactly. Results are sorted by stage name. If both bounds
of a filter are present and `min > max`, the request is rejected with a 400.

## Consequences

- The question being answered is "which stages *always* meet my requirement?".
  A stage that only sometimes meets it does not meet it, which is the safe
  answer for a ruleset.
- Filters are plain `>=` and `<=` comparisons, so
  the SQL stays simple.
- Users who want "can ever reach this range" cannot express it. If that is
  needed later it should be an explicit opt-in on the request, not a change to
  the default.
- Fixed-size stages have `min == max`, so containment and overlap give the same
  answer for them.
