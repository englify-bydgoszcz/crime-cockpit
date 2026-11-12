# Crime Cockpit 9.4 — karty postaci i moduły danych w Apps Script

**Stan:** dane postaci „Gołoborza” do strony 9 są już zapisane w kanonicznym
arkuszu. Frontend 9.4 potrafi je bezpiecznie wyświetlać, ale wymaga
opublikowanego modułu `bookCast` w aktualnym Apps Script.

## Dlaczego ekran wcześniej był pusty

Dwa odrębne błędy:
1. Book Cast miał `PUBLIC SAFE` (np. Cebrzynowie/Kończakowie), ale poprzedni
   frontend niesłusznie żądał numeru strony także od jawnego katalogu.
2. Historyczny `moduleSpecs_()` opublikowanego Apps Script nie miał
   `bookCast`, `characterRelations` ani `caseFileAssets`.
   API `scope=modules` zwracało więc tylko znany moduł-sentinel
   `tasteFrontier`, a UI utożsamiało brak modułu z brakiem postaci.

## Poprawka w istniejącym Apps Script

Otwórz Google Sheets „Ranking kryminałów” → **Rozszerzenia → Apps Script**,
przejdź do **obecnego** `Code.gs`, znajdź `function moduleSpecs_()`
i dodaj **wyłącznie brakujące** wpisy do istniejącego obiektu `return { ... }`.

```javascript
// Postacie + graf + portrety (wymagane przez ekran „Postacie”)
bookCast: ['Book Cast', 5, false],
characterRelations: ['Character Relations', 5, false],
caseFileAssets: ['Case File Assets', 5, false],
checkpointSnapshots: ['Checkpoint Snapshots', 5, false],

// Wydania polskie i Translation Studio (wymagane przez „Wydania PL”)
editionRegistry: ['Edition Registry', 5, false],
ebookVault: ['Ebook Vault', 5, false],
polishEditionPipeline: ['Polish Edition Pipeline', 6, false],
translationStateReconciler: ['Translation State Reconciler', 6, false],
translationGateway: ['Translation Gateway', 6, false],
```

`readingRoom: ['Reading Room',4,false]` powinno już być
we wdrożonej wersji z poprzedniej naprawy. **Nie duplikuj** wpisów,
które istnieją w bieżącym `moduleSpecs_()`. Nie zastępuj całej funkcji.
Wszystkie numery w nawiasach to rzeczywiste wiersze nagłówków, nie
przypadkowe indeksy.

Zapisz. **Deploy → Manage deployments → Edit (ołówek) → New version → Deploy**.
Nie twórz drugiego wdrożenia, nie zmieniaj tokenu, adresu `/exec` ani
konfiguracji uprawnień. Otwórz stronę Lite 9.4, odśwież dane.

## Checkpoint: Gołoborze p9 (weryfikacja)

Source of truth: polski EPUB owner Vault `EV-0006` /
`ED-PL-0114A`, RR-0046 = **9 strona**, źródło
`EVID-0013`, `CPS-0002`.

Źródłowy NCX: p9 `OEBPS/Section0002_0001.xhtml#kps_page_9`,
hard stop **przed p10**
`OEBPS/Section0003.xhtml#kps_page_10`.
Zbadano wyłącznie bezpieczny prefiks; nie przeglądano fabuły dalej.

Znane już do p9:
- `CHR-0110` Andrzej Kończak — p2
- `CHR-0111` Tomasz Kończak — p6
- `CHR-0112` Cebrzyna — p7, bez podanego imienia
- `CHR-0113` Pężyrka — p8
- `CHR-0114` wąsaty wachmistrz — p5, postać bez imienia

Katalogowe jawne grupy `CHR-0009` Cebrzynowie i `CHR-0038` Kończakowie
mają status `PUBLIC SAFE`, więc mogą być widoczne także bez numeru strony.
Łącznie 7 bezpiecznych wpisów, 1 relacja jawna do p9.
Żaden wpis nie ma informacji z późniejszego tekstu; nie ma
wcześniej nieujawnionych portretów.

## Kontrola poprawności

1. W „Postacie” domyślnie widać aktywną lekturę Gołoborze, a nie stare Somerset.
2. Widać przynajmniej 7 bezpiecznych wpisów do p9.
3. Żadna karta z gate `CURRENT PROGRESS · p10` ani
   `POST-READ SAFE` nie może się wyświetlić dla Gołoborza p9.
4. Przy braku modułu pojawia się informacja o integracji, **nie** „brak postaci”.
5. Linki wydań i Translation Studio nadal używają tokenowego API, nie
   publicznego statycznego JSON-a.

**Bezpieczeństwo:** nie wrzucać owner EPUB, jego tekstu, notatek,
portretów ani tokenu do publicznego GitHub Pages. Do arkusza trafiły
wyłącznie znormalizowane metadane, jawne do checkpointu opisy
i identyfikatory dowodów.
