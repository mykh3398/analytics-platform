package com.diploma.analytics_platform.nlp;

import com.diploma.analytics_platform.nlp.dto.ClassifyRequest;
import com.diploma.analytics_platform.nlp.dto.ClassifyResponse;
import com.diploma.analytics_platform.nlp.dto.RetrainRequest;
import com.diploma.analytics_platform.nlp.dto.RetrainResponse;
import com.diploma.analytics_platform.nlp.dto.ModelStatusResponse;
import com.diploma.analytics_platform.nlp.dto.TrainingExampleDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;

@Slf4j
@Service
public class NlpServiceClient {

    private final WebClient webClient;

    public NlpServiceClient(@Value("${nlp.service.url}") String nlpBaseUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(nlpBaseUrl)
                .build();
    }

    public ClassifyResponse classify(Long workspaceId, String text, List<String> categories, String customModelId) {
        log.debug("NLP classify: workspace={} categories={} model={}", workspaceId, categories, customModelId);
        return webClient.post()
                .uri("/classify")
                .bodyValue(ClassifyRequest.builder()
                        .workspaceId(workspaceId)
                        .text(text)
                        .categories(categories)
                        .customModelId(customModelId)
                        .build())
                .retrieve()
                .bodyToMono(ClassifyResponse.class)
                .block();
    }

    public RetrainResponse retrain(Long workspaceId, List<TrainingExampleDto> examples) {
        log.info("NLP retrain: {} прикладів для workspace={}", examples.size(), workspaceId);

        RetrainResponse response = webClient.post()
                .uri("/retrain")
                .bodyValue(RetrainRequest.builder()
                        .workspaceId(workspaceId)
                        .examples(examples)
                        .build())
                .retrieve()
                .bodyToMono(RetrainResponse.class)
                .block();

        if (response != null) {
            log.info("NLP retrain: status={} examples={} eval={} method={} accuracy={}% f1={}%",
                    response.getStatus(),
                    response.getExamplesCount(),
                    response.getEvalCount(),
                    response.getMethod(),
                    response.getAccuracy() != null ? String.format("%.1f", response.getAccuracy() * 100) : "N/A",
                    response.getF1Score() != null ? String.format("%.1f", response.getF1Score() * 100) : "N/A");
        }

        return response;
    }

    public ModelStatusResponse getModelStatus(Long workspaceId) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/model/status")
                        .queryParam("workspaceId", workspaceId)
                        .build())
                .retrieve()
                .bodyToMono(ModelStatusResponse.class)
                .block();
    }
}