package com.app.invoice_bee;

import com.app.invoice_bee.entities.InvoiceData;
import com.app.invoice_bee.services.InvoiceParserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootTest
@ActiveProfiles("test")
class InvoiceBeeApplicationTests {
	
	@Autowired
	InvoiceParserService parserService;

	@Test
	void contextLoads() {
	}
	
	@Test
	void shouldGetInvoiceObjectFromBill() throws IOException {
		String txt = Files.readString(Path.of("src/main/resources/static/sampleOCR_Output1.json"));

		InvoiceData invoice = parserService.parseOcrTextToInvoice(txt, true);

		System.out.println(invoice);
	}

}
