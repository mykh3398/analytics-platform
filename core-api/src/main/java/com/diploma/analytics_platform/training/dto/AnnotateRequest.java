package com.diploma.analytics_platform.training.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class AnnotateRequest {
    private Long messageId;
    private String category;

    @JsonProperty("isPositive")
    @JsonAlias({"is_positive", "positive"})
    private Boolean isPositive;
}
