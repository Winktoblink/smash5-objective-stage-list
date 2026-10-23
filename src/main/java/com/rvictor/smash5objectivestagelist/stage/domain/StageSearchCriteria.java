package com.rvictor.smash5objectivestagelist.stage.domain;

/**
 * What a caller wants from a stage. Every part is optional: a {@code null} part, a {@code null} range
 * bound, or a {@code null} flag means "don't care".
 *
 * @see StageSpecifications for how each part is matched
 */
public record StageSearchCriteria(
        BlastZones blastZones,
        DecimalRange stageWidth,
        DecimalRange distanceToBlastZone,
        IntRange ledgeCount,
        Features features) {

    /** Criteria that match every stage. */
    public static StageSearchCriteria any() {
        return new StageSearchCriteria(null, null, null, null, null);
    }

    public record BlastZones(DecimalRange left, DecimalRange right, DecimalRange top, DecimalRange bottom) {}

    public record Features(
            Boolean walkOffs,
            Boolean ceiling,
            Boolean wallInfinite,
            Boolean random,
            Boolean water,
            Boolean symmetry,
            Boolean transform,
            Boolean twoDimensional,
            Boolean ice,
            Boolean hurtBox) {}
}
