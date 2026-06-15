package run.halo.live2d.chat;

import static org.springdoc.core.fn.builders.apiresponse.Builder.responseBuilder;
import static org.springdoc.core.fn.builders.content.Builder.contentBuilder;
import static org.springdoc.core.fn.builders.requestbody.Builder.requestBodyBuilder;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springdoc.core.fn.builders.schema.Builder;
import org.springdoc.webflux.core.fn.SpringdocRouteBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import run.halo.app.core.extension.endpoint.CustomEndpoint;
import run.halo.app.extension.GroupVersion;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.aifoundation.ui.InvalidUIMessageException;
import run.halo.aifoundation.ui.UIMessageChatRequest;
import run.halo.aifoundation.ui.UIMessageChunk;
import run.halo.aifoundation.ui.UIMessageStreamResponse;
import run.halo.aifoundation.ui.UIMessageTransportCodec;

@Slf4j
@Component
@AllArgsConstructor
public class AiChatEndpoint implements CustomEndpoint {

    private final ReactiveSettingFetcher reactiveSettingFetcher;

    private final AiChatService aiChatService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public RouterFunction<ServerResponse> endpoint() {
        var tag = groupVersion().toString();

        return SpringdocRouteBuilder.route()
            .POST("/live2d/ai/chat-process", this::chatProcess,
                builder -> builder.operationId("chatCompletion")
                    .description("Chat completion")
                    .tag(tag)
                    .requestBody(requestBodyBuilder()
                        .required(true)
                        .content(contentBuilder()
                            .mediaType(MediaType.APPLICATION_JSON_VALUE)
                            .schema(Builder.schemaBuilder()
                                .implementation(Map.class)
                            )
                        ))
                    .response(responseBuilder()
                        .implementation(String.class))
            )
            .build();
    }

    private Mono<ServerResponse> chatProcess(ServerRequest request) {
        return request.bodyToMono(Map.class)
            .map(this::toChatRequest)
            .flatMap(this::chatCompletion)
            .onErrorMap(InvalidUIMessageException.class,
                throwable -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    throwable.getMessage(), throwable))
            .onErrorResume(IllegalArgumentException.class,
                throwable -> Mono.just(aiChatService.errorResponse(throwable.getMessage())))
            .flatMap(response -> ServerResponse.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .headers(headers -> headers.setAll(response.headers()))
                .body(response.stream()
                    .map(chunk -> ServerSentEvent.builder(serializeChunk(chunk)).build())
                    .concatWithValues(ServerSentEvent.builder(
                        UIMessageStreamResponse.DONE_MARKER).build()), ServerSentEvent.class)
            );
    }


    private Mono<UIMessageStreamResponse> chatCompletion(UIMessageChatRequest<Void> chatRequest) {
        return reactiveSettingFetcher.fetch("aichat", AiChatConfig.class)
            .flatMap(aiChatConfig -> {
                if (!aiChatConfig.isAiChat()) {
                    return Mono.just(aiChatService.errorResponse("AI 聊天功能未启用"));
                }

                var baseSetting = aiChatConfig.aiChatBaseSetting();

                if (baseSetting.isAnonymous()) {
                    return aiChatService.streamChatCompletion(
                        baseSetting.modelName(), baseSetting.systemMessage(), chatRequest);
                }

                return ReactiveSecurityContextHolder.getContext()
                    .map(SecurityContext::getAuthentication)
                    .filter(this::isAuthenticated)
                    .switchIfEmpty(Mono.error(
                        new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录")))
                    .flatMap(authentication -> aiChatService.streamChatCompletion(
                        baseSetting.modelName(), baseSetting.systemMessage(), chatRequest));
            });
    }

    private boolean isAuthenticated(Authentication authentication) {
        return !isAnonymousUser(authentication.getName()) &&
            authentication.isAuthenticated();
    }

    private boolean isAnonymousUser(String name) {
        return "anonymousUser".equals(name);
    }

    @SuppressWarnings("unchecked")
    private UIMessageChatRequest<Void> toChatRequest(Map<?, ?> body) {
        return UIMessageTransportCodec.chatRequestFromMap((Map<String, Object>) body,
            ignored -> null);
    }

    private String serializeChunk(UIMessageChunk chunk) {
        try {
            return objectMapper.writeValueAsString(UIMessageTransportCodec.chunkToMap(chunk));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize UI message chunk", e);
        }
    }

    record AiChatConfig(boolean isAiChat, AiChatBaseSetting aiChatBaseSetting) {
        AiChatConfig {
            if (isAiChat && aiChatBaseSetting == null) {
                throw new IllegalArgumentException("ai chat base setting must not be null");
            }
        }
    }

    record AiChatBaseSetting(boolean isAnonymous, String systemMessage, String modelName) {
        AiChatBaseSetting {
            if (StringUtils.isBlank(systemMessage)) {
                throw new IllegalArgumentException("system message must not be null");
            }
            if (StringUtils.isBlank(modelName)) {
                throw new IllegalArgumentException("model name must not be null");
            }
        }
    }

    @Override
    public GroupVersion groupVersion() {
        return GroupVersion.parseAPIVersion("api.live2d.halo.run/v1alpha1");
    }
}
