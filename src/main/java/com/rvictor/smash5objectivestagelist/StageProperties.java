package com.rvictor.smash5objectivestagelist;

import java.math.BigDecimal;

public record StageProperties(BigDecimal minLeftBlastZone,
                              BigDecimal maxLeftBlastZone,
                              BigDecimal minRightBlastZone,
                              BigDecimal maxRightBlastZone,
                              BigDecimal minTopBlastZone,
                              BigDecimal maxTopBlastZone,
                              BigDecimal minBottomBlastZone,
                              BigDecimal maxBottomBlastZone,
                              BigDecimal stageWidth,
                              BigDecimal distanceToBlastZoneMin,
                              BigDecimal distanceToBlastZoneMax,
                              Integer ledgeMin,
                              Integer ledgeMax,
                              Boolean walkOffs,
                              Boolean ceiling,
                              Boolean wallInfinite,
                              Boolean random,
                              Boolean water,
                              Boolean symmetry,
                              Boolean transform,
                              Boolean twoDimensional,
                              Boolean ice,
                              Boolean hurtBox) {
}
