# Records the data a title screen works from, so the plugins can be checked offline:
# the TMDB card and its episodes, the parser's answer (the same queries the plugin sends)
# and the Shikimori franchise. Magnet links are not stored: releases get a short id instead.
#
#   python tests/record.py            — record every title in TITLES that has no file yet
#   python tests/record.py Bleach     — record (again) the titles whose name contains this text
import hashlib, json, os, re, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'corpus')
SITE = os.environ.get('TVT_SITE', os.path.join(os.environ.get('TEMP', ''), 'lampa-site'))

# Lampa's own public TMDB key (the one every Lampa client sends)
TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96'
JACRED = 'https://jac.red'
SHIKI = 'https://shikimori.io'
UA = 'TV Torrents plugin tests'

# name, TMDB id
TITLES = [
    ('Bleach', 30984), ('Cyberpunk Edgerunners', 105248), ('Death Note', 13916), ('One Piece', 37854),
    ('Naruto Shippuden', 31910), ('Jujutsu Kaisen', 95479), ('Attack on Titan', 1429), ('Demon Slayer', 85937),
    ('Dr. Stone', 86031), ('Frieren', 209867), ('Spy x Family', 120089), ('Mushoku Tensei', 94664),
    ('Vinland Saga', 88803), ('Oshi no Ko', 203737), ('Dandadan', 240411), ('Re Zero', 65942),
    ('One Punch Man', 63926), ('Kaiju No. 8', 207468), ('Blue Lock', 131041), ('Chainsaw Man', 114410),
    ('Solo Leveling', 127532), ('Apothecary Diaries', 220542), ('Gintama', 57041), ('My Hero Academia', 65930),
    ('Haikyuu', 60863), ('Mob Psycho 100', 67075), ('Tokyo Ghoul', 61374), ('Sword Art Online', 45782),
    ('Fullmetal Alchemist Brotherhood', 31911), ('Hunter x Hunter 2011', 46298), ('Black Clover', 73223),
    ('Overlord', 64196), ('Tulsa King', 153312), ('The Boys', 76479), ('Breaking Bad', 1396),
]


def get(url, data=None, headers=None, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=dict({'User-Agent': UA}, **(headers or {})))
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            if i == tries - 1:
                raise
            print('  retry', url[:80], e)
            time.sleep(5 * (i + 1))


def tmdb(path, lang='ru'):
    sep = '&' if '?' in path else '?'
    return get('https://api.themoviedb.org/3/%s%sapi_key=%s&language=%s' % (path, sep, TMDB_KEY, lang))


def slim_card(tv):
    keep = ['id', 'name', 'original_name', 'original_language', 'first_air_date', 'last_air_date', 'status',
            'in_production', 'number_of_seasons', 'number_of_episodes', 'backdrop_path']
    c = {k: tv.get(k) for k in keep}
    c['genres'] = [{'id': g['id'], 'name': g['name']} for g in tv.get('genres', [])]
    c['seasons'] = [{k: s.get(k) for k in ('season_number', 'episode_count', 'air_date', 'name', 'poster_path')} for s in tv.get('seasons', [])]
    if tv.get('next_episode_to_air'):
        c['next_episode_to_air'] = {'air_date': tv['next_episode_to_air'].get('air_date')}
    return c


def slim_episode(e):
    return {k: e.get(k) for k in ('episode_number', 'air_date', 'name', 'runtime')}


def slim_probe(streams):
    out = []
    for s in streams or []:
        t = s.get('tags') or {}
        x = {k: s[k] for k in ('codec_type', 'codec_name', 'width', 'channels', 'color_transfer', 'duration') if s.get(k) is not None}
        tags = {k: t[k] for k in ('title', 'language', 'DURATION') if t.get(k)}
        if tags:
            x['tags'] = tags
        out.append(x)
    return out


def release_id(el):
    m = re.search(r'btih:([0-9a-z]{32,40})', el.get('MagnetUri') or el.get('Link') or '', re.I)
    key = m.group(1).lower() if m else (el.get('Title', '') + '|' + str(el.get('Size')))
    return key, hashlib.sha1(key.encode()).hexdigest()[:10]


def slim_release(el):
    r = {k: el.get(k) for k in ('Title', 'Tracker', 'Size', 'Seeders', 'Peers', 'PublishDate')}
    info = el.get('info') or {}
    if info:
        r['info'] = {k: info[k] for k in ('quality', 'voices', 'seasons', 'videotype') if info.get(k)}
    if el.get('ffprobe'):
        r['ffprobe'] = slim_probe(el['ffprobe'])
    return r


# The same request Lampa's parser (and jackettSearch in the plugin) sends to JacRed
def jacred(movie, query):
    year = (movie.get('first_air_date') or '0000')[:4]
    q = {
        'apikey': '', 'Query': query, 'title': movie['name'], 'title_original': movie['original_name'],
        'year': year, 'is_serial': 2, 'genres': ','.join(g['name'] for g in movie.get('genres', [])), 'Category[]': 5000,
    }
    return get(JACRED + '/api/v2.0/indexers/all/results?' + urllib.parse.urlencode(q)).get('Results', [])


def releases(card):
    found = {}
    order = []

    def add(list_):
        for el in list_:
            key, rid = release_id(el)
            if key in found:
                continue
            found[key] = dict(slim_release(el), id=rid)
            order.append(key)

    add(jacred(card, card['original_name']))
    # seasonQueries: «Name N» for the last three aired seasons from the 2nd
    today = time.strftime('%Y-%m-%d')
    seasons = [s for s in card['seasons'] if s['season_number'] >= 2 and s.get('air_date') and s['air_date'] <= today][-3:]
    for s in seasons:
        n = s['season_number']
        m = dict(card, name='%s %d' % (card['name'], n), original_name='%s %d' % (card['original_name'], n), first_air_date=s['air_date'])
        time.sleep(1.5)
        try:
            add(jacred(m, m['original_name']))
        except Exception as e:
            print('  season query failed', n, e)
    return [found[k] for k in order]


def gql(query):
    time.sleep(0.6)
    data = json.dumps({'query': query}).encode()
    return get(SHIKI + '/api/graphql', data, {'Content-Type': 'application/json', 'Accept': 'application/json'})['data']


FIELDS = 'id name russian english japanese synonyms kind status episodes episodesAired franchise airedOn { date } releasedOn { date }'


def shikimori(tmdb_id):
    shard = os.path.join(SITE, 'anime-map', 't', '%02d.json' % (tmdb_id % 100))
    if not os.path.exists(shard):
        return None
    pairs = json.load(open(shard, encoding='utf-8')).get('t%d' % tmdb_id)
    if not pairs:
        return None
    ids = ','.join(str(p[0]) for p in pairs)
    mapped = gql('{ animes(ids: "%s", limit: 50, censored: false) { %s } }' % (ids, FIELDS))['animes']
    franchise = next((a['franchise'] for a in mapped if a.get('franchise')), None)
    entries = gql('{ animes(franchise: "%s", kind: "tv,ona", limit: 50, order: aired_on, censored: false) { %s } }' % (franchise, FIELDS))['animes'] if franchise else []
    return {'map': pairs, 'mapped': mapped, 'franchise': franchise, 'entries': entries}


def record(name, tmdb_id):
    tv = tmdb('tv/%d' % tmdb_id)
    card = slim_card(tv)
    seasons = {}
    for s in card['seasons']:
        if s['season_number'] > 0 and s['episode_count'] > 0:
            j = tmdb('tv/%d/season/%d' % (tmdb_id, s['season_number']))
            seasons[str(s['season_number'])] = [slim_episode(e) for e in j.get('episodes', [])]
    rel = releases(card)
    shiki = shikimori(tmdb_id) if tv.get('original_language') == 'ja' else None
    slug = re.sub(r'[^A-Za-z0-9]+', '_', name).strip('_')
    out = {'q': name, 'recorded': time.strftime('%Y-%m-%d'), 'card': card, 'seasons': seasons, 'rel': rel, 'shiki': shiki}
    json.dump(out, open(os.path.join(OUT, slug + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(name, tmdb_id, card['name'], [(s['season_number'], s['episode_count']) for s in card['seasons']], len(rel), 'releases',
          (shiki or {}).get('franchise'), len((shiki or {}).get('entries', [])), 'entries')


def main():
    os.makedirs(OUT, exist_ok=True)
    want = [a.lower() for a in sys.argv[1:]]
    for name, tid in TITLES:
        slug = re.sub(r'[^A-Za-z0-9]+', '_', name).strip('_')
        if want and not any(w in name.lower() for w in want):
            continue
        if not want and os.path.exists(os.path.join(OUT, slug + '.json')):
            continue
        try:
            record(name, tid)
        except Exception as e:
            print('FAILED', name, e)
        time.sleep(2)


if __name__ == '__main__':
    main()
