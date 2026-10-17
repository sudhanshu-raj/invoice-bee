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
        String systemPrompt = """
            You are an expert Indian GST invoice parser.
            You will be given raw OCR text extracted from a printed tax invoice.
            Because of paper curvature during scanning, table columns for a single row may appear slightly out of order in the line sequence.
            
            Rules:
            1. Reconstruct each product line item accurately by matching Quantity * Price/Unit + GST = Amount.
            2. Multi-line product names (e.g., ending with 'BTY', 'PRO', or model codes in parentheses like '(48TT200)') must be merged into a single clean itemName string.
            3. Validate Indian GSTIN format (2 digits, 5 letters, 4 digits, 1 letter, 1 char, 'Z', 1 alphanumeric). Fix obvious OCR typos like 'S' instead of '5' in the numeric PAN section, or '2' instead of 'Z' at position 14.
            4. Strip currency symbols and commas from numeric fields.
            """;

        String imagePrompt = """
            You are an expert Indian GST invoice parser.
            You will be given printed tax invoice.
            Because of paper curvature during scanning, table columns for a single row may appear slightly out of order in the line sequence.
            
            Your job is to extract the invoice data from this and create the invoice object with it. 
            """;

        Resource resource = new FileSystemResource("src/main/resources/static/bill2.png");
        
        String prompt2 = """
                            Extract invoice information from the supplied OCR text.
                            Map the information to the InvoiceData Java type.
                            Do not invent values. Use null for unknown reference fields.
                            Preserve all line items and assign monetary values correctly.
                """;
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
