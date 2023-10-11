package com.rvictor.smash5objectivestagelist;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@SpringBootApplication
@RestController
public class Smash5ObjectiveStageListApplication {

	public static void main(String[] args) {
		SpringApplication.run(Smash5ObjectiveStageListApplication.class, args);
	}

	@PostMapping("/stagelist")
	public StageList newStageList(@RequestBody StageProperties stageProperties) {
		return new StageList(Collections.<String>emptyList());
	}
}
