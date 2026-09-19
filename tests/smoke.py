from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from urllib.parse import unquote
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def test_domestic_proxy_smoke():
    source = (ROOT / 'index.html').read_text(encoding='utf-8')
    assert 'cors.eu.org' not in source

    server = ThreadingHTTPServer(('127.0.0.1', 0), lambda *args, **kwargs: QuietHandler(*args, directory=ROOT, **kwargs))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f'http://127.0.0.1:{server.server_port}'
    requested = []
    errors = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.add_init_script("localStorage.setItem('qk_remote_proxy', 'http://legacy-proxy.example')")
            page.on('pageerror', lambda error: errors.append(str(error)))

            def proxy_route(route):
                requested.append(route.request.url)
                route.fulfill(json={
                    'ok': True,
                    'data': {
                        'results': [{
                            'title': '三体 4K',
                            'first_url': '/api/wash?t=demo',
                            'links': [{'type': 'quark'}],
                        }],
                    },
                })

            def route_all(route):
                url = route.request.url
                if '/api/proxy?' in url or '.workers.dev/?url=' in url:
                    requested.append(url)
                    if url.startswith(base_url):
                        return route.fulfill(status=404, json={'ok': False, 'msg': 'local function absent'})
                    return proxy_route(route)
                if url.startswith(base_url):
                    return route.continue_()
                return route.fulfill(status=500, json={'ok': False, 'msg': 'expected test failure'})

            page.route('**/*', route_all)
            page.goto(base_url, wait_until='networkidle')
            page.locator('#searchInput').fill('三体')
            page.locator('#searchBtn').click()
            page.locator('.card').wait_for()
            assert requested and '/api/proxy?url=' in requested[0]
            assert not any(url.startswith('http://legacy-proxy.example') for url in requested)
            page.locator('.resolve-btn').click()
            page.locator('.link-result .lbl').wait_for()
            first_wash_count = sum('/api/wash' in unquote(url) for url in requested)
            page.locator('.resolve-btn').click()
            page.wait_for_timeout(2500)
            second_wash_count = sum('/api/wash' in unquote(url) for url in requested)
            assert second_wash_count > first_wash_count
            assert not errors
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    test_domestic_proxy_smoke()
