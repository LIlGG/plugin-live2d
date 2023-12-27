package run.halo.live2d.chat;

import com.theokanning.openai.completion.chat.ChatMessage;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import run.halo.live2d.chat.client.ChatClient;
import run.halo.live2d.chat.client.DefaultChatClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class AIChatServiceImpl implements AiChatService {
    private final ApplicationContext applicationContext;

    public Flux<ServerSentEvent<ChatResult>> streamChatCompletion(List<ChatMessage> messages) {
        log.debug("Stream chat completion with messages: {}", messages);
        return Flux.fromIterable(this.applicationContext.getBeansOfType(ChatClient.class).values())
            .filterWhen(ChatClient::supports)
            .switchIfEmpty(Mono.just(new DefaultChatClient()))
            .concatMap(aiClient -> aiClient.generate(messages)
                .onErrorResume(throwable -> {
                    log.error("Error occurred while generating ai result", throwable);
                    if (throwable instanceof WebClientResponseException) {
                        return Mono.just(
                            ServerSentEvent.builder(
                                ChatResult.builder()
                                    .status(((WebClientResponseException) throwable).getStatusCode()
                                        .value())
                                    .text(((WebClientResponseException) throwable).getStatusText())
                                    .build()
                            ).build()
                        );
                    }
                    if (throwable instanceof WebClientRequestException) {
                        return Mono.just(
                            ServerSentEvent.builder(
                                ChatResult.error(throwable.getMessage())
                            ).build()
                        );
                    }
                    return Mono.error(throwable);
                })
                .switchIfEmpty(Flux.empty())
            );
    }
}
