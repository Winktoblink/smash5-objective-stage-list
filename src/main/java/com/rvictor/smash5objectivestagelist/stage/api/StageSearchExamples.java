package com.rvictor.smash5objectivestagelist.stage.api;

/** Request bodies shown in Swagger UI. The integration tests execute these, so they stay runnable. */
public final class StageSearchExamples {

    private StageSearchExamples() {}

    /** Two ledges, symmetrical, and none of the hazards that tournaments usually ban. */
    public static final String CLASSIC_COMPETITIVE =
            """
            {
              "ledgeCount": { "min": 2, "max": 2 },
              "features": {
                "walkOffs": false,
                "wallInfinite": false,
                "random": false,
                "water": false,
                "symmetry": true,
                "transform": false,
                "ice": false,
                "hurtBox": false
              }
            }
            """;

    /** Stages whose left blast zone never leaves {@code [-240, -200]}. */
    public static final String LEFT_BLAST_ZONE_CONTAINMENT =
            """
            {
              "blastZones": { "left": { "min": -240, "max": -200 } }
            }
            """;
}
