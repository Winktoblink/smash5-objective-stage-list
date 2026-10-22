package com.rvictor.smash5objectivestagelist.stage;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/** Thrown when no stage exists for a requested id. Rendered as a 404 problem detail. */
public class StageNotFoundException extends ErrorResponseException {

    public StageNotFoundException(int id) {
        super(
                HttpStatus.NOT_FOUND,
                ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "No stage with id " + id),
                null);
    }
}
