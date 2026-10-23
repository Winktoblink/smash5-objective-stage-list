package com.rvictor.smash5objectivestagelist.stage.domain;

/** How a stage's {@code [min, max]} range is compared with a range filter. */
public enum RangeMatch {

    /** The whole stage range lies inside the filter: the stage always meets it. This is the default. */
    CONTAINED,

    /** The stage range and the filter share at least one value: the stage can meet it at some point. */
    OVERLAPS
}
