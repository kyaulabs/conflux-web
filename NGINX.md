# Deploy CONFLUX with nginx

Serve the static site at `https://conflux.kyaulabs.com` from `/nginx/git/conflux-web`. The browser reads the public GitHub API directly; nginx needs no credentials, API proxy, Node.js service, or database.

## Clone and update

Run Git as the deployment account, not the nginx worker. The site includes its built JavaScript and CSS, so a checkout of `main` is ready to serve without npm:

```sh
git clone --branch main https://github.com/kyaulabs/conflux-web.git /nginx/git/conflux-web
```

To update, run `git -C /nginx/git/conflux-web pull --ff-only`. An in-place update can briefly mix asset versions; use a maintenance window if that matters. If you edit the site yourself, use Node.js 24 or newer and run `npm ci --include=dev && npm run build` to regenerate the bundles before serving them. `npm start` is a local preview, not the production server.

Give the nginx worker traversal access to the parent directories and read access to the listed public files. Keep the checkout writable only by the deployment account. Do not grant broad access to `.git`, `.pi`, or `node_modules` to fix permissions.

## Add the virtual host

Point the DNS `A` record (and `AAAA` only if IPv6 is configured) for `conflux.kyaulabs.com` at your web server or TLS proxy. Add this block to an nginx configuration file included by the `http` context. Adjust the root and MIME include path for your system. Do not add a generic static fallback, PHP handler, or source-file alias to this virtual host.

```nginx
server {
    listen 80;
    server_name conflux.kyaulabs.com;
    root /nginx/git/conflux-web;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    autoindex off;
    disable_symlinks on from=$document_root;

    add_header X-Content-Type-Options nosniff always;
    add_header Cache-Control no-cache always;

    location = / {
        try_files /index.html =404;
    }

    location ~ ^/(?:index\.html|styles\.min\.css|(?:app|signal)\.min\.js|vendor/(?:d3\.min\.js|fontawesome-icons\.svg)|brand/tokens/brand\.css)$ {
        try_files $uri =404;
    }

    location ~ ^/brand/assets/(?:favicons/(?:favicon\.svg|apple-touch-icon\.png)|logos/conflux-(?:horizontal|stacked|wordmark)-dark\.svg|social/conflux-open-graph-dark\.png|ui-icons/sprite\.svg)$ {
        try_files $uri =404;
    }

    location ~ ^/brand/assets/fonts/(?:Barlow-(?:Regular|Medium|SemiBold)|BarlowCondensed-SemiBold|JetBrainsMono-Regular)\.ttf$ {
        types { font/ttf ttf; }
        try_files $uri =404;
    }

    location / {
        return 404;
    }
}
```

The allowlist exposes only the page, browser bundles, public palette CSS, and named assets. All other paths return `404`, including dotfiles, Git internals, unminified application source, documentation, package manifests, dependencies, and test files. Missing assets also return `404`. Keep `no-cache` for these unversioned URLs so browsers revalidate them after a deploy. When adding a new browser asset, update the allowlist explicitly.

## Enable HTTPS

If a trusted reverse proxy handles TLS, keep the static block on a private listener and point the proxy at it. Do not add an internal HTTPS redirect that loops back through the proxy. If nginx handles TLS, replace `listen 80;` in the static block with `listen 443 ssl;` and set `ssl_certificate` and `ssl_certificate_key` to your provisioned full chain and key. Use your existing certificate issuance and renewal setup. Add a separate redirect block after the certificate is ready:

```nginx
server {
    listen 80;
    server_name conflux.kyaulabs.com;
    return 308 https://conflux.kyaulabs.com$request_uri;
}
```

HTTPS also enables the source-command copy button. If you deploy to a different public hostname, update the Open Graph URLs in `index.html`.

## Validate

Run `sudo nginx -t` before reloading nginx (for example, `sudo systemctl reload nginx` on systemd). Then check the public endpoint:

```sh
site=https://conflux.kyaulabs.com
for path in / /app.min.js /signal.min.js /styles.min.css /brand/tokens/brand.css \
    /brand/assets/logos/conflux-stacked-dark.svg /brand/assets/ui-icons/sprite.svg \
    /brand/assets/fonts/Barlow-Regular.ttf /brand/assets/social/conflux-open-graph-dark.png; do
    curl -sSI "$site$path" | head -n 1 # Expect 200.
done
for path in /.git/HEAD /.env /.pi/settings.json /app.js /signal.js /styles.scss \
    /package.json /package-lock.json /node_modules/ /tests/server.mjs /NGINX.md \
    /brand/assets/fonts/Barlow-OFL.txt /not-a-route; do
    curl -sSI "$site$path" | head -n 1 # Expect 404.
done
```

Check that the stylesheets, scripts, SVGs, and fonts have the correct `Content-Type` under `nosniff`. Open the HTTPS site and check the waveform, clone-command copy button, and Kanban tab. GitHub rate limits can make telemetry temporarily unavailable; local asset errors are a deployment problem.
