Add this to your HTML <head>:

    <link rel="icon" href="/favicon/favicon.ico" sizes="any">
    <link rel="apple-touch-icon" href="/appicon/web/apple-touch-icon.png">

Add this to your app's manifest.json:

    ...
    {
      "icons": [
        { "src": "/appicon/web/icon-192.png", "type": "image/png", "sizes": "192x192" },
        { "src": "/appicon/web/icon-512.png", "type": "image/png", "sizes": "512x512" },
        { "src": "/appicon/web/icon-192-maskable.png", "type": "image/png", "sizes": "192x192", "purpose": "maskable" },
        { "src": "/appicon/web/icon-512-maskable.png", "type": "image/png", "sizes": "512x512", "purpose": "maskable" }
      ]
    }
    ...
