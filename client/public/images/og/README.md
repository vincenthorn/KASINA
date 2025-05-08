# Social Media Preview Images

This directory contains images optimized for social media sharing.

## Instructions for KASINA Developers

1. For best sharing results, we need both SVG and PNG formats:
   - `kasina-social-preview.svg` - Vector version for modern platforms
   - `kasina-social-preview.png` - Raster version for maximum compatibility

2. You can generate a new PNG version by:
   - Opening `/og-image-generator.html` in a browser
   - Clicking "Download as PNG"
   - Placing the downloaded file in this directory

3. The recommended dimensions for social sharing images are:
   - 1200 × 630 pixels (used by Facebook, Twitter, LinkedIn)
   - Aspect ratio of 1.91:1

4. Meta tags in `index.html` have been updated to reference these images.

## Troubleshooting

If social media platforms aren't displaying the preview properly:

1. Check that the URLs in the meta tags are correct and publicly accessible
2. Test your Open Graph implementation with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
3. Twitter cards can be validated with the [Twitter Card Validator](https://cards-dev.twitter.com/validator)
4. Ensure cache is cleared when testing updates to social images