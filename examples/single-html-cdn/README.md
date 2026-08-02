# single-html-cdn

This is a top-level host page for the public `phaser4-facade` repository. It
does not create an iframe and it uses a plain script loader, so it can be
opened directly from a static host. The loader first tries downloaded/local
build pairs, then the npm CDN, and finally the Git-backed jsDelivr URL:

```html
<script src="https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/gm-phaser4.global.min.js"></script>
```

jsDelivr supplies an executable JavaScript MIME type while reading the public
Git repository. Raw GitHub and Gist URLs remain source/download links rather
than browser CDN endpoints.

For a released application, pin a published npm version instead of `@main`:

```html
<script src="https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4.global.min.js"></script>
```
