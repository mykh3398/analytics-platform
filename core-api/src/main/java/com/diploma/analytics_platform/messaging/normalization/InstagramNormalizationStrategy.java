package com.diploma.analytics_platform.messaging.normalization;

import com.diploma.analytics_platform.domain.model.UnifiedMessage;
import com.diploma.analytics_platform.domain.model.UnifiedMessage.MessageSource;
import com.diploma.analytics_platform.messaging.dto.RawMessageDto;
import org.springframework.stereotype.Component;

@Component
public class InstagramNormalizationStrategy
        extends AbstractMetaNormalizationStrategy {

    @Override
    public MessageSource supportedSource() {
        return MessageSource.INSTAGRAM;
    }

    @Override
    protected void enrichFromMeta(
            UnifiedMessage.UnifiedMessageBuilder builder,
            RawMessageDto raw) {
    }
}