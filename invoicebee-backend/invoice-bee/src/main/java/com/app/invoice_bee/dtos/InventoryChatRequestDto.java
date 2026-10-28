package com.app.invoice_bee.dtos;

import java.util.List;

public record InventoryChatRequestDto(
        String message,
        List<ChatTurn> history
) {
    public record ChatTurn(
            String role,
            String text
    ) {}
}

