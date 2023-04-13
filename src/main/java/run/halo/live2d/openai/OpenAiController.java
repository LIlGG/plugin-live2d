package run.halo.live2d.openai;

import com.theokanning.openai.completion.chat.ChatCompletionChunk;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ApiVersion;
import run.halo.live2d.Live2dSetting;
import run.halo.live2d.openai.service.impl.OpenAIServiceImpl;

/**
 * @author LIlGG
 */
@ApiVersion("v1alpha1")
@RestController
@RequestMapping("/openai")
public class OpenAiController {
    
    private final Live2dSetting live2dSetting;
    
    public OpenAiController(Live2dSetting live2dSetting) {
        this.live2dSetting = live2dSetting;
    }
    
    @PostMapping(value = "/chat-process", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    Flux<ChatCompletionChunk> chatProcess(@RequestBody ChatRequest body,
        @AuthenticationPrincipal Authentication authentication) {
        return this.live2dSetting.getValue("openai", "isAnonymous").doOnNext(
            isAnonymous -> {
                if (!isAnonymous.asBoolean() && !isAuthenticated(
                    authentication)) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "请先登录"
                    );
                }
            }).then(this.buildChatCompletionRequest(body)).flatMap(
            request -> this.live2dSetting.getGroup("openai")
                .map(OpenAIServiceImpl::getOpenAiService)
                .map(openAiService -> openAiService.streamChatCompletion(
                    request))).flatMapMany(Flux::from);
    }
    
    private boolean isAuthenticated(Authentication authentication) {
        return !isAnonymousUser(authentication.getName()) &&
            authentication.isAuthenticated();
    }
    
    private boolean isAnonymousUser(String name) {
        return "anonymousUser".equals(name);
    }
    
    private Mono<ChatCompletionRequest> buildChatCompletionRequest(
        ChatRequest body) {
        return Mono.just(ChatCompletionRequest.builder().stream(true)).flatMap(
            builder -> this.live2dSetting.getValue("openai", "model")
                .map(model -> builder.model(model.asText()))).flatMap(
            builder -> this.live2dSetting.getValue("openai", "systemMessage")
                .map(systemMessage -> {
                    ChatMessage chatMessage = new ChatMessage(
                        ChatMessageRole.SYSTEM.value(), systemMessage.asText());
                    final List<ChatMessage> messages = new ArrayList<>();
                    messages.add(chatMessage);
                    messages.addAll(body.getMessage());
                    builder.messages(messages);
                    builder.build();
                    return builder;
                })
                .thenReturn(builder)).map(
            ChatCompletionRequest.ChatCompletionRequestBuilder::build);
    }
}
