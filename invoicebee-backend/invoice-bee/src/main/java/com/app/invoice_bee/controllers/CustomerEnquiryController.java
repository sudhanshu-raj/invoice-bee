package com.app.invoice_bee.controllers;

import com.app.invoice_bee.dtos.CreateCustomerEnquiryRequest;
import com.app.invoice_bee.dtos.CustomerEnquiryDto;
import com.app.invoice_bee.dtos.LogFollowUpRequest;
import com.app.invoice_bee.dtos.UpdateCustomerEnquiryRequest;
import com.app.invoice_bee.entities.CustomerEnquiry;
import com.app.invoice_bee.entities.EnquiryStatus;
import com.app.invoice_bee.entities.Shop;
import com.app.invoice_bee.entities.User;
import com.app.invoice_bee.repositories.CustomerEnquiryRepository;
import com.app.invoice_bee.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer-enquiries")
public class CustomerEnquiryController {

    private final CustomerEnquiryRepository customerEnquiryRepository;
    private final UserRepository userRepository;

    public CustomerEnquiryController(
            CustomerEnquiryRepository customerEnquiryRepository,
            UserRepository userRepository
    ) {
        this.customerEnquiryRepository = customerEnquiryRepository;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private CustomerEnquiryDto mapToDto(CustomerEnquiry enquiry) {
        return new CustomerEnquiryDto(
                enquiry.getId(),
                enquiry.getShop().getId(),
                enquiry.getCustomerName(),
                enquiry.getPhone(),
                enquiry.getProductsInterested(),
                enquiry.getExpectedVisitDate(),
                enquiry.getStatus(),
                enquiry.getFollowUpCount(),
                enquiry.getNextFollowUpDate(),
                enquiry.getLastFollowedUpAt(),
                enquiry.getFollowUpNotes(),
                enquiry.getNotes(),
                enquiry.getCreatedAt(),
                enquiry.getUpdatedAt()
        );
    }

    @GetMapping
    public ResponseEntity<List<CustomerEnquiryDto>> getEnquiries(
            @RequestParam(required = false) EnquiryStatus status,
            @RequestParam(required = false) String timeBlock,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = getAuthenticatedUser(userDetails);
        Shop shop = user.getShop();
        if (shop == null) {
            return ResponseEntity.ok(List.of());
        }

        LocalDate today = LocalDate.now();
        List<CustomerEnquiry> enquiries;

        if ("due".equalsIgnoreCase(timeBlock)) {
            enquiries = customerEnquiryRepository.findDueFollowUps(
                    shop.getId(),
                    today,
                    List.of(EnquiryStatus.PENDING, EnquiryStatus.FOLLOWED_UP)
            );
        } else if ("upcoming".equalsIgnoreCase(timeBlock)) {
            enquiries = customerEnquiryRepository.findUpcomingFollowUps(
                    shop.getId(),
                    today,
                    List.of(EnquiryStatus.PENDING, EnquiryStatus.FOLLOWED_UP)
            );
        } else if ("no_followup".equalsIgnoreCase(timeBlock)) {
            enquiries = customerEnquiryRepository.findNoFollowUpYet(shop.getId(), EnquiryStatus.PENDING);
        } else if ("shopped".equalsIgnoreCase(timeBlock)) {
            enquiries = customerEnquiryRepository.findByShopIdAndStatusOrderByCreatedAtDesc(
                    shop.getId(),
                    EnquiryStatus.CONVERTED
            );
        } else if (status != null) {
            enquiries = customerEnquiryRepository.findByShopIdAndStatusOrderByCreatedAtDesc(shop.getId(), status);
        } else {
            enquiries = customerEnquiryRepository.findByShopIdOrderByCreatedAtDesc(shop.getId());
        }

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            enquiries = enquiries.stream()
                    .filter(e -> (e.getCustomerName() != null && e.getCustomerName().toLowerCase().contains(q))
                            || (e.getPhone() != null && e.getPhone().toLowerCase().contains(q))
                            || (e.getProductsInterested() != null && e.getProductsInterested().toLowerCase().contains(q))
                            || (e.getNotes() != null && e.getNotes().toLowerCase().contains(q)))
                    .toList();
        }

        List<CustomerEnquiryDto> result = enquiries.stream()
                .map(this::mapToDto)
                .toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<CustomerEnquiryDto> createEnquiry(
            @RequestBody CreateCustomerEnquiryRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = getAuthenticatedUser(userDetails);
        Shop shop = user.getShop();
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop profile required");
        }

        if (request.customerName() == null || request.customerName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer name is required");
        }
        if (request.phone() == null || request.phone().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is required");
        }

        OffsetDateTime now = OffsetDateTime.now();
        CustomerEnquiry enquiry = new CustomerEnquiry();
        enquiry.setShop(shop);
        enquiry.setCustomerName(request.customerName().trim());
        enquiry.setPhone(request.phone().trim());
        enquiry.setProductsInterested(request.productsInterested());
        enquiry.setExpectedVisitDate(request.expectedVisitDate());
        enquiry.setNextFollowUpDate(request.nextFollowUpDate());
        enquiry.setFollowUpCount(0);
        enquiry.setStatus(EnquiryStatus.PENDING);
        enquiry.setNotes(request.notes());
        enquiry.setCreatedAt(now);
        enquiry.setUpdatedAt(now);

        CustomerEnquiry saved = customerEnquiryRepository.save(enquiry);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToDto(saved));
    }

    @PostMapping("/{id}/log-follow-up")
    public ResponseEntity<CustomerEnquiryDto> logFollowUp(
            @PathVariable UUID id,
            @RequestBody LogFollowUpRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = getAuthenticatedUser(userDetails);
        Shop shop = user.getShop();
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop profile required");
        }

        CustomerEnquiry enquiry = customerEnquiryRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enquiry not found"));

        OffsetDateTime now = OffsetDateTime.now();
        int newCount = enquiry.getFollowUpCount() + 1;
        enquiry.setFollowUpCount(newCount);
        enquiry.setLastFollowedUpAt(now);

        if (request.nextFollowUpDate() != null) {
            enquiry.setNextFollowUpDate(request.nextFollowUpDate());
        }

        if (request.status() != null) {
            enquiry.setStatus(request.status());
        } else if (enquiry.getStatus() == EnquiryStatus.PENDING) {
            enquiry.setStatus(EnquiryStatus.FOLLOWED_UP);
        }

        if (request.callNote() != null && !request.callNote().isBlank()) {
            String dateLabel = now.format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm"));
            String entry = "[" + dateLabel + " - Follow-up #" + newCount + "]: " + request.callNote().trim();
            String existing = enquiry.getFollowUpNotes();
            if (existing != null && !existing.isBlank()) {
                enquiry.setFollowUpNotes(existing + "\n" + entry);
            } else {
                enquiry.setFollowUpNotes(entry);
            }
        }

        enquiry.setUpdatedAt(now);
        CustomerEnquiry saved = customerEnquiryRepository.save(enquiry);
        return ResponseEntity.ok(mapToDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerEnquiryDto> updateEnquiry(
            @PathVariable UUID id,
            @RequestBody UpdateCustomerEnquiryRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = getAuthenticatedUser(userDetails);
        Shop shop = user.getShop();
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop profile required");
        }

        CustomerEnquiry enquiry = customerEnquiryRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enquiry not found"));

        if (request.customerName() != null && !request.customerName().isBlank()) {
            enquiry.setCustomerName(request.customerName().trim());
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            enquiry.setPhone(request.phone().trim());
        }
        enquiry.setProductsInterested(request.productsInterested());
        enquiry.setExpectedVisitDate(request.expectedVisitDate());
        if (request.status() != null) {
            enquiry.setStatus(request.status());
        }
        if (request.followUpCount() != null) {
            enquiry.setFollowUpCount(request.followUpCount());
        }
        enquiry.setNextFollowUpDate(request.nextFollowUpDate());
        if (request.followUpNotes() != null) {
            enquiry.setFollowUpNotes(request.followUpNotes());
        }
        enquiry.setNotes(request.notes());
        enquiry.setUpdatedAt(OffsetDateTime.now());

        CustomerEnquiry updated = customerEnquiryRepository.save(enquiry);
        return ResponseEntity.ok(mapToDto(updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CustomerEnquiryDto> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = getAuthenticatedUser(userDetails);
        Shop shop = user.getShop();
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop profile required");
        }

        CustomerEnquiry enquiry = customerEnquiryRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enquiry not found"));

        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required");
        }

        try {
            EnquiryStatus newStatus = EnquiryStatus.valueOf(statusStr.trim().toUpperCase());
            enquiry.setStatus(newStatus);
            enquiry.setUpdatedAt(OffsetDateTime.now());
            CustomerEnquiry updated = customerEnquiryRepository.save(enquiry);
            return ResponseEntity.ok(mapToDto(updated));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status value: " + statusStr);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEnquiry(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = getAuthenticatedUser(userDetails);
        Shop shop = user.getShop();
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop profile required");
        }

        CustomerEnquiry enquiry = customerEnquiryRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enquiry not found"));

        customerEnquiryRepository.delete(enquiry);
        return ResponseEntity.noContent().build();
    }
}
