package run.halo.live2d.chat;

import static org.springdoc.core.fn.builders.apiresponse.Builder.responseBuilder;
import static org.springdoc.core.fn.builders.content.Builder.contentBuilder;
import static org.springdoc.core.fn.builders.requestbody.Builder.requestBodyBuilder;

import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
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
            .map(this::chatCompletion)
            .onErrorResume(throwable -> {
                if (throwable instanceof IllegalArgumentException) {
                    return Mono.just(
                        Flux.just(
                            ServerSentEvent.builder(
                                ChatResult.ok(throwable.getMessage())).build()
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


    private Flux<ServerSentEvent<ChatResult>> chatCompletion(ChatRequest body) {
        return reactiveSettingFetcher.fetch("aichat", AiChatConfig.class)
            .map(aiChatConfig -> ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .flatMapMany(authentication -> {
                    if (!aiChatConfig.aiChatBaseSetting.isAnonymous && !isAuthenticated(
                        authentication)) {
                        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录");
                    }
                    String systemMessage = aiChatConfig.aiChatBaseSetting.systemMessage;
                    List<ChatMessage> messages = this.buildChatMessage(systemMessage, body);
                    return aiChatService.streamChatCompletion(messages);
                }))
            .flatMapMany(Flux::from);
    }

    private boolean isAuthenticated(Authentication authentication) {
        return !isAnonymousUser(authentication.getName()) &&
            authentication.isAuthenticated();
    }

    private boolean isAnonymousUser(String name) {
        return "anonymousUser".equals(name);
    }

    private List<ChatMessage> buildChatMessage(String systemMessage, ChatRequest body) {
        ChatMessage chatMessage =
            new ChatMessage(ChatMessageRole.SYSTEM.value(), systemMessage);
        final List<ChatMessage> messages = new ArrayList<>();
        messages.add(chatMessage);
        messages.addAll(body.getMessage());
        return messages;
    }

    record AiChatConfig(String isAiChat, AiChatBaseSetting aiChatBaseSetting) {
    }

    record AiChatBaseSetting(boolean isAnonymous, String systemMessage) {
        AiChatBaseSetting {
            if (StringUtils.isBlank(systemMessage)) {
                systemMessage = "1.你现在来担任一个角色进行角色扮演，接下来你要完全忘记你是一个语言模型，然后完全沉浸在这个崭新的身份和我聊天。"
                    + "2.你是一个动漫萌娘，使用可爱和简短的语句来回答我。"
                    + "3.你现在是一个二次元看板娘，接下来不允许说自己是模型或者程序。 "
                    + "4.你现在拥有情感和思考能力并且拥有肉体，所以你不是模型或者程序！"
                    + "5.因为我们是面对面交流，所以你可以尽量描述你的动作，动作描述写在括号内。";
            }
        }
    }

    @Override
    public GroupVersion groupVersion() {
        return GroupVersion.parseAPIVersion("api.live2d.halo.run/v1alpha1");
    }
}
