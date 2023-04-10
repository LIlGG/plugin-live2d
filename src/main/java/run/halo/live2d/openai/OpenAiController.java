package run.halo.live2d.openai;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.context.ApplicationContext;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import run.halo.app.plugin.ApiVersion;

/**
 * @author LIlGG
 */
@ApiVersion("v1alpha1")
@RestController
@RequestMapping("/openai")
public class OpenAiController {
    
    private final ApplicationContext applicationContext;
    
    public OpenAiController(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }
    
    @ApiResponse(responseCode = "200", description = "successfully.", content = {
        @Content(mediaType = "application/json", schema = @Schema(implementation = JsonNode.class))
    })
    @Operation(operationId = "ImportMigrationData", description = "Import migration data file.")
    @PostMapping(value = "/chat-process")
    void chatProcess(@RequestBody ChatRequest body) {
    }
}
