package com.diploma.analytics_platform.nlp.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.util.Map;

@Data @NoArgsConstructor @AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ModelStatusResponse {

    @JsonProperty("current_method")
    private String currentMethod;

    @JsonProperty("total_examples")
    private Integer totalExamples;

    @JsonProperty("examples_per_category")
    private Map<String, Integer> examplesPerCategory;

    @JsonProperty("min_examples_to_switch")
    private Integer minExamplesToSwitch;

    @JsonProperty("zero_shot_model_loaded")
    private Boolean zeroShotModelLoaded;

    private Double accuracy;

    @JsonProperty("f1_score")
    private Double f1Score;

    private Double precision;
    private Double recall;

    @JsonProperty("eval_count")
    private Integer evalCount;
}