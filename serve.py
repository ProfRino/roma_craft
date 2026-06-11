"""Dev server for ROMACRAFT: http.server with caching disabled,
always serving this file's own directory regardless of CWD."""
import http.server
import os

PORT = 8744
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), NoCacheHandler) as httpd:
        print(f'ROMACRAFT dev server on http://localhost:{PORT} (cache disabled)')
        httpd.serve_forever()
