package run.halo.live2d.chat.client;

import com.theokanning.openai.completion.chat.ChatMessage;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import run.halo.live2d.chat.ChatResult;

public class DefaultChatClient implements ChatClient {
    public DefaultChatClient() {
        System.out.println("DefaultChatClient");
    }
    @Override
    public Flux<ServerSentEvent<ChatResult>> generate(List<ChatMessage> messages) {
        return Flux.just(
            ServerSentEvent.builder(
                    ChatResult.builder()
                        .status(HttpStatus.NOT_FOUND.value())
                        .text("没有激活的 AI Client，请联系站长")
                        .build()
                )
                .build()
        );
    }

    @Override
    public Mono<Boolean> supports() {
        return Mono.just(true);
    }
}
