-- Enforce the invariants the application domain relies on.
--
-- V0 left the ledge counts and feature flags nullable and had no range checks.
-- Every seeded row already satisfies these rules, so the constraints can be
-- added without touching data. Hibernate runs in `validate` mode and the search
-- logic assumes non-null flags and min <= max for every range, so the schema
-- should guarantee it.

ALTER TABLE stage
    ALTER COLUMN ledge_min SET NOT NULL,
    ALTER COLUMN ledge_max SET NOT NULL,

    ALTER COLUMN walk_offs SET NOT NULL,
    ALTER COLUMN ceiling SET NOT NULL,
    ALTER COLUMN wall_infinite SET NOT NULL,
    ALTER COLUMN random SET NOT NULL,
    ALTER COLUMN water SET NOT NULL,
    ALTER COLUMN symmetry SET NOT NULL,
    ALTER COLUMN transform SET NOT NULL,
    ALTER COLUMN two_dimensional SET NOT NULL,
    ALTER COLUMN ice SET NOT NULL,
    ALTER COLUMN hurt_box SET NOT NULL;

ALTER TABLE stage
    ADD CONSTRAINT ck_stage_left_blast_zone CHECK (min_left_blast_zone <= max_left_blast_zone),
    ADD CONSTRAINT ck_stage_right_blast_zone CHECK (min_right_blast_zone <= max_right_blast_zone),
    ADD CONSTRAINT ck_stage_top_blast_zone CHECK (min_top_blast_zone <= max_top_blast_zone),
    ADD CONSTRAINT ck_stage_bottom_blast_zone CHECK (min_bottom_blast_zone <= max_bottom_blast_zone),
    ADD CONSTRAINT ck_stage_distance_to_blast_zone CHECK (min_distance_to_blast_zone <= max_distance_to_blast_zone),
    ADD CONSTRAINT ck_stage_ledge CHECK (ledge_min <= ledge_max);
