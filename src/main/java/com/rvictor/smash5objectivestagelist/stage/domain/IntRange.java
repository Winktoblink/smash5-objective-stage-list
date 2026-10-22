package com.rvictor.smash5objectivestagelist.stage.domain;

import jakarta.persistence.Embeddable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A closed {@code [min, max]} interval of whole numbers, stored in {@code SMALLINT} columns.
 *
 * <p>In a {@link StageSearchCriteria} either bound may be {@code null}, meaning that side is open-ended.
 */
@Embeddable
public record IntRange(
        @JdbcTypeCode(SqlTypes.SMALLINT) Integer min,
        @JdbcTypeCode(SqlTypes.SMALLINT) Integer max) {}
