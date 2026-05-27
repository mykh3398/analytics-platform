package com.diploma.analytics_platform.api;

import com.diploma.analytics_platform.channels.dto.MetaChannelSyncResponse;
import com.diploma.analytics_platform.channels.dto.TelegramChannelSyncResponse;
import com.diploma.analytics_platform.domain.repository.ChannelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalController {

    private final ChannelRepository channelRepository;

    @GetMapping("/channels/telegram")
    public ResponseEntity<List<TelegramChannelSyncResponse>> getTelegramChannels() {
        List<TelegramChannelSyncResponse> channels = channelRepository
                .findAllActiveTelegramNative()
                .stream()
                .map(c -> TelegramChannelSyncResponse.builder()
                        .instanceId(c.getInstanceId())
                        .token(c.getToken())
                        .build())
                .collect(Collectors.toList());

        log.info("Internal sync: {} active Telegram channels", channels.size());
        return ResponseEntity.ok(channels);
    }

    @GetMapping("/channels/meta")
    public ResponseEntity<List<MetaChannelSyncResponse>> getMetaChannels() {
        List<MetaChannelSyncResponse> channels = channelRepository
                .findAllActiveMetaNative()
                .stream()
                .map(c -> MetaChannelSyncResponse.builder()
                        .pageId(c.getInstanceId())
                        .instanceId(c.getInstanceId())
                        .workspaceId(String.valueOf(c.getWorkspaceId()))
                        .accessToken(c.getToken())
                        .platform(c.getType().toUpperCase())
                        .build())
                .collect(Collectors.toList());

        log.info("Internal sync: {} active Meta channels", channels.size());
        return ResponseEntity.ok(channels);
    }
}