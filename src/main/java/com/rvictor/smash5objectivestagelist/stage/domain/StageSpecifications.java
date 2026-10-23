package com.rvictor.smash5objectivestagelist.stage.domain;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/**
 * Translates {@link StageSearchCriteria} into a JPA {@link Specification}.
 *
 * <p>By default range filters use <em>containment</em>: a stage matches only if its whole {@code [min, max]}
 * range lies inside the requested range. With {@link RangeMatch#OVERLAPS} a stage matches when its range
 * shares at least one value with the requested range. Stage width is a single value and matches when it
 * falls inside the requested range in either mode. Feature flags must match exactly when specified.
 */
public final class StageSpecifications {

    private StageSpecifications() {}

    public static Specification<Stage> matching(StageSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            boolean overlaps = criteria.rangeMatch() == RangeMatch.OVERLAPS;

            StageSearchCriteria.BlastZones blastZones = criteria.blastZones();
            if (blastZones != null) {
                addRange(predicates, cb, root, "leftBlastZone", blastZones.left(), overlaps);
                addRange(predicates, cb, root, "rightBlastZone", blastZones.right(), overlaps);
                addRange(predicates, cb, root, "topBlastZone", blastZones.top(), overlaps);
                addRange(predicates, cb, root, "bottomBlastZone", blastZones.bottom(), overlaps);
            }
            addRange(predicates, cb, root, "distanceToBlastZone", criteria.distanceToBlastZone(), overlaps);
            addRange(predicates, cb, root, "ledgeCount", criteria.ledgeCount(), overlaps);
            addWidth(predicates, cb, root, criteria.stageWidth());
            addFeatures(predicates, cb, root, criteria.features());

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static void addRange(
            List<Predicate> predicates,
            CriteriaBuilder cb,
            Root<Stage> root,
            String attribute,
            DecimalRange range,
            boolean overlaps) {
        if (range == null) {
            return;
        }
        addBounds(
                predicates,
                cb,
                root.<BigDecimal>get(attribute).get("min"),
                range.min(),
                root.<BigDecimal>get(attribute).get("max"),
                range.max(),
                overlaps);
    }

    private static void addRange(
            List<Predicate> predicates,
            CriteriaBuilder cb,
            Root<Stage> root,
            String attribute,
            IntRange range,
            boolean overlaps) {
        if (range == null) {
            return;
        }
        addBounds(
                predicates,
                cb,
                root.<Integer>get(attribute).get("min"),
                range.min(),
                root.<Integer>get(attribute).get("max"),
                range.max(),
                overlaps);
    }

    /**
     * Skips open-ended sides. Contained: {@code filterMin <= stageMin} and {@code stageMax <= filterMax}.
     * Overlapping: {@code stageMax >= filterMin} and {@code stageMin <= filterMax}.
     */
    private static <N extends Comparable<? super N>> void addBounds(
            List<Predicate> predicates,
            CriteriaBuilder cb,
            Path<N> stageMin,
            N filterMin,
            Path<N> stageMax,
            N filterMax,
            boolean overlaps) {
        if (filterMin != null) {
            predicates.add(cb.greaterThanOrEqualTo(overlaps ? stageMax : stageMin, filterMin));
        }
        if (filterMax != null) {
            predicates.add(cb.lessThanOrEqualTo(overlaps ? stageMin : stageMax, filterMax));
        }
    }

    private static void addWidth(List<Predicate> predicates, CriteriaBuilder cb, Root<Stage> root, DecimalRange range) {
        if (range == null) {
            return;
        }
        Path<BigDecimal> width = root.get("stageWidth");
        if (range.min() != null) {
            predicates.add(cb.greaterThanOrEqualTo(width, range.min()));
        }
        if (range.max() != null) {
            predicates.add(cb.lessThanOrEqualTo(width, range.max()));
        }
    }

    private static void addFeatures(
            List<Predicate> predicates, CriteriaBuilder cb, Root<Stage> root, StageSearchCriteria.Features features) {
        if (features == null) {
            return;
        }
        addFlag(predicates, cb, root, "walkOffs", features.walkOffs());
        addFlag(predicates, cb, root, "ceiling", features.ceiling());
        addFlag(predicates, cb, root, "wallInfinite", features.wallInfinite());
        addFlag(predicates, cb, root, "random", features.random());
        addFlag(predicates, cb, root, "water", features.water());
        addFlag(predicates, cb, root, "symmetry", features.symmetry());
        addFlag(predicates, cb, root, "transform", features.transform());
        addFlag(predicates, cb, root, "twoDimensional", features.twoDimensional());
        addFlag(predicates, cb, root, "ice", features.ice());
        addFlag(predicates, cb, root, "hurtBox", features.hurtBox());
    }

    private static void addFlag(
            List<Predicate> predicates, CriteriaBuilder cb, Root<Stage> root, String attribute, Boolean value) {
        if (value != null) {
            predicates.add(cb.equal(root.get("features").get(attribute), value));
        }
    }
}
