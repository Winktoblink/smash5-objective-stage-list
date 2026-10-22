package com.rvictor.smash5objectivestagelist.common.validation

import com.rvictor.smash5objectivestagelist.stage.api.DecimalRangeDto
import com.rvictor.smash5objectivestagelist.stage.api.IntRangeDto
import spock.lang.Specification
import spock.lang.Unroll

class RangeValidatorSpec extends Specification {

    RangeValidator validator = new RangeValidator()

    @Unroll
    def "decimal range min=#min max=#max is valid: #valid"() {
        expect:
        validator.isValid(new DecimalRangeDto(min, max), null) == valid

        where:
        min   | max   || valid
        null  | null  || true
        -240G | null  || true
        null  | 240G  || true
        5G    | 5G    || true
        -240G | 240G  || true
        240G  | -240G || false
        5.1G  | 5.0G  || false
    }

    @Unroll
    def "int range min=#min max=#max is valid: #valid"() {
        expect:
        validator.isValid(new IntRangeDto(min, max), null) == valid

        where:
        min  | max  || valid
        null | null || true
        2    | null || true
        null | 2    || true
        2    | 2    || true
        1    | 3    || true
        3    | 1    || false
    }

    def "a missing range is valid"() {
        expect:
        validator.isValid(null, null)
    }
}
