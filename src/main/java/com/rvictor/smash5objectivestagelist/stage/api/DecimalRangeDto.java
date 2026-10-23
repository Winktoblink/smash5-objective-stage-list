package com.rvictor.smash5objectivestagelist.stage.api;

import com.rvictor.smash5objectivestagelist.common.validation.RangeBounds;
import com.rvictor.smash5objectivestagelist.common.validation.ValidRange;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

/** A {@code [min, max]} interval. In a search request either bound may be omitted. */
@ValidRange
@Schema(description = "A [min, max] interval. In a search request either bound may be omitted.")
public record DecimalRangeDto(BigDecimal min, BigDecimal max) implements RangeBounds<BigDecimal> {}
