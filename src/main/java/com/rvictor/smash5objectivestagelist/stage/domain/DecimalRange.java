package com.rvictor.smash5objectivestagelist.stage.domain;

import jakarta.persistence.Embeddable;
import java.math.BigDecimal;

/**
 * A closed {@code [min, max]} interval of decimal measurements.
 *
 * <p>On a {@link Stage} both bounds are always present. In a {@link StageSearchCriteria} either bound
 * may be {@code null}, meaning that side is open-ended.
 */
@Embeddable
public record DecimalRange(BigDecimal min, BigDecimal max) {}
