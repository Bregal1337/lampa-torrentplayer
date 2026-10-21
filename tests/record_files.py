# Real file lists for recorded titles: asks JacRed for the title's releases again (for their magnets),
# lets a local TorrServer fetch only the torrent metadata, saves the file names and drops the torrent.
# Magnet links are not stored. Needs TorrServer on http://127.0.0.1:8090 (or TVT_TS).
#
#   python tests/record_files.py Bleach            — releases with seeders, up to 80
#   python tests/record_files.py Gintama 120       — up to 120 releases
import json, os, re, sys, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import record

TS = os.environ.get('TVT_TS', 'http://127.0.0.1:8090')
OUT = os.path.join(record.HERE, 'files_real')


def ts(body, timeout=20):
    req = urllib.request.Request(TS + '/torrents', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        text = r.read().decode('utf-8', 'replace')
        return json.loads(text) if text.strip() else {}


def file_list(el, wait=75):
    t = ts({'action': 'add', 'link': el['MagnetUri'], 'title': el.get('Title', '')[:200], 'save_to_db': False})
    h = t.get('hash')
    if not h:
        return None
    try:
        end = time.time() + wait
        while time.time() < end:
            st = ts({'action': 'get', 'hash': h})
            if st.get('file_stats'):
                return [[f['path'], f.get('length', 0)] for f in st['file_stats']]
            time.sleep(2)
        return None
    finally:
        try:
            ts({'action': 'drop', 'hash': h})
        except Exception:
            pass


def main():
    name = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 80
    entry = next((t for t in record.TITLES if name.lower() in t[0].lower()), None)
    if not entry:
        sys.exit('no such title in record.TITLES')
    slug = re.sub(r'[^A-Za-z0-9]+', '_', entry[0]).strip('_')
    corpus = json.load(open(os.path.join(record.OUT, slug + '.json'), encoding='utf-8'))
    card = corpus['card']

    # The same queries as record.py; magnets are matched to the recorded releases by id
    found = {}
    for q in [card['original_name']]:
        for el in record.jacred(card, q):
            found[record.release_id(el)[1]] = el
    today = time.strftime('%Y-%m-%d')
    for s in [s for s in card['seasons'] if s['season_number'] >= 2 and s.get('air_date') and s['air_date'] <= today][-3:]:
        n = s['season_number']
        m = dict(card, name='%s %d' % (card['name'], n), original_name='%s %d' % (card['original_name'], n), first_air_date=s['air_date'])
        time.sleep(1.5)
        try:
            for el in record.jacred(m, m['original_name']):
                found.setdefault(record.release_id(el)[1], el)
        except Exception as e:
            print('  season query failed', n, e)

    wanted = [r for r in corpus['rel'] if r['id'] in found and found[r['id']].get('MagnetUri') and (r.get('Seeders') or 0) > 0]
    wanted.sort(key=lambda r: -(r.get('Seeders') or 0))
    wanted = wanted[:limit]

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, slug + '.json')
    saved = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    todo = [r for r in wanted if r['id'] not in saved]
    print(slug, len(corpus['rel']), 'releases,', len(wanted), 'with seeders and a magnet,', len(todo), 'to fetch')
    lock = threading.Lock()

    def one(r):
        try:
            files = file_list(found[r['id']])
        except Exception as e:
            files = None
            print('  error', r['Title'][:80], e)
        with lock:
            if files:
                saved[r['id']] = {'title': r['Title'], 'files': files}
                json.dump(saved, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            print('  %s %s' % ('%4d files' % len(files) if files else ' no metadata', r['Title'][:110]))

    with ThreadPoolExecutor(4) as pool:
        list(pool.map(one, todo))
    print('saved', len(saved), 'file lists to', path)


if __name__ == '__main__':
    main()
