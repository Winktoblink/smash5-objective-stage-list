package com.rvictor.smash5objectivestagelist.support

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.context.annotation.Bean
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

/** A throwaway Postgres, matching the version in compose.yaml, wired in as the application's datasource. */
@TestConfiguration(proxyBeanMethods = false)
class PostgresTestConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgres() {
        new PostgreSQLContainer(DockerImageName.parse("postgres:18-alpine"))
    }
}
