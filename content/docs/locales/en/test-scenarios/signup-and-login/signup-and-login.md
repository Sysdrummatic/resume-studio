---
title: Sign-up and sign-in
description: Verify the full registration, email verification, and sign-in cycle.
category: test-scenarios
order: 1
---

# Test scenario: Sign-up and sign-in

Thanks for helping test OpenCiVera! This scenario checks the complete account
lifecycle: registration, email verification, signing in, and signing out. It
takes about five minutes and needs a working email address you can access.

## What you will verify

The platform must not grant access before your email is verified, and the full
sign-in/sign-out cycle must work repeatedly without errors.

## Steps

1. Go to `/login` and switch to the **Sign up** tab.

   ![Homepage with the Sign up button highlighted](/docs/test-scenarios/signup-and-login/resources/01-homepage-signup-cta.png)
   ![Empty sign-up form](/docs/test-scenarios/signup-and-login/resources/02-signup-form-empty.png)

2. Enter your email address and a password, accept the policies, and submit.
   You should see a confirmation that the account was created and that a
   verification email is on its way.

   ![Sign-up form filled in, ready to submit](/docs/test-scenarios/signup-and-login/resources/03-signup-form-filled.png)
   ![Creating account confirmation toast](/docs/test-scenarios/signup-and-login/resources/04-creating-account-toast.png)

3. **Before verifying**, try to sign in with the same credentials. Expected:
   access is refused with a message about pending email verification.
4. Open your inbox and click the verification link. Expected: you land back on
   the sign-in page with a "verification completed" message.

   ![Confirm your signup email with the verification link](/docs/test-scenarios/signup-and-login/resources/05-confirm-signup-email.png)

5. Sign in with your credentials. Expected: you are redirected to `/dashboard`.
6. Open the account menu (avatar, top-right corner) and click **Log out**.
   Expected: you are returned to the public page or `/login`.

   ![Account menu avatar in the top-right corner of the nav bar](/docs/test-scenarios/signup-and-login/resources/06-account-menu-avatar.png)

7. Sign in again with the same credentials. Expected: you are redirected to
   `/dashboard` again, with no errors.

## Expected result

The whole cycle completes without errors, and at no point do you get access to
the dashboard before completing email verification.

## If something goes wrong

Note the step number, what you expected, and what actually happened (a
screenshot helps a lot), and report it through the beta feedback channel you
received with your invitation.
