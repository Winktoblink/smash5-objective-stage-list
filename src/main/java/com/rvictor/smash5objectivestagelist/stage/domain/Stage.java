package com.rvictor.smash5objectivestagelist.stage.domain;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/**
 * A Super Smash Bros. Ultimate stage and its measurable properties.
 *
 * <p>Stages that move or transform store a {@code [min, max]} range for each measurement. The table is
 * read-only from the application's point of view; rows are added through Flyway migrations.
 */
@Entity
@Table(name = "stage")
public class Stage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stage_id")
    private Integer id;

    @Column(name = "stage_name", nullable = false)
    private String name;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "min", column = @Column(name = "min_left_blast_zone")),
        @AttributeOverride(name = "max", column = @Column(name = "max_left_blast_zone"))
    })
    private DecimalRange leftBlastZone;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "min", column = @Column(name = "min_right_blast_zone")),
        @AttributeOverride(name = "max", column = @Column(name = "max_right_blast_zone"))
    })
    private DecimalRange rightBlastZone;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "min", column = @Column(name = "min_top_blast_zone")),
        @AttributeOverride(name = "max", column = @Column(name = "max_top_blast_zone"))
    })
    private DecimalRange topBlastZone;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "min", column = @Column(name = "min_bottom_blast_zone")),
        @AttributeOverride(name = "max", column = @Column(name = "max_bottom_blast_zone"))
    })
    private DecimalRange bottomBlastZone;

    @Column(name = "stage_width", nullable = false)
    private BigDecimal stageWidth;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "min", column = @Column(name = "min_distance_to_blast_zone")),
        @AttributeOverride(name = "max", column = @Column(name = "max_distance_to_blast_zone"))
    })
    private DecimalRange distanceToBlastZone;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "min", column = @Column(name = "ledge_min")),
        @AttributeOverride(name = "max", column = @Column(name = "ledge_max"))
    })
    private IntRange ledgeCount;

    @Embedded
    private StageFeatures features;

    /** Required by JPA. */
    protected Stage() {}

    public Stage(
            String name,
            DecimalRange leftBlastZone,
            DecimalRange rightBlastZone,
            DecimalRange topBlastZone,
            DecimalRange bottomBlastZone,
            BigDecimal stageWidth,
            DecimalRange distanceToBlastZone,
            IntRange ledgeCount,
            StageFeatures features) {
        this.name = name;
        this.leftBlastZone = leftBlastZone;
        this.rightBlastZone = rightBlastZone;
        this.topBlastZone = topBlastZone;
        this.bottomBlastZone = bottomBlastZone;
        this.stageWidth = stageWidth;
        this.distanceToBlastZone = distanceToBlastZone;
        this.ledgeCount = ledgeCount;
        this.features = features;
    }

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public DecimalRange getLeftBlastZone() {
        return leftBlastZone;
    }

    public DecimalRange getRightBlastZone() {
        return rightBlastZone;
    }

    public DecimalRange getTopBlastZone() {
        return topBlastZone;
    }

    public DecimalRange getBottomBlastZone() {
        return bottomBlastZone;
    }

    public BigDecimal getStageWidth() {
        return stageWidth;
    }

    public DecimalRange getDistanceToBlastZone() {
        return distanceToBlastZone;
    }

    public IntRange getLedgeCount() {
        return ledgeCount;
    }

    public StageFeatures getFeatures() {
        return features;
    }
}
