## 1. TIPS fallback parity

- [x] 1.1 Refactor full tips loading so missing or invalid configured `tipsPath` resources fall back to the bundled `live2d-tips.json` file before merge.
- [x] 1.2 Add regression coverage for the fallback chain so default full TIPS remain available when custom full TIPS loading fails.
