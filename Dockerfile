# syntax=docker/dockerfile:1

# Build the jar. Gradle files are copied first so dependency downloads stay cached
# until the build scripts change.
FROM eclipse-temurin:25.0.4.1_1-jdk-noble AS build
WORKDIR /workspace
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN ./gradlew --no-daemon --version
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# Split the jar into layers so unchanged dependencies are reused between image builds.
FROM eclipse-temurin:25.0.4.1_1-jdk-noble AS extract
WORKDIR /extract
COPY --from=build /workspace/build/libs/*-SNAPSHOT.jar app.jar
RUN java -Djarmode=tools -jar app.jar extract --layers --launcher --destination layers

FROM eclipse-temurin:25.0.4.1_1-jre-noble
RUN useradd --system --no-create-home --uid 10001 spring
USER spring
WORKDIR /app
COPY --from=extract /extract/layers/dependencies/ ./
COPY --from=extract /extract/layers/spring-boot-loader/ ./
COPY --from=extract /extract/layers/snapshot-dependencies/ ./
COPY --from=extract /extract/layers/application/ ./
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
