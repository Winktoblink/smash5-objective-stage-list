package com.rvictor.smash5objectivestagelist.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

class RangeValidator implements ConstraintValidator<ValidRange, RangeBounds<?>> {

    @Override
    public boolean isValid(RangeBounds<?> range, ConstraintValidatorContext context) {
        return range == null || isOrdered(range);
    }

    private static <T extends Comparable<? super T>> boolean isOrdered(RangeBounds<T> range) {
        T min = range.min();
        T max = range.max();
        return min == null || max == null || min.compareTo(max) <= 0;
    }
}
