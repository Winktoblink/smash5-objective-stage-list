package com.rvictor.smash5objectivestagelist.stage

import com.rvictor.smash5objectivestagelist.stage.api.StageSearchExamples
import com.rvictor.smash5objectivestagelist.support.PostgresTestConfiguration
import groovy.json.JsonSlurper
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import spock.lang.Shared
import spock.lang.Specification

import static java.nio.charset.StandardCharsets.UTF_8

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Runs the real application against a real Postgres. Flyway seeds the 109 stages, so the expected values
 * below are facts about that data set.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration)
class StageSearchIntegrationSpec extends Specification {

    static final List<String> CLASSIC_COMPETITIVE_STAGES = [
            "BattleField (Common)", "Battlefield", "Big Battlefield", "Dream Land (64)", "Final Destination",
            "Final Destination (Large)", "Fountain of Dreams", "Great Plateau Tower", "Kalos Pokémon League",
            "Kongo Jungle", "Luigi's Mansion", "Lylat Cruise", "Mementos", "Midgar", "PictoChat 2",
            "Pokémon Stadium", "Pokémon Stadium 2", "Skyloft", "Small Battlefield", "Smashville",
            "Spring Stadium", "Town & City", "Umbra Clock Tower", "Unova Pokémon League", "WarioWare, Inc.",
            "Wily Castle", "Wuhu Island", "Yggdrasil's Altar", "Yoshi Island", "Yoshi's Story"
    ]

    @Autowired
    MockMvc mvc

    @Shared
    JsonSlurper json = new JsonSlurper()

    private Map search(String body) {
        def response = mvc.perform(post("/api/v1/stages/search").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().response
        json.parseText(response.getContentAsString(UTF_8)) as Map
    }

    private static List<String> names(Map result) {
        result.stages*.name
    }

    def "an empty search returns every stage, sorted by name"() {
        when:
        def result = search("{}")

        then:
        result.count == 109
        result.stages.size() == 109
        names(result) == names(result).sort(false)
    }

    def "the classic competitive filter finds exactly the expected 30 stages"() {
        when:
        def result = search(StageSearchExamples.CLASSIC_COMPETITIVE)

        then:
        result.count == 30
        names(result) as Set == CLASSIC_COMPETITIVE_STAGES as Set
    }

    def "a range filter matches only stages whose whole range is inside it"() {
        when:
        def result = search(StageSearchExamples.LEFT_BLAST_ZONE_CONTAINMENT)

        then:
        result.count == 43
        "Port Town Aero Dive" in names(result)
        // Delfino Plaza (-230..-180) and Mario Circuit (-250..-175) only partly overlap the filter.
        !("Delfino Plaza" in names(result))
        !("Mario Circuit (Smash 4)" in names(result))
    }

    def "overlap matching also finds stages whose range only partly reaches the filter"() {
        when:
        def contained = search(StageSearchExamples.LEFT_BLAST_ZONE_CONTAINMENT)
        def overlapping = search(StageSearchExamples.LEFT_BLAST_ZONE_OVERLAP)

        then:
        // Containment results are a subset of the overlap results.
        (names(contained) as Set).every { it in names(overlapping) }
        // Delfino Plaza (-230..-180) and Mario Circuit (-250..-175) only partly overlap the filter.
        "Delfino Plaza" in names(overlapping)
        "Mario Circuit (Smash 4)" in names(overlapping)
        overlapping.count > contained.count
    }

    def "overlap matching treats each open-ended bound separately"() {
        expect:
        // Delfino Plaza's left blast zone is -230..-180.
        "Delfino Plaza" in names(search(body)) == expected

        where:
        body                                                                                 | expected
        '{"blastZones": {"left": {"min": -200}}, "rangeMatch": "OVERLAPS"}'                  | true
        '{"blastZones": {"left": {"min": -170}}, "rangeMatch": "OVERLAPS"}'                  | false
        '{"blastZones": {"left": {"max": -220}}, "rangeMatch": "OVERLAPS"}'                  | true
        '{"blastZones": {"left": {"max": -240}}, "rangeMatch": "OVERLAPS"}'                  | false
        '{"blastZones": {"left": {"min": -200}}, "rangeMatch": "CONTAINED"}'                 | false
        '{"blastZones": {"left": {"min": -240, "max": -200}}}'                               | false
    }

    def "a stage width filter behaves the same in both modes"() {
        expect:
        names(search('{"stageWidth": {"min": 900}, "rangeMatch": "OVERLAPS"}')) == ["Great Cave Offensive"]
        names(search('{"stageWidth": {"min": 900}, "rangeMatch": "CONTAINED"}')) == ["Great Cave Offensive"]
    }

    def "a range filter combines with a feature flag"() {
        when:
        def result = search('{"blastZones": {"left": {"min": -240, "max": -200}}, "features": {"walkOffs": false}}')

        then:
        result.count == 32
    }

    def "flags combine, and can narrow the result to a single stage"() {
        when:
        def result = search('{"features": {"ice": true, "water": true}}')

        then:
        names(result) == ["Summit"]
    }

    def "a range with only a min is open-ended on the other side"() {
        when:
        def result = search('{"stageWidth": {"min": 900}}')

        then:
        names(result) == ["Great Cave Offensive"]
    }

    def "an inverted range is rejected before reaching the database"() {
        expect:
        mvc.perform(post("/api/v1/stages/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content('{"stageWidth": {"min": 200, "max": 100}}'))
                .andExpect(status().isBadRequest())
    }

    def "a stage can be fetched by id, and an unknown id is a 404"() {
        given:
        def all = json.parseText(mvc.perform(get("/api/v1/stages")).andReturn().response.getContentAsString(UTF_8))
        def battlefield = all.find { it.name == "Battlefield" }

        when:
        def found = mvc.perform(get("/api/v1/stages/${battlefield.id}")).andExpect(status().isOk()).andReturn()

        then:
        json.parseText(found.response.getContentAsString(UTF_8)).name == "Battlefield"
        battlefield.blastZones.top.min == 192
        battlefield.ledgeCount.min == 2

        and:
        mvc.perform(get("/api/v1/stages/999999")).andExpect(status().isNotFound())
    }

    def "the actuator reports the application healthy"() {
        expect:
        mvc.perform(get("/actuator/health")).andExpect(status().isOk())
    }
}
