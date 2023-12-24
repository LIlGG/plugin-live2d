package run.halo.live2d.chat.client;

import com.theokanning.openai.completion.chat.ChatMessage;
import java.util.List;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import run.halo.live2d.chat.ChatResult;

public interface ChatClient {
    Flux<ServerSentEvent<ChatResult>> generate(List<ChatMessage> messages);

    Mono<Boolean> supports();
}
