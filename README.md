Color Analyzing Web App built with React + Vite

ABOUT:
Takes an inputted image (by URL or upload) and determines the most dominant colors.
Ignores non-vibrant colors like black, white, and grey in favor of more vibrant colors that the user likely cares about more.
Selects 1-8 colors, depending on how many dominant vibrant colors there are in the image. 

FEATURES:
- The vibrancy slider offeres some control on how vibrant of colors the app should output.
The higher the vibrancy threshhoold, the more vibrant the color must be for the code to choose it. 
As you go higher, there may be no colors that fit the vibrancy threshold criteria. The app defaults to a threshold of 20%.

- Features dark and light modes, for an easy viewing experience.

PRACTICAL USE CASE:
I used this for a webpage that is themed based on the company logo used in the page.
The code selects 1-2 colors and made them the theme colors of the page.
