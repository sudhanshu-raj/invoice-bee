package com.app.invoice_bee.services;


import com.app.invoice_bee.entities.InvoiceData;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.content.Media;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

@Service
public class InvoiceParserService {

    private final ChatClient chatClient;

    public InvoiceParserService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public InvoiceData parseOcrTextToInvoice(String rawOcrText) {
        String imagePrompt = """
            You are an expert Indian GST invoice parser.
            You will be given printed tax invoice.
            Because of paper curvature during scanning, table columns for a single row may appear slightly out of order in the line sequence.
            
            Your job is to extract the invoice data from this and create the invoice object with it .
            And for each item extracted and give the confidence score of how sure you are that it would be correct.
            """;

        Resource resource = new FileSystemResource("src/main/resources/static/bill2.png");
        
        Media img = Media. builder()
                .mimeType(MimeTypeUtils.IMAGE_PNG)
                .name("bill2")
                .data(resource)
                .build();
        return chatClient.prompt()
                .system(imagePrompt)
//                .user("Extract structured invoice data from this OCR text:\n\n" + rawOcrText)
                .user(userSpec -> {
                    userSpec.text("Extract structured invoice data from this invoice");
                    userSpec.media(img);
                })
                .call()
                .entity(InvoiceData.class);
    }
}
