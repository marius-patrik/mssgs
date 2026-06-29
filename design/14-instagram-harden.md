# Design Doc: Harden Instagram Integration

## Issue
#33

## Goal
Keep Instagram as a supported backend while mitigating legal/policy risk.

## Changes
- Add a service-specific warning in the account setup wizard that Instagram is unofficial.
- Surface login/challenge errors through the bridge error channel instead of crashing.
- Isolate the Instagram backend so failures do not affect other services.
- Ensure `logout()` clears in-memory credentials.

## Future Work
- Implement challenge/2FA code flow if needed for public users.
