package com.rvictor.smash5objectivestagelist.stage.api

import com.rvictor.smash5objectivestagelist.stage.StageNotFoundException
import com.rvictor.smash5objectivestagelist.stage.StageService
import com.rvictor.smash5objectivestagelist.stage.domain.IntRange
import com.rvictor.smash5objectivestagelist.stage.domain.StageSearchCriteria
import com.rvictor.smash5objectivestagelist.support.StageFixtures
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.mockito.ArgumentCaptor
import org.mockito.Mockito
import spock.lang.Specification

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(StageController)
class StageControllerSpec extends Specification {

    static final MediaType PROBLEM_JSON = MediaType.APPLICATION_PROBLEM_JSON

    @Autowired
    MockMvc mvc

    @MockitoBean
    StageService stageService

    private StageSearchCriteria capturedCriteria() {
        def captor = ArgumentCaptor.forClass(StageSearchCriteria)
        Mockito.verify(stageService).search(captor.capture())
        captor.value
    }

    def "GET /stages returns every stage the service returns"() {
        given:
        Mockito.when(stageService.findAll()).thenReturn([StageFixtures.battlefield()])

        expect:
        mvc.perform(get("/api/v1/stages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath('$.length()').value(1))
                .andExpect(jsonPath('$[0].id').value(5))
                .andExpect(jsonPath('$[0].name').value("Battlefield"))
                .andExpect(jsonPath('$[0].blastZones.left.min').value(-240))
                .andExpect(jsonPath('$[0].stageWidth').value(160))
                .andExpect(jsonPath('$[0].ledgeCount.max').value(2))
                .andExpect(jsonPath('$[0].features.symmetry').value(true))
    }

    def "GET /stages/{id} returns one stage"() {
        given:
        Mockito.when(stageService.findById(5)).thenReturn(StageFixtures.battlefield())

        expect:
        mvc.perform(get("/api/v1/stages/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath('$.name').value("Battlefield"))
    }

    def "GET /stages/{id} for an unknown id is a 404 problem detail"() {
        given:
        Mockito.when(stageService.findById(999999)).thenThrow(new StageNotFoundException(999999))

        expect:
        mvc.perform(get("/api/v1/stages/999999"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath('$.status').value(404))
                .andExpect(jsonPath('$.detail').value("No stage with id 999999"))
    }

    def "GET /stages/{id} with a non-numeric id is a 400 problem detail"() {
        expect:
        mvc.perform(get("/api/v1/stages/battlefield"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
    }

    def "an empty search body reaches the service as empty criteria"() {
        given:
        Mockito.when(stageService.search(Mockito.any(StageSearchCriteria))).thenReturn([StageFixtures.battlefield()])

        when:
        def result = mvc.perform(post("/api/v1/stages/search").contentType(MediaType.APPLICATION_JSON).content("{}"))

        then:
        result.andExpect(status().isOk())
                .andExpect(jsonPath('$.count').value(1))
                .andExpect(jsonPath('$.stages[0].name').value("Battlefield"))
        capturedCriteria() == StageSearchCriteria.any()
    }

    def "search filters are translated into criteria"() {
        given:
        Mockito.when(stageService.search(Mockito.any(StageSearchCriteria))).thenReturn([])

        when:
        def result = mvc.perform(post("/api/v1/stages/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(StageSearchExamples.CLASSIC_COMPETITIVE))

        then:
        result.andExpect(status().isOk()).andExpect(jsonPath('$.count').value(0))
        def criteria = capturedCriteria()
        criteria.ledgeCount() == new IntRange(2, 2)
        criteria.features().symmetry() == true
        criteria.features().ceiling() == null
        criteria.stageWidth() == null
    }

    def "a range with min above max is a 400 listing the offending field"() {
        given:
        def body = '{"blastZones": {"left": {"min": -100, "max": -200}}, "ledgeCount": {"min": 3, "max": 1}}'

        expect:
        mvc.perform(post("/api/v1/stages/search").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath('$.title').value("Invalid request"))
                .andExpect(jsonPath('$.errors.length()').value(2))
                .andExpect(jsonPath('$.errors[?(@.field == "blastZones.left")].message')
                        .value("min must be less than or equal to max"))
                .andExpect(jsonPath('$.errors[?(@.field == "ledgeCount")].message')
                        .value("min must be less than or equal to max"))
    }

    def "malformed JSON is a 400 problem detail"() {
        expect:
        mvc.perform(post("/api/v1/stages/search").contentType(MediaType.APPLICATION_JSON).content('{"ledgeCount": '))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath('$.title').value("Malformed request"))
    }

    def "a value of the wrong type is a 400 problem detail"() {
        expect:
        mvc.perform(post("/api/v1/stages/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content('{"ledgeCount": {"min": "two"}}'))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath('$.title').value("Malformed request"))
    }
}
