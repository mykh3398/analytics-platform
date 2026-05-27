package com.diploma.analytics_platform.messaging.normalization;

import com.diploma.analytics_platform.domain.model.UnifiedMessage;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class NormalizerFactory {

    private final Map<UnifiedMessage.MessageSource, NormalizationStrategy> strategies;

    public NormalizerFactory(List<NormalizationStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(
                        NormalizationStrategy::supportedSource,
                        Function.identity()
                ));
    }

    public NormalizationStrategy getStrategy(UnifiedMessage.MessageSource source) {
        NormalizationStrategy strategy = strategies.get(source);
        if (strategy == null) {
            throw new IllegalArgumentException(
                    "Немає стратегії для джерела: " + source);
        }
        return strategy;
    }
}
