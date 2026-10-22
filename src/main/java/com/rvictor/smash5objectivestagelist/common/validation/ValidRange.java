package com.rvictor.smash5objectivestagelist.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.TYPE;

/** Requires {@code min <= max} when both bounds are present. A missing bound is always valid. */
@Documented
@Constraint(validatedBy = RangeValidator.class)
@Target(TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidRange {

    String message() default "min must be less than or equal to max";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
