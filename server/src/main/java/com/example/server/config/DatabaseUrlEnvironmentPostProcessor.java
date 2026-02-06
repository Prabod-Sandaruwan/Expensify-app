package com.example.server.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> props = new HashMap<>();

        // Priority: SPRING_DATASOURCE_URL -> JDBC_DATABASE_URL -> MYSQL_URL -> DATABASE_URL
        String springUrl = environment.getProperty("SPRING_DATASOURCE_URL");
        String jdbcUrl = environment.getProperty("JDBC_DATABASE_URL");
        String mysqlUrl = environment.getProperty("MYSQL_URL");
        String databaseUrl = springUrl != null ? springUrl : (jdbcUrl != null ? jdbcUrl : mysqlUrl);

        // If databaseUrl exists and is not JDBC-form, try to parse it (mysql://user:pass@host:port/db)
        if (databaseUrl != null && !databaseUrl.startsWith("jdbc:")) {
            try {
                URI uri = new URI(databaseUrl);
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] up = userInfo.split(":", 2);
                    props.put("spring.datasource.username", up[0]);
                    props.put("spring.datasource.password", up[1]);
                }

                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 3306 : uri.getPort();
                String path = uri.getPath();
                if (path != null && path.startsWith("/")) path = path.substring(1);
                String constructed = String.format("jdbc:mysql://%s:%d/%s?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC", host, port, path);
                props.put("spring.datasource.url", constructed);
            } catch (Exception ignored) {
            }
        }

        // If JDBC form provided directly, ensure it maps to spring property name
        if (databaseUrl != null && databaseUrl.startsWith("jdbc:")) {
            props.put("spring.datasource.url", databaseUrl);
        }

        // Allow DB_USERNAME/DB_PASSWORD fallback
        if (!props.containsKey("spring.datasource.username")) {
            String dbUser = environment.getProperty("DB_USERNAME");
            if (dbUser != null) props.put("spring.datasource.username", dbUser);
        }
        if (!props.containsKey("spring.datasource.password")) {
            String dbPass = environment.getProperty("DB_PASSWORD");
            if (dbPass != null) props.put("spring.datasource.password", dbPass);
        }

        if (!props.isEmpty()) {
            MutablePropertySources sources = environment.getPropertySources();
            sources.addFirst(new MapPropertySource("database-url-property-source", props));
        }
    }
}
