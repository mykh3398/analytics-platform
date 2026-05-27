package com.diploma.analytics_platform.messaging;

import com.diploma.analytics_platform.messaging.dto.RawMessageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessagePublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(RawMessageDto dto, String routingKey) {
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, routingKey, dto);
        log.info("Published: source={} instance={} id={} routingKey={}",
                dto.getSource(), dto.getInstanceId(), dto.getExternalId(), routingKey);
    }
}