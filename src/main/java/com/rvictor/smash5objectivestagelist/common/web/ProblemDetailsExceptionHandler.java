package com.rvictor.smash5objectivestagelist.common.web;

import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Renders every error as an RFC 9457 {@code application/problem+json} response. Extends Spring's base
 * handler so framework exceptions (unsupported media type, bad path variable and so on) get the same
 * shape; this class only customizes the two cases where the default detail is not helpful enough.
 */
@RestControllerAdvice
class ProblemDetailsExceptionHandler extends ResponseEntityExceptionHandler {

    /** Adds an {@code errors} array of {@code {field, message}} objects to the 400 response. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<FieldViolation> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(ProblemDetailsExceptionHandler::toViolation)
                .toList();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, "Request validation failed");
        problem.setTitle("Invalid request");
        problem.setProperty("errors", errors);
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    /** Replaces the parser's internal message with a stable one. */
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                status, "Request body is missing or is not valid JSON for this endpoint");
        problem.setTitle("Malformed request");
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    private static FieldViolation toViolation(FieldError error) {
        return new FieldViolation(error.getField(), error.getDefaultMessage());
    }

    record FieldViolation(String field, String message) {}
}
