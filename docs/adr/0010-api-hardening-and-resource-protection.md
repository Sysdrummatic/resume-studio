# ADR 0010: API Hardening and Resource Protection

## Status
Accepted

## Context
As part of the design system modernization, new PDF export endpoints were introduced. A security audit identified that the `preview` endpoint was completely unprotected and both endpoints lacked resource protection against automated scraping or Denial of Service (DoS) attacks.

## Decisions

1. **Mandatory Authentication for Previews**
   - The `app/api/resume/export/pdf/preview` endpoint now requires a valid user session.
   - We use `requireRequestActor()` to verify the JWT and ensure the user is active.
   - This prevents the server from being used as a free, unauthenticated PDF rendering service.

2. **Server-Side Rate Limiting**
   - Implemented a `rateLimit` utility in `app/lib/rate-limit.ts`.
   - **Previews**: Limited to 10 requests per minute per authenticated user ID.
   - **Public Exports**: Limited to 5 requests per minute per IP address.
   - Reason: PDF rendering is resource-intensive; these limits protect the server's CPU and memory from exhaustion.

3. **In-Memory to Distributed Transition**
   - Current implementation is in-memory for immediate protection.
   - In production (serverless), this state will be volatile. If scaling requires persistent limits across function invocations, we will migrate to a Redis-backed store (e.g., Upstash).

## Consequences
- **Positive**: Hardened security posture, protected server resources, prevention of mass-scraping of public CVs.
- **Negative**: Slight overhead in API response time due to auth and limit checks; users may occasionally hit limits during intensive editing.
