#!/usr/bin/env python3
"""Serve the built book at http://127.0.0.1:PORT/rust-game-hacking-book/ (default port 8766).

usage (from site/):  npm run build && python3 scripts/serve-dist.py 8766
The built pages expect the /rust-game-hacking-book base path, so this strips it and serves dist/.
Caching is off so a rebuild shows at once.
"""
import functools, http.server, os, sys

BASE = '/rust-game-hacking-book'
DIST = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist'))


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split('?')[0].split('#')[0]
        if p == BASE:
            p = BASE + '/'
        if p.startswith(BASE + '/'):
            p = p[len(BASE):]
        return super().translate_path(p)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Handler, directory=DIST)).serve_forever()
