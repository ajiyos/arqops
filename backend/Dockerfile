# syntax=docker/dockerfile:1

FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY pom.xml .
COPY src ./src
COPY mvnw .
COPY .mvn ./.mvn

RUN chmod +x mvnw && ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/arqops-backend-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
