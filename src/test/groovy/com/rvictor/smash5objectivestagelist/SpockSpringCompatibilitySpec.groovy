package com.rvictor.smash5objectivestagelist

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.test.context.ContextConfiguration
import spock.lang.Specification

@ContextConfiguration(classes = Config)
class SpockSpringCompatibilitySpec extends Specification {

    @Autowired
    String greeting

    def "spock-spring wires a Spring context"() {
        expect:
        greeting == "hello"
    }

    @Configuration
    static class Config {
        @Bean
        String greeting() { "hello" }
    }
}
