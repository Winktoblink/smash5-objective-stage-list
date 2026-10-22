package com.rvictor.smash5objectivestagelist.stage.api;

import com.rvictor.smash5objectivestagelist.common.validation.RangeBounds;
import com.rvictor.smash5objectivestagelist.common.validation.ValidRange;
import io.swagger.v3.oas.annotations.media.Schema;

/** A whole-number {@code [min, max]} interval. In a search request either bound may be omitted. */
@ValidRange
@Schema(description = "A whole-number [min, max] interval. In a search request either bound may be omitted.")
public record IntRangeDto(Integer min, Integer max) implements RangeBounds<Integer> {}
