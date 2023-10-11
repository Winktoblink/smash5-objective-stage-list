package com.rvictor.smash5objectivestagelist

import spock.lang.Specification

class Smash5ObjectiveStageListApplicationSpec extends Specification {

    Smash5ObjectiveStageListApplication stageListApplication = new Smash5ObjectiveStageListApplication()

    def "NewStageList happy path"() {
        given:
        StageProperties stageProperties = new StageProperties(-240.0,
                -240.0,
                240.0,
                240.0,
                180.0,
                180.0,
                -140.0,
                -140.0,
                160.0,
                160.0,
                160.0,
                2,
                2,
                false,
                false,
                false,
                false,
                false,
                true,
                false,
                false,
                false,
                false
        )

        when:
        stageListApplication.newStageList(stageProperties)

        then:
        noExceptionThrown()
    }
}
