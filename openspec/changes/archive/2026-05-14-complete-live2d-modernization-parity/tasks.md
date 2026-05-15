## 1. Widget lifecycle parity

- [x] 1.1 Refactor `Live2dWidget` and related components so hide/show toggles visibility without unmounting the mounted runtime subtree during the same page session.
- [x] 1.2 Keep quit/toggle dismissal behavior compatible with the legacy 24-hour suppression flow while preventing duplicate initialization side effects on reopen.

## 2. Compatibility behavior restoration

- [x] 2.1 Add a readable console compatibility helper that restores the legacy `consoleShowStatu` metadata/status output through the normalized config flag.

## 3. Validation

- [x] 3.1 Add or update coverage for the restored parity behaviors at the spec-relevant frontend layer.
- [x] 3.2 Run the existing package build and relevant checks to confirm the modern runtime still works after the parity fixes.
