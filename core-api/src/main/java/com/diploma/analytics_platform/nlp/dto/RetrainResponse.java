package com.diploma.analytics_platform.nlp.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class RetrainResponse {

    private String status;

    @JsonProperty("examples_count")
    private Integer examplesCount;

    private String method;

    @JsonProperty("eval_count")
    private Integer evalCount;

    private Double accuracy;

    @JsonProperty("f1_score")
    private Double f1Score;

    private Double precision;

    private Double recall;
}