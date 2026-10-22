package com.rvictor.smash5objectivestagelist.stage.domain;

import jakarta.persistence.Embeddable;

/** Yes/no properties of a stage. */
@Embeddable
public record StageFeatures(
        boolean walkOffs,
        boolean ceiling,
        boolean wallInfinite,
        boolean random,
        boolean water,
        boolean symmetry,
        boolean transform,
        boolean twoDimensional,
        boolean ice,
        boolean hurtBox) {}
