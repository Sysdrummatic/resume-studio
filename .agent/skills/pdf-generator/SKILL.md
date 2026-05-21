---
name: pdf-generator
description: Odpowiada za implementację i stylizację eksportu CV do formatu PDF przy użyciu @react-pdf/renderer. Użyj tego skilla, gdy trzeba dodać przyciski pobierania lub edytować szablon PDF.
---

## Procedura implementacji:
1. Zainstaluj `@react-pdf/renderer` oraz `lucide-react` (do ikon).
2. Wykorzystaj dane z pliku YAML projektu jako źródło danych dla komponentu PDF.
3. Szablon PDF musi być odseparowany od komponentów webowych (React-PDF ma własne tagi: <Document>, <Page>, <View>, <Text>).
4. Stylizacja musi odbywać się przez StyleSheet.create() z @react-pdf/renderer.

## Zasady estetyki:
- Zachowaj spacing i hierarchię typograficzną z widoku webowego.
- Upewnij się, że tekst jest wektorowy (możliwy do zaznaczenia).
- Przyciski UI obok "Public" powinny być spójne z obecnym designem (zaokrąglone rogi, subtelny hover).
