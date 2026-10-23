package com.rvictor.smash5objectivestagelist.stage

import com.rvictor.smash5objectivestagelist.support.PostgresTestConfiguration
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import spock.lang.Specification

import static java.nio.charset.StandardCharsets.UTF_8

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Runs every case in {@code search-conformance.json} against the real API. The page's JavaScript evaluator
 * runs the same cases in {@code src/test/js/conformance.test.mjs}, so the two implementations can only
 * disagree if one of the two test suites fails.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration)
class StageConformanceSpec extends Specification {

    @Autowired
    MockMvc mvc

    static List<Map> cases() {
        def stream = StageConformanceSpec.getResourceAsStream("/search-conformance.json")
        new JsonSlurper().parse(stream, "UTF-8") as List<Map>
    }

    def "the API agrees with the shared conformance case: #testCase.name"() {
        when:
        def response = mvc.perform(post("/api/v1/stages/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(JsonOutput.toJson(testCase.request)))
                .andExpect(status().isOk())
                .andReturn().response
        def body = new JsonSlurper().parseText(response.getContentAsString(UTF_8)) as Map
        def names = body.stages*.name

        then:
        body.count == names.size()
        testCase.expectedCount == null || names.size() == testCase.expectedCount
        testCase.expected == null || (names as Set) == (testCase.expected as Set)

        where:
        testCase << cases()
    }

    def "the conformance file has cases for both match modes"() {
        expect:
        cases().any { it.request.rangeMatch == "OVERLAPS" }
        cases().any { it.request.rangeMatch == null }
    }
}
