package com.rvictor.smash5objectivestagelist.stage.api;

import java.math.BigDecimal;

/** A stage and its measurements. Stages that move or transform report a {@code [min, max]} range. */
public record StageResponse(
        int id,
        String name,
        BlastZones blastZones,
        BigDecimal stageWidth,
        DecimalRangeDto distanceToBlastZone,
        IntRangeDto ledgeCount,
        Features features) {

    public record BlastZones(
            DecimalRangeDto left, DecimalRangeDto right, DecimalRangeDto top, DecimalRangeDto bottom) {}

    public record Features(
            boolean walkOffs,
            boolean ceiling,
            boolean wallInfinite,
            boolean random,
            boolean water,
            boolean symmetry,
            boolean transform,
            boolean twoDimensional,
            boolean ice,
            boolean hurtBox) {}
}
