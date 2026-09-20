---
title: Rejestracja i logowanie
description: Sprawdź pełny cykl rejestracji, weryfikacji e-maila i logowania.
category: test-scenarios
order: 1
---

# Scenariusz testowy: rejestracja i logowanie

Dziękujemy za pomoc w testowaniu OpenCiVera! Ten scenariusz sprawdza cały cykl
konta: rejestrację, weryfikację adresu e-mail, logowanie i wylogowanie. Zajmuje
około pięciu minut i wymaga dostępu do działającej skrzynki pocztowej.

## Co sprawdzisz

Platforma nie powinna udostępnić aplikacji przed potwierdzeniem adresu e-mail,
a pełny cykl logowania i wylogowania powinien działać wielokrotnie bez błędów.

## Kroki

1. Przejdź do `/login` i wybierz kartę **Sign up**.

   ![Strona główna z zaznaczonym przyciskiem Sign up](/docs/test-scenarios/signup-and-login/resources/01-homepage-signup-cta.png)
   ![Pusty formularz rejestracji](/docs/test-scenarios/signup-and-login/resources/02-signup-form-empty.png)

2. Wpisz e-mail i hasło, zaakceptuj zasady i wyślij formularz. Powinno pojawić
   się potwierdzenie utworzenia konta oraz wysłania wiadomości weryfikacyjnej.

   ![Uzupełniony formularz rejestracji](/docs/test-scenarios/signup-and-login/resources/03-signup-form-filled.png)
   ![Toast potwierdzający utworzenie konta](/docs/test-scenarios/signup-and-login/resources/04-creating-account-toast.png)

3. **Przed weryfikacją** spróbuj zalogować się tymi samymi danymi. Oczekiwany
   rezultat: dostęp zostaje odrzucony z informacją o oczekującej weryfikacji.
4. Otwórz skrzynkę i kliknij link weryfikacyjny. Powinien nastąpić powrót na
   stronę logowania z komunikatem o zakończeniu weryfikacji.

   ![Potwierdzenie rejestracji przez link e-mail](/docs/test-scenarios/signup-and-login/resources/05-confirm-signup-email.png)

5. Zaloguj się. Oczekiwany rezultat: przekierowanie do `/dashboard`.
6. Otwórz menu konta i kliknij **Wyloguj**. Oczekiwany rezultat: powrót do
   strony publicznej albo `/login`.

   ![Avatar otwierający menu konta](/docs/test-scenarios/signup-and-login/resources/06-account-menu-avatar.png)

7. Zaloguj się ponownie tymi samymi danymi. Oczekiwany rezultat: ponowne
   przekierowanie do `/dashboard`, bez błędów.

## Oczekiwany rezultat

Cały cykl kończy się bez błędów, a dostęp do Dashboard nie jest możliwy przed
potwierdzeniem adresu e-mail.

## Jeśli coś pójdzie nie tak

Zapisz numer kroku, oczekiwany i rzeczywisty rezultat oraz, jeśli to możliwe,
dołącz zrzut ekranu. Zgłoś problem przez kanał beta wskazany w zaproszeniu.
