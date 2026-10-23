package com.rvictor.smash5objectivestagelist.stage.api

import com.rvictor.smash5objectivestagelist.stage.domain.DecimalRange
import com.rvictor.smash5objectivestagelist.stage.domain.IntRange
import com.rvictor.smash5objectivestagelist.stage.domain.RangeMatch
import com.rvictor.smash5objectivestagelist.support.StageFixtures
import spock.lang.Specification

class StageApiMapperSpec extends Specification {

    def "an empty request maps to criteria with every part null"() {
        when:
        def criteria = StageApiMapper.toCriteria(new StageSearchRequest(null, null, null, null, null, null))

        then:
        criteria.blastZones() == null
        criteria.stageWidth() == null
        criteria.distanceToBlastZone() == null
        criteria.ledgeCount() == null
        criteria.features() == null
    }

    def "a full request maps every filter"() {
        given:
        def request = new StageSearchRequest(
                new StageSearchRequest.BlastZoneFilter(
                        new DecimalRangeDto(-260G, -220G),
                        new DecimalRangeDto(220G, 260G),
                        new DecimalRangeDto(170G, 200G),
                        new DecimalRangeDto(-150G, -100G)),
                new DecimalRangeDto(140G, 200G),
                new DecimalRangeDto(140G, 180G),
                new IntRangeDto(2, 2),
                new StageSearchRequest.FeatureFilter(false, null, false, false, false, true, false, null, false, false),
                RangeMatch.OVERLAPS)

        when:
        def criteria = StageApiMapper.toCriteria(request)

        then:
        criteria.blastZones().left() == new DecimalRange(-260G, -220G)
        criteria.blastZones().right() == new DecimalRange(220G, 260G)
        criteria.blastZones().top() == new DecimalRange(170G, 200G)
        criteria.blastZones().bottom() == new DecimalRange(-150G, -100G)
        criteria.stageWidth() == new DecimalRange(140G, 200G)
        criteria.distanceToBlastZone() == new DecimalRange(140G, 180G)
        criteria.ledgeCount() == new IntRange(2, 2)
        criteria.features().walkOffs() == false
        criteria.features().symmetry() == true
        criteria.rangeMatch() == RangeMatch.OVERLAPS
    }

    def "omitted bounds and flags stay null in the criteria"() {
        given:
        def request = new StageSearchRequest(
                new StageSearchRequest.BlastZoneFilter(new DecimalRangeDto(-240G, null), null, null, null),
                new DecimalRangeDto(null, 200G),
                null,
                null,
                new StageSearchRequest.FeatureFilter(null, null, null, null, null, null, null, null, true, null),
                null)

        when:
        def criteria = StageApiMapper.toCriteria(request)

        then:
        criteria.blastZones().left() == new DecimalRange(-240G, null)
        criteria.blastZones().right() == null
        criteria.stageWidth() == new DecimalRange(null, 200G)
        criteria.features().ice() == true
        criteria.features().water() == null
        criteria.rangeMatch() == RangeMatch.CONTAINED
    }

    def "a stage maps to a response with all of its measurements"() {
        when:
        def response = StageApiMapper.toResponse(StageFixtures.battlefield())

        then:
        response.id() == 5
        response.name() == "Battlefield"
        response.blastZones().left() == new DecimalRangeDto(-240G, -240G)
        response.blastZones().right() == new DecimalRangeDto(240G, 240G)
        response.blastZones().top() == new DecimalRangeDto(192G, 192G)
        response.blastZones().bottom() == new DecimalRangeDto(-140G, -140G)
        response.stageWidth() == 160G
        response.distanceToBlastZone() == new DecimalRangeDto(160G, 160G)
        response.ledgeCount() == new IntRangeDto(2, 2)
        response.features().symmetry()
        !response.features().walkOffs()
    }

    def "search results report their own size"() {
        when:
        def response = StageSearchResponse.of([StageApiMapper.toResponse(StageFixtures.battlefield())])

        then:
        response.count() == 1
        response.stages()*.name() == ["Battlefield"]
    }
}
