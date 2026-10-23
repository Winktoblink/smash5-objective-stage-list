-- Corrections to the seed data approved by the project owner.

-- "BattleField (Common)" has exactly the same measurements and flags as "Battlefield", so it
-- is a duplicate row and would show up twice in every search.
DELETE FROM stage WHERE stage_name = 'BattleField (Common)';

-- "Final Destination (Large)" only exists with five or more players and is never available in
-- a one-on-one match, so it cannot appear on a tournament stage list.
DELETE FROM stage WHERE stage_name = 'Final Destination (Large)';

-- "Yoshi Island" is Yoshi's Island from Brawl. The Melee version is already named
-- "Yoshi's Island (Melee)", so the name now follows the same pattern.
UPDATE stage SET stage_name = 'Yoshi''s Island (Brawl)' WHERE stage_name = 'Yoshi Island';

-- The game spells the stage "Mario Bros." with a final period.
UPDATE stage SET stage_name = 'Mario Bros.' WHERE stage_name = 'Mario Bros';
