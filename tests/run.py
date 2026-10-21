# Checks the plugin on the recorded titles (tests/corpus) in headless Chrome and compares the
# result with tests/expect.json.
#
#   python tests/run.py            — show what differs from the expectations
#   python tests/run.py --update   — accept the current result as the new expectations
#   python tests/run.py Bleach     — show the result for the titles whose name contains this text
import functools, html, http.server, json, os, re, socketserver, subprocess, sys, tempfile, threading

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
EXPECT = os.path.join(HERE, 'expect.json')
CHROMES = [r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
           '/usr/bin/google-chrome', '/usr/bin/chromium']


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def run_chrome(url):
    chrome = next(c for c in CHROMES if os.path.exists(c))
    # Chrome refuses long profile paths on Windows
    profile = os.path.join(tempfile.gettempdir(), 'tvtc')
    out = subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                          '--user-data-dir=' + profile, '--virtual-time-budget=120000', '--dump-dom', url],
                         capture_output=True, timeout=300)
    dom = out.stdout.decode('utf-8', 'replace')
    m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    if not m:
        raise RuntimeError('no output from the harness:\n' + dom[:2000] + out.stderr.decode('utf-8', 'replace')[:2000])
    return json.loads(html.unescape(m.group(1)))


def show(name, s):
    if 'error' in s:
        return name + ': ERROR ' + s['error']
    parts = []
    for x in s['seasons']:
        t = '%d:%d' % (x['n'], x['episodes'])
        if x.get('tmdb'):
            t += '(tmdb %d)' % x['tmdb']
        if x.get('parts'):
            t += '[%s]' % x['parts']
        t += ' %dr' % x['releases']
        if x.get('missing'):
            t += ' нет ' + x['missing']
        parts.append(t)
    out = name + ': ' + ' | '.join(parts) + ('  (' + s['how'] + ')' if s.get('how') else '')
    for f in s.get('files') or []:
        out += '\n    файлы: ' + f
    for f in s.get('subs') or []:
        out += '\n    субтитры: ' + f
    if s.get('real'):
        out += '\n    настоящие файлы: %d раздач, расходится %d' % (s['real']['checked'], len(s['real']['bad']))
        for b in s['real']['bad'][:12]:
            out += '\n      ' + b
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    files = sorted(f for f in os.listdir(os.path.join(HERE, 'corpus')) if f.endswith('.json') and f != 'index.json')
    json.dump(files, open(os.path.join(HERE, 'corpus', 'index.json'), 'w'))
    httpd = serve()
    try:
        got = run_chrome('http://127.0.0.1:%d/tests/harness.html%s' % (httpd.server_address[1], '?debug' if '--debug' in sys.argv else ''))
    finally:
        httpd.shutdown()
    if 'error' in got and len(got) == 1:
        print('harness error:', got['error'])
        sys.exit(1)

    if args:
        for name in sorted(got):
            if any(a.lower() in name.lower() for a in args):
                print(show(name, got[name]))
                for x in got[name].get('seasons', []):
                    for t in x.get('dropped') or []:
                        print('    %d сезон %s, отсеяна: %s' % (x['n'], x.get('years'), t[:150]))
                    for t in x.get('foreign') or []:
                        print('    %d сезон, без названия сериала: %s' % (x['n'], t[:140]))
                    for t in x.get('unnamed') or []:
                        print('    %d сезон, без сезона в названии: %s' % (x['n'], t[:140]))
                    for t in x.get('outside') or []:
                        print('    %d сезон, вне сезона: %s' % (x['n'], t[:150]))
        return

    if '--update' in sys.argv:
        json.dump(got, open(EXPECT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
        print('expectations updated:', len(got), 'titles')
        return

    want = json.load(open(EXPECT, encoding='utf-8')) if os.path.exists(EXPECT) else {}
    diff = 0
    for name in sorted(set(got) | set(want)):
        if got.get(name) != want.get(name):
            diff += 1
            print('-', show(name, want[name]) if name in want else name + ': (нет в ожиданиях)')
            print('+', show(name, got[name]) if name in got else name + ': (нет в наборе)')
    print('%d of %d titles differ' % (diff, len(got)) if diff else 'all %d titles as expected' % len(got))
    sys.exit(1 if diff else 0)


if __name__ == '__main__':
    main()
