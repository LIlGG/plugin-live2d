package run.halo.live2d.chat;

import com.theokanning.openai.completion.chat.ChatMessage;
import java.util.List;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

@FunctionalInterface
public interface AiChatService {

    Flux<ServerSentEvent<ChatResult>> streamChatCompletion(List<ChatMessage> messages);
}
