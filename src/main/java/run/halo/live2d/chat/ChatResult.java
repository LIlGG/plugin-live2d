package run.halo.live2d.chat;

import lombok.Builder;
import lombok.Value;
import org.springframework.http.HttpStatus;

@Value
@Builder
public class ChatResult {
    final static String FINISH_TEXT = "[DONE]";

    String text;

    int status;

    public static ChatResult ok(String content) {
        return ChatResult.builder().text(content).status(HttpStatus.OK.value()).build();
    }

    public static ChatResult error(String content) {
        return ChatResult.builder().text(content).status(HttpStatus.INTERNAL_SERVER_ERROR.value()).build();
    }

    public static ChatResult finish() {
        return ChatResult.builder().text(FINISH_TEXT).status(HttpStatus.OK.value()).build();
    }

    @Override
    public String toString() {
        return "AiResult{" + "text='" + text + '\'' + ", status=" + status + '}';
    }
}
