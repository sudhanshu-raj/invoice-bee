package com.app.invoice_bee.services;

import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import net.coobird.thumbnailator.Thumbnails;

@Service
public class ImageResizeService {

    public byte[] resizeImage(Resource file) throws IOException {
        try (InputStream inputStream = file.getInputStream();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            Thumbnails.of(inputStream)
                    .size(1200, 1200)
                    .outputFormat("jpg")
                    .outputQuality(0.9f)
                    .toOutputStream(outputStream);

            return outputStream.toByteArray();
        }
    }
}
