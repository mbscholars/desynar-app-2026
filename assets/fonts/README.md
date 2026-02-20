# Fonts

## Metropolis (brand font)

Design spec uses **Metropolis** as the primary sans font. To enable it:

1. Add these files to this folder (obtain from your design team or web project):
   - `Metropolis-Regular.ttf`
   - `Metropolis-Medium.ttf`
   - `Metropolis-SemiBold.ttf`
   - `Metropolis-Bold.ttf`

2. In `app/_layout.tsx`, update the `useFonts` call to load Metropolis instead of the fallback:

```ts
useFonts({
  Metropolis: require('../assets/fonts/Metropolis-Regular.ttf'),
  MetropolisMedium: require('../assets/fonts/Metropolis-Medium.ttf'),
  MetropolisSemiBold: require('../assets/fonts/Metropolis-SemiBold.ttf'),
  MetropolisBold: require('../assets/fonts/Metropolis-Bold.ttf'),
  ...FontAwesome.font,
});
```

3. Use the font in styles: `fontFamily: 'Metropolis'` (see `constants/theme.ts`).

Until Metropolis is added, the app uses **SpaceMono** as a fallback so the project runs without missing font errors.
