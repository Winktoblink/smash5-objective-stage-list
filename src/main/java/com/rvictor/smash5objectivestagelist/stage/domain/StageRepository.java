package com.rvictor.smash5objectivestagelist.stage.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StageRepository extends JpaRepository<Stage, Integer>, JpaSpecificationExecutor<Stage> {}
