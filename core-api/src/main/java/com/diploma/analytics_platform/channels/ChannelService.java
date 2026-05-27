package com.diploma.analytics_platform.channels;

import com.diploma.analytics_platform.channels.dto.ChannelResponse;
import com.diploma.analytics_platform.channels.dto.CreateChannelRequest;
import com.diploma.analytics_platform.domain.model.Channel;
import com.diploma.analytics_platform.domain.repository.ChannelRepository;
import com.diploma.analytics_platform.messaging.RabbitMQConfig;
import com.diploma.analytics_platform.messaging.dto.BotControlMessage;
import com.diploma.analytics_platform.messaging.dto.MetaControlMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChannelService {

    private final ChannelRepository channelRepository;
    private final RabbitTemplate rabbitTemplate;

    public List<ChannelResponse> getAll() {
        return channelRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private ChannelResponse toResponse(Channel c) {
        return ChannelResponse.builder()
                .id(c.getId())
                .type(c.getType())
                .instanceId(c.getInstanceId())
                .label(c.getLabel())
                .status(c.getStatus())
                .createdAt(c.getCreatedAt())
                .build();
    }

    public ChannelResponse create(CreateChannelRequest req) {

        if (channelRepository.existsByInstanceIdAndType(
                req.getInstanceId(), req.getType())) {
            throw new IllegalArgumentException(
                    "Канал з instanceId='" + req.getInstanceId()
                            + "' та type='" + req.getType() + "' вже існує");
        }

        if (req.getToken() != null
                && channelRepository.existsByToken(req.getToken())) {
            throw new IllegalArgumentException(
                    "Цей токен вже використовується в системі");
        }

        String label = (req.getLabel() != null && !req.getLabel().isBlank())
                ? req.getLabel()
                : req.getType() + " / " + req.getInstanceId();

        Channel channel = Channel.builder()
                .type(req.getType().toUpperCase())
                .instanceId(req.getInstanceId())
                .label(label)
                .token(req.getToken())
                .status(Channel.ChannelStatus.ACTIVE)
                .build();

        try {
            Channel saved = channelRepository.save(channel);
            log.info("Створено канал: type={} instanceId={} workspaceId={}",
                    saved.getType(), saved.getInstanceId(), saved.getWorkspaceId());

            if ("TELEGRAM".equalsIgnoreCase(saved.getType())
                    && saved.getToken() != null) {
                publishBotControl("start", saved.getInstanceId(), saved.getToken());
            }

            if (isMetaPlatform(saved.getType())) {
                publishMetaControl("add_page", saved);
            }

            return toResponse(saved);

        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException(
                    "Цей токен вже використовується в системі");
        }
    }

    public void delete(Long id) {
        Channel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Канал не знайдено: " + id));

        channelRepository.deleteById(id);
        log.info("Видалено канал id={}", id);

        if ("TELEGRAM".equalsIgnoreCase(channel.getType())) {
            publishBotControl("stop", channel.getInstanceId(), null);
        }

        if (isMetaPlatform(channel.getType())) {
            publishMetaControl("remove_page", channel);
        }
    }

    private boolean isMetaPlatform(String type) {
        return "INSTAGRAM".equalsIgnoreCase(type)
                || "FACEBOOK".equalsIgnoreCase(type);
    }

    private void publishBotControl(String action, String instanceId, String token) {
        try {
            BotControlMessage msg = BotControlMessage.builder()
                    .action(action)
                    .instanceId(instanceId)
                    .token(token)
                    .build();

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.BOT_CONTROL_EXCHANGE,
                    RabbitMQConfig.RK_CONTROL_TG,
                    msg);

            log.info("Bot control published: action={} instanceId={} routingKey={}",
                    action, instanceId, RabbitMQConfig.RK_CONTROL_TG);
        } catch (Exception e) {
            log.warn("Не вдалось опублікувати bot control message: {}", e.getMessage());
        }
    }

    private void publishMetaControl(String action, Channel channel) {
        try {
            MetaControlMessage msg = MetaControlMessage.builder()
                    .action(action)
                    .pageId(channel.getInstanceId())
                    .instanceId(channel.getInstanceId())
                    .workspaceId(String.valueOf(channel.getWorkspaceId()))
                    .accessToken(channel.getToken())
                    .platform(channel.getType().toUpperCase())
                    .build();

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.BOT_CONTROL_EXCHANGE,
                    RabbitMQConfig.RK_CONTROL_META,
                    msg);

            log.info("Meta control published: action={} platform={} instanceId={} routingKey={}",
                    action, channel.getType(), channel.getInstanceId(), RabbitMQConfig.RK_CONTROL_META);
        } catch (Exception e) {
            log.warn("Не вдалось опублікувати Meta control message: {}", e.getMessage());
        }
    }
}