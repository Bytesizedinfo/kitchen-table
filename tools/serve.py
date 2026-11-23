"""Static server for local testing with correct MIME types (Windows can map .js to text/plain).
Usage: python -I tools/serve.py [port] [root]"""
import sys, http.server, functools, os
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8931
root = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=root)).serve_forever()
