package com.rvictor.smash5objectivestagelist.stage

import com.rvictor.smash5objectivestagelist.support.PostgresTestConfiguration
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import spock.lang.Specification

import static java.nio.charset.StandardCharsets.UTF_8

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * The static search page evaluates criteria in the browser from {@code static/data/stages.json}. That file
 * must say exactly what {@code GET /api/v1/stages} says, because the Flyway migrations are the only source of
 * truth. This golden-file test fails on any difference. After changing the data, regenerate the file with
 * {@code ./gradlew test --tests '*StageDataSnapshotSpec' -PupdateStageSnapshot}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration)
class StageDataSnapshotSpec extends Specification {

    @Autowired
    MockMvc mvc

    def "the committed stage snapshot equals what the API returns"() {
        given:
        def snapshot = new File(System.getProperty("stageSnapshot.file"))
        def apiBody = mvc.perform(get("/api/v1/stages")).andExpect(status().isOk())
                .andReturn().response.getContentAsString(UTF_8)

        when:
        if (Boolean.getBoolean("stageSnapshot.update")) {
            snapshot.parentFile.mkdirs()
            // One stage per line keeps the file small and its diffs readable.
            def stages = new JsonSlurper().parseText(apiBody) as List
            snapshot.setText("[\n" + stages.collect { JsonOutput.toJson(it) }.join(",\n") + "\n]\n", "UTF-8")
        }

        then: "the parsed documents are identical, so formatting never matters"
        snapshot.exists()
        new JsonSlurper().parseText(snapshot.getText("UTF-8")) == new JsonSlurper().parseText(apiBody)
    }
}
