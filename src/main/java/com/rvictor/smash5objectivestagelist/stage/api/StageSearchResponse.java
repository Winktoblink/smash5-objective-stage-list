package com.rvictor.smash5objectivestagelist.stage.api;

import java.util.List;

/** The stages that matched a search, sorted by name. */
public record StageSearchResponse(int count, List<StageResponse> stages) {

    static StageSearchResponse of(List<StageResponse> stages) {
        return new StageSearchResponse(stages.size(), stages);
    }
}
