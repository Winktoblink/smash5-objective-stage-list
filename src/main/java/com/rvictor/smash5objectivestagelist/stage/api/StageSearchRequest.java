package com.rvictor.smash5objectivestagelist.stage.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;

/**
 * Filters for {@code POST /api/v1/stages/search}. Every field is optional; an empty body matches all stages.
 *
 * <p>Range filters match only stages whose <em>entire</em> range falls inside the requested range.
 */
@Schema(description = "Every field is optional. An empty object matches all stages.")
public record StageSearchRequest(
        @Valid BlastZoneFilter blastZones,
        @Valid DecimalRangeDto stageWidth,
        @Valid DecimalRangeDto distanceToBlastZone,
        @Valid IntRangeDto ledgeCount,
        FeatureFilter features) {

    public record BlastZoneFilter(
            @Valid DecimalRangeDto left,
            @Valid DecimalRangeDto right,
            @Valid DecimalRangeDto top,
            @Valid DecimalRangeDto bottom) {}

    @Schema(description = "A null or omitted flag means \"don't care\"; true or false must match exactly.")
    public record FeatureFilter(
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
