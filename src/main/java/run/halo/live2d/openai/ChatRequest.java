package run.halo.live2d.openai;

import com.theokanning.openai.completion.chat.ChatMessage;
import java.util.List;
import lombok.Data;

/**
 * @author LIlGG
 */
@Data
public class ChatRequest {
    private List<ChatMessage> message;
}
