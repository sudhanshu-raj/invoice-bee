package com.app.invoice_bee;

import com.app.invoice_bee.services.ImageResizeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

@SpringBootTest
@ActiveProfiles("test")
public class ImageResizer {
    
    @Autowired
    private ImageResizeService imageResizeService;
    
    @Test
    void testImageResizer() throws FileNotFoundException {
        File originalFile = new File("C:\\Users\\rajsu\\OneDrive\\Pictures\\IMG20261022233538.jpg");
        try(FileInputStream input = new FileInputStream(originalFile)) {
            MultipartFile multipartFile = new MockMultipartFile(
                    "file",
                    originalFile.getName(),
                    "image/jpeg",
                    input
            );
            
            byte[] resizedBytes = imageResizeService.resizeImage(multipartFile.getResource());
            Files.write(Paths.get("test_resized4.jpg"), resizedBytes);
            
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
