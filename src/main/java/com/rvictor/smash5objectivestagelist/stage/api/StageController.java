package com.rvictor.smash5objectivestagelist.stage.api;

import com.rvictor.smash5objectivestagelist.stage.StageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stages")
@Tag(name = "Stages", description = "Look up and filter Super Smash Bros. Ultimate stages")
class StageController {

    private final StageService stageService;

    StageController(StageService stageService) {
        this.stageService = stageService;
    }

    @Operation(summary = "List every stage, sorted by name")
    @GetMapping
    List<StageResponse> list() {
        return stageService.findAll().stream().map(StageApiMapper::toResponse).toList();
    }

    @Operation(summary = "Get one stage by id")
    @GetMapping("/{id}")
    StageResponse get(@PathVariable int id) {
        return StageApiMapper.toResponse(stageService.findById(id));
    }

    @Operation(
            summary = "Find stages that satisfy every given filter",
            description = "Range filters match only stages whose entire range lies inside the requested range."
                    + " Omit a bound to leave that side open. Feature flags must match exactly; omit a flag to"
                    + " ignore it. Results are sorted by name.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content =
                    @Content(
                            examples = {
                                @ExampleObject(
                                        name = "Classic competitive",
                                        value = StageSearchExamples.CLASSIC_COMPETITIVE),
                                @ExampleObject(
                                        name = "Left blast zone containment",
                                        value = StageSearchExamples.LEFT_BLAST_ZONE_CONTAINMENT)
                            }))
    @PostMapping("/search")
    StageSearchResponse search(@Valid @RequestBody StageSearchRequest request) {
        List<StageResponse> stages = stageService.search(StageApiMapper.toCriteria(request)).stream()
                .map(StageApiMapper::toResponse)
                .toList();
        return StageSearchResponse.of(stages);
    }
}
