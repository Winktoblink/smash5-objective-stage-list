package com.rvictor.smash5objectivestagelist.stage.api;

import com.rvictor.smash5objectivestagelist.stage.domain.DecimalRange;
import com.rvictor.smash5objectivestagelist.stage.domain.IntRange;
import com.rvictor.smash5objectivestagelist.stage.domain.Stage;
import com.rvictor.smash5objectivestagelist.stage.domain.StageFeatures;
import com.rvictor.smash5objectivestagelist.stage.domain.StageSearchCriteria;

/** Hand-written conversions between API types and domain types. A {@code null} input maps to {@code null}. */
final class StageApiMapper {

    private StageApiMapper() {}

    static StageSearchCriteria toCriteria(StageSearchRequest request) {
        StageSearchRequest.BlastZoneFilter blastZones = request.blastZones();
        StageSearchRequest.FeatureFilter features = request.features();
        return new StageSearchCriteria(
                blastZones == null
                        ? null
                        : new StageSearchCriteria.BlastZones(
                                toDomain(blastZones.left()),
                                toDomain(blastZones.right()),
                                toDomain(blastZones.top()),
                                toDomain(blastZones.bottom())),
                toDomain(request.stageWidth()),
                toDomain(request.distanceToBlastZone()),
                toDomain(request.ledgeCount()),
                features == null
                        ? null
                        : new StageSearchCriteria.Features(
                                features.walkOffs(),
                                features.ceiling(),
                                features.wallInfinite(),
                                features.random(),
                                features.water(),
                                features.symmetry(),
                                features.transform(),
                                features.twoDimensional(),
                                features.ice(),
                                features.hurtBox()),
                request.rangeMatch());
    }

    static StageResponse toResponse(Stage stage) {
        StageFeatures features = stage.getFeatures();
        return new StageResponse(
                stage.getId(),
                stage.getName(),
                new StageResponse.BlastZones(
                        toDto(stage.getLeftBlastZone()),
                        toDto(stage.getRightBlastZone()),
                        toDto(stage.getTopBlastZone()),
                        toDto(stage.getBottomBlastZone())),
                stage.getStageWidth(),
                toDto(stage.getDistanceToBlastZone()),
                toDto(stage.getLedgeCount()),
                new StageResponse.Features(
                        features.walkOffs(),
                        features.ceiling(),
                        features.wallInfinite(),
                        features.random(),
                        features.water(),
                        features.symmetry(),
                        features.transform(),
                        features.twoDimensional(),
                        features.ice(),
                        features.hurtBox()));
    }

    private static DecimalRange toDomain(DecimalRangeDto dto) {
        return dto == null ? null : new DecimalRange(dto.min(), dto.max());
    }

    private static IntRange toDomain(IntRangeDto dto) {
        return dto == null ? null : new IntRange(dto.min(), dto.max());
    }

    private static DecimalRangeDto toDto(DecimalRange range) {
        return new DecimalRangeDto(range.min(), range.max());
    }

    private static IntRangeDto toDto(IntRange range) {
        return new IntRangeDto(range.min(), range.max());
    }
}
