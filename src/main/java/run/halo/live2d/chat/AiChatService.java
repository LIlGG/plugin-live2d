package run.halo.live2d.chat;

import java.util.List;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;
import run.halo.aifoundation.message.ModelMessage;

public interface AiChatService {

    Flux<ServerSentEvent<ChatResult>> streamChatCompletion(String modelName,
        List<ModelMessage> messages);
}
