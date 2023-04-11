package run.halo.live2d.openai;

import com.theokanning.openai.completion.chat.ChatCompletionChunk;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import java.util.ArrayList;
import java.util.List;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ApiVersion;
import run.halo.live2d.Live2dSetting;
import run.halo.live2d.openai.service.OpenAiService;

/**
 * @author LIlGG
 */
@ApiVersion("v1alpha1")
@RestController
@RequestMapping("/openai")
public class OpenAiController {

    private final ApplicationContext applicationContext;

    private final Live2dSetting live2dSetting;

    public OpenAiController(ApplicationContext applicationContext,
        Live2dSetting live2dSetting) {
        this.applicationContext = applicationContext;
        this.live2dSetting = live2dSetting;
    }

    @PostMapping(value = "/chat-process", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    Mono<ChatCompletionChunk> chatProcess(@RequestBody ChatRequest body) {
        return buildChatCompletionRequest(body)
            .flatMap(request -> {
                OpenAiService openAiService = applicationContext.getBean(OpenAiService.class);
                return Mono.from(openAiService.streamChatCompletion(request));
            });
    }

    private Mono<ChatCompletionRequest> buildChatCompletionRequest(ChatRequest body) {
        return Mono.just(ChatCompletionRequest.builder())
            .flatMap(builder -> this.live2dSetting.getValue("openai", "systemMessage")
                .map(systemMessage -> {
                    ChatMessage chatMessage = new ChatMessage(
                        ChatMessageRole.SYSTEM.value(), systemMessage.asText());
                    final List<ChatMessage> messages = new ArrayList<>();
                    messages.add(chatMessage);
                    messages.addAll(body.getMessage());
                    return builder.messages(messages);
                })
                .defaultIfEmpty(builder)
            )
            .flatMap(builder -> this.live2dSetting.getValue("openai", "model")
                .map(model -> builder.model(model.asText()))
                .thenReturn(builder.build())
            );


    }
}
