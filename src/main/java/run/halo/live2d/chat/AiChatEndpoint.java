package run.halo.live2d.chat;

import static org.springdoc.core.fn.builders.apiresponse.Builder.responseBuilder;
import static org.springdoc.core.fn.builders.content.Builder.contentBuilder;
import static org.springdoc.core.fn.builders.requestbody.Builder.requestBodyBuilder;

import java.util.ArrayList;
import java.util.List;
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
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import run.halo.app.core.extension.endpoint.CustomEndpoint;
import run.halo.app.extension.GroupVersion;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.aifoundation.message.ModelMessage;

@Slf4j
@Component
@AllArgsConstructor
public class AiChatEndpoint implements CustomEndpoint {

    private final ReactiveSettingFetcher reactiveSettingFetcher;

    private final AiChatService aiChatService;

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
                            .mediaType(MediaType.TEXT_EVENT_STREAM_VALUE)
                            .schema(Builder.schemaBuilder()
                                .implementation(ChatRequest.class)
                            )
                        ))
                    .response(responseBuilder()
                        .implementation(ServerSentEvent.class))
            )
            .build();
    }

    private Mono<ServerResponse> chatProcess(ServerRequest request) {
        return request.bodyToMono(ChatRequest.class)
            .flatMap(this::chatCompletion)
            .onErrorResume(throwable -> {
                if (throwable instanceof IllegalArgumentException) {
                    return Mono.just(
                        Flux.just(
                            ServerSentEvent.builder(
                                ChatResult.error(throwable.getMessage())).build()
                        )
                    );
                }
                return Mono.error(throwable);
            })
            .flatMap(sse -> ServerResponse.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(sse, ServerSentEvent.class)
            );
    }


    private Mono<Flux<ServerSentEvent<ChatResult>>> chatCompletion(ChatRequest body) {
        return reactiveSettingFetcher.fetch("aichat", AiChatConfig.class)
            .flatMap(aiChatConfig -> {
                if (!aiChatConfig.isAiChat()) {
                    return Mono.just(Flux.just(ServerSentEvent.builder(
                        ChatResult.error("AI 聊天功能未启用")).build()));
                }

                List<ModelMessage> messages = this.buildChatMessage(
                    aiChatConfig.aiChatBaseSetting().systemMessage(), body);

                if (aiChatConfig.aiChatBaseSetting().isAnonymous()) {
                    return Mono.just(aiChatService.streamChatCompletion(
                        aiChatConfig.aiChatBaseSetting().modelName(), messages));
                }

                return ReactiveSecurityContextHolder.getContext()
                    .map(SecurityContext::getAuthentication)
                    .filter(this::isAuthenticated)
                    .switchIfEmpty(Mono.error(
                        new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录")))
                    .map(authentication -> aiChatService.streamChatCompletion(
                        aiChatConfig.aiChatBaseSetting().modelName(), messages));
            });
    }

    private boolean isAuthenticated(Authentication authentication) {
        return !isAnonymousUser(authentication.getName()) &&
            authentication.isAuthenticated();
    }

    private boolean isAnonymousUser(String name) {
        return "anonymousUser".equals(name);
    }

    private List<ModelMessage> buildChatMessage(String systemMessage, ChatRequest body) {
        if (body.getMessage() == null || body.getMessage().isEmpty()) {
            throw new IllegalArgumentException("chat messages must not be empty");
        }
        List<ModelMessage> messages = new ArrayList<>();
        messages.add(ModelMessage.system(systemMessage));
        body.getMessage().stream()
            .map(ChatRequest.ChatMessagePayload::toFoundationMessage)
            .forEach(messages::add);
        return messages;
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
