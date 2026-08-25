"""
2D Frame Calculator Local Web Server
Hosts the application and opens the default web browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8001

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable caching headers for local assets
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    
    # Try PORT, if busy try next ports
    global PORT
    for p in range(PORT, PORT + 10):
        try:
            httpd = socketserver.TCPServer(("", p), Handler)
            PORT = p
            break
        except OSError:
            continue
    else:
        print("Error: Could not bind to any available port.")
        sys.exit(1)
        
    url = f"http://localhost:{PORT}"
    print("=" * 60)
    print("  2D Frame Calculator Web App")
    print(f"  Running locally at: {url}")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 60)
    
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Note: Could not automatically open browser: {e}")
        
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Frame Calculator server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
