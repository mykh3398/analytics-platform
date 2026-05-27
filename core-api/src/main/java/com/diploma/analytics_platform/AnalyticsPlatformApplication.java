package com.diploma.analytics_platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AnalyticsPlatformApplication {

	public static void main(String[] args) {
		SpringApplication.run(AnalyticsPlatformApplication.class, args);
	}

}
