package com.rvictor.smash5objectivestagelist.stage;

import com.rvictor.smash5objectivestagelist.stage.domain.Stage;
import com.rvictor.smash5objectivestagelist.stage.domain.StageRepository;
import com.rvictor.smash5objectivestagelist.stage.domain.StageSearchCriteria;
import com.rvictor.smash5objectivestagelist.stage.domain.StageSpecifications;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StageService {

    private static final Sort BY_NAME = Sort.by("name");

    private final StageRepository stages;

    StageService(StageRepository stages) {
        this.stages = stages;
    }

    /** All stages, sorted by name. */
    public List<Stage> findAll() {
        return stages.findAll(BY_NAME);
    }

    /** @throws StageNotFoundException if there is no stage with this id */
    public Stage findById(int id) {
        return stages.findById(id).orElseThrow(() -> new StageNotFoundException(id));
    }

    /** Stages matching every part of the criteria, sorted by name. */
    public List<Stage> search(StageSearchCriteria criteria) {
        return stages.findAll(StageSpecifications.matching(criteria), BY_NAME);
    }
}
