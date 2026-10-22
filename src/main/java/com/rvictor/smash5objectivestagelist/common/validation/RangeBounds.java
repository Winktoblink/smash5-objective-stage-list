package com.rvictor.smash5objectivestagelist.common.validation;

/** A pair of optional bounds that {@link ValidRange} can check. */
public interface RangeBounds<T extends Comparable<? super T>> {

    T min();

    T max();
}
