package com.diploma.analytics_platform.messaging.normalization;

import com.diploma.analytics_platform.domain.model.UnifiedMessage;
import com.diploma.analytics_platform.messaging.dto.RawMessageDto;

public interface NormalizationStrategy {
    UnifiedMessage normalize(RawMessageDto raw);
    UnifiedMessage.MessageSource supportedSource();
}
