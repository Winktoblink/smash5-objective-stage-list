# 4. Opt-in overlap matching

Status: Accepted. Amends [ADR-0001](0001-range-containment-filter-semantics.md).

## Context

[ADR-0001](0001-range-containment-filter-semantics.md) made containment the only
way a range filter works: a stage matches only if its whole `[min, max]` range
lies inside the filter. That answers "which stages *always* meet my
requirement?", which suits a ruleset.

It cannot answer the other natural question, "which stages *can* reach this
range at some point?". A tournament organizer who is deciding whether to look at
a stage at all, or who wants to see the near misses, needs that second reading.
ADR-0001 said that if this was needed it should be an explicit opt-in and not a
change to the default.

## Decision

The search request gets an optional field, `rangeMatch`, with two values:

- `CONTAINED` (the default when the field is omitted): unchanged from ADR-0001.
  `filter.min <= stage.min AND stage.max <= filter.max`.
- `OVERLAPS`: the stage range and the filter share at least one value.
  `stage.max >= filter.min AND stage.min <= filter.max`.

In both modes an omitted filter bound leaves that side open. The mode applies to
every range filter in the request: the four blast zones, the distance to the
blast zone and the ledge count. Stage width is a single value, so it matches
when it falls inside the filter in both modes.

An unknown `rangeMatch` value is rejected with a `400` problem detail, like any
other malformed request.

## Consequences

- Existing callers see no change, because omitting the field means `CONTAINED`.
- The mode is per request, not per filter. A caller who wants one filter
  contained and another overlapping needs two requests. That is rare enough not
  to justify a more complex request shape.
- Fixed-size stages have `min == max`, so both modes give the same answer for
  them. The two modes differ only for stages whose measurements change during a
  match.
- Results in `CONTAINED` mode are always a subset of the results in `OVERLAPS`
  mode for the same filter, which makes the "near miss" idea easy to explain.
