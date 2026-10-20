(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Аниме для Lampa: раздел в меню с подборками Shikimori (сезоны, жанры, популярное,
  // свои списки), оценка Shikimori на карточках и синхронизация списка Shikimori:
  // статусы из меню карточки и просмотренные серии из плагина «Торренты TV» (tv.js).
  // Карточки открываются обычной карточкой TMDB, поэтому кнопка «Торренты» работает как всегда.
  // ---------------------------------------------------------------------------

  var VERSION = '1.3.2';
  var HOSTS = ['https://shikimori.io', 'https://shikimori.rip'];
  var REDIRECT = 'urn:ietf:wg:oauth:2.0:oob';
  var PAGE = 20;
  var ANIME_FIELDS = 'id name russian english japanese kind status episodes episodesAired score franchise airedOn { date } poster { mainUrl } genres { id russian kind }';
  var STATUS_NAMES = { planned: 'Запланировано', watching: 'Смотрю', rewatching: 'Пересматриваю', completed: 'Просмотрено', on_hold: 'Отложено', dropped: 'Брошено' };
  var SEASON_NAMES = { winter: 'Зима', spring: 'Весна', summer: 'Лето', fall: 'Осень' };
  var SEASON_ORDER = ['winter', 'spring', 'summer', 'fall'];
  var KIND_NAMES = { tv: 'Сериалы', movie: 'Фильмы', ova: 'OVA', ona: 'ONA', special: 'Спешлы' };
  var ORDER_NAMES = { popularity: 'По популярности', ranked: 'По оценке', aired_on: 'По дате выхода' };
  var STATE_NAMES = { ongoing: 'Онгоинги', anons: 'Анонсы', released: 'Вышедшие' };

  function field(name, def) {
    var v = Lampa.Storage.get(name, def);

    return v === undefined || v === null || v === 'undefined' ? def : v;
  }

  function readJson(name) {
    var v = Lampa.Storage.get(name, '{}');

    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch (e) { v = {}; }
    }

    return v && typeof v === 'object' ? v : {};
  }

  function appName() {
    return (field('tva_app_name', '') + '').trim() || 'Lampa Anime';
  }

  // ---------------------------------------------------------------------------
  // Запросы к Shikimori. Правила API: название приложения в User-Agent, не больше 5 запросов
  // в секунду. На Android запрос идёт через приложение Lampa — там User-Agent можно задать;
  // в браузере его менять нельзя, поэтому обычный запрос (Shikimori разрешает CORS).
  // ---------------------------------------------------------------------------

  var queue = [];
  var queue_busy = false;
  var host_index = 0;
  var cache = {};

  function nativeOk(method) {
    return (method === 'GET' || method === 'POST') && Lampa.Platform.is('android') && window.AndroidJS && typeof AndroidJS.httpReq === 'function';
  }

  function rawRequest(o, ok, fail) {
    var headers = { 'Accept': 'application/json', 'User-Agent': appName() };

    if (o.type) headers['Content-Type'] = o.type;
    if (o.token) headers['Authorization'] = 'Bearer ' + o.token;

    var url = HOSTS[host_index] + o.path;

    if (nativeOk(o.method)) {
      var net = new Lampa.Reguest();

      net.timeout(20000);
      net['native'](url, function (json) {
        if (typeof json === 'string') {
          try { json = JSON.parse(json); } catch (e) {}
        }

        ok(json);
      }, function (err) {
        fail(err && err.status || 0, err && (err.responseText || err.message) || '');
      }, o.method === 'POST' ? (o.body || '') : false, { headers: headers, dataType: 'json' });

      return;
    }

    var xhr = new XMLHttpRequest();

    xhr.open(o.method, url, true);
    xhr.timeout = 20000;

    for (var h in headers) {
      if (h !== 'User-Agent') xhr.setRequestHeader(h, headers[h]);
    }

    xhr.onload = function () {
      var json = null;

      try { json = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch (e) {}

      if (xhr.status >= 200 && xhr.status < 300) ok(json);
      else fail(xhr.status, xhr.responseText || '');
    };
    xhr.onerror = xhr.ontimeout = function () { fail(0, 'нет связи'); };
    xhr.send(o.body || null);
  }

  // Очередь: между запросами не меньше 250 мс. Сайт недоступен — пробуем зеркало.
  // То, чего ждёт человек (открыть карточку, статус), идёт вперёд строк главной
  function shiki(o, ok, fail) {
    var job = { o: o, ok: ok, fail: fail || function () {} };

    if (o.priority) {
      var i = 0;

      while (i < queue.length && queue[i].o.priority) i++;

      queue.splice(i, 0, job);
    } else queue.push(job);

    pump();
  }

  function pump() {
    if (queue_busy || !queue.length) return;

    queue_busy = true;

    var job = queue.shift();
    var tried = 0;
    var release = function () {
      setTimeout(function () {
        queue_busy = false;
        pump();
      }, 250);
    };

    var attempt = function () {
      rawRequest(job.o, function (json) {
        release();
        job.ok(json);
      }, function (status, text) {
        if ((status === 0 || status >= 520) && tried < HOSTS.length - 1) {
          tried++;
          host_index = (host_index + 1) % HOSTS.length;
          return attempt();
        }

        release();
        job.fail(status, text);
      });
    };

    attempt();
  }

  // GraphQL: ответ кешируем на 20 минут (подборки меняются редко, а лимит запросов маленький)
  function gql(query, ok, fail, opts) {
    opts = opts || {};

    var key = (opts.auth ? 'a:' : '') + query;
    var hit = cache[key];

    if (!opts.fresh && hit && Date.now() - hit.t < 20 * 60000) return ok(hit.data);

    var send = function (token) {
      shiki({ method: 'POST', path: '/api/graphql', body: JSON.stringify({ query: query }), type: 'application/json', token: token, priority: !!opts.priority }, function (json) {
        if (!json || !json.data) return (fail || function () {})(0, json && json.errors ? JSON.stringify(json.errors) : 'пустой ответ');

        cache[key] = { t: Date.now(), data: json.data };

        var keys = Object.keys(cache);

        if (keys.length > 60) delete cache[keys[0]];

        ok(json.data);
      }, fail);
    };

    if (opts.auth) withToken(send, fail);
    else send(null);
  }

  function arg(v) {
    return typeof v === 'number' ? String(v) : JSON.stringify(String(v));
  }

  // Параметры подборки (строка вида «season=fall_2026&order=popularity») → аргументы запроса animes
  function animesArgs(p, page) {
    var out = ['page: ' + (page || 1), 'limit: ' + PAGE, 'order: ' + (/^(popularity|ranked|aired_on|ranked_shiki)$/.test(p.order) ? p.order : 'popularity'), 'censored: true'];

    ['season', 'kind', 'status', 'genre', 'mylist', 'franchise', 'search', 'ids'].forEach(function (k) {
      if (p[k]) out.push(k + ': ' + arg(p[k]));
    });

    if (!p.kind && !p.mylist && !p.ids) out.push('kind: "tv,movie,ona,ova"');

    return out.join(', ');
  }

  function parseQuery(url) {
    var out = {};

    (url || '').replace(/^[^?]*\?/, '').split('&').forEach(function (part) {
      var kv = part.split('=');

      if (kv[0]) out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });

    return out;
  }

  function buildQuery(p) {
    return 'shk?' + Object.keys(p).filter(function (k) { return p[k] !== '' && p[k] !== undefined && p[k] !== null; }).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }).join('&');
  }

  // ---------------------------------------------------------------------------
  // Сезоны: зима — январь–март, весна — апрель–июнь, лето — июль–сентябрь, осень — октябрь–декабрь
  // ---------------------------------------------------------------------------

  function seasonOf(date) {
    return { name: SEASON_ORDER[Math.floor(date.getMonth() / 3)], year: date.getFullYear() };
  }

  function shiftSeason(s, by) {
    var i = SEASON_ORDER.indexOf(s.name) + by;
    var year = s.year + Math.floor(i / 4);

    i = ((i % 4) + 4) % 4;

    return { name: SEASON_ORDER[i], year: year };
  }

  function seasonKey(s) {
    return s.name + '_' + s.year;
  }

  function seasonText(key) {
    var m = /^(winter|spring|summer|fall)_(\d{4})$/.exec(key || '');

    if (m) return SEASON_NAMES[m[1]] + ' ' + m[2];
    if (/^\d{4}$/.test(key)) return key + ' год';
    if (/^\d{4}_\d{4}$/.test(key)) return key.replace('_', '–');

    return key || 'Любой';
  }

  // ---------------------------------------------------------------------------
  // Карточки Shikimori в формате Lampa. Оценка на карточке — оценка Shikimori
  // ---------------------------------------------------------------------------

  function shikiCard(a) {
    var movie = a.kind === 'movie';
    var date = a.airedOn && a.airedOn.date || '';
    var poster = a.poster && a.poster.mainUrl || '';
    var card = {
      id: 'shk' + a.id,
      shiki_id: +a.id,
      shiki: { id: +a.id, name: a.name, russian: a.russian, english: a.english, japanese: a.japanese, kind: a.kind, episodes: a.episodes, aired: date, franchise: a.franchise },
      source: 'shikimori',
      poster: poster,
      img: poster,
      vote_average: a.score || 0
    };

    if (movie) {
      card.title = a.russian || a.name;
      card.original_title = a.name;
      card.release_date = date;
    } else {
      card.name = a.russian || a.name;
      card.original_name = a.name;
      card.first_air_date = date;
    }

    return card;
  }

  // Подборка → строка Lampa (с кнопкой «Ещё»)
  function line(title, p, call) {
    gql('{ animes(' + animesArgs(p, 1) + ') { ' + ANIME_FIELDS + ' } }', function (data) {
      var list = (data.animes || []).map(shikiCard);

      call({ title: title, results: list, url: buildQuery(p), source: 'shikimori', page: 1, total_pages: list.length >= PAGE ? 2 : 1 });
    }, function () { call(); }, { auth: !!p.mylist });
  }

  // ---------------------------------------------------------------------------
  // Источник «shikimori» для Lampa: главная раздела, подборки («Ещё») и открытие карточки
  // ---------------------------------------------------------------------------

  var POPULAR_GENRES = [['1', 'Экшен'], ['22', 'Романтика'], ['4', 'Комедия'], ['10', 'Фэнтези'], ['36', 'Повседневность'], ['130', 'Исэкай'], ['24', 'Фантастика'], ['7', 'Тайна'], ['30', 'Спорт'], ['14', 'Ужасы']];

  function mainParts() {
    var now = seasonOf(new Date());
    var next = shiftSeason(now, 1);
    var prev = shiftSeason(now, -1);
    var parts = [];

    if (loggedIn()) {
      parts.push(function (call) { line('Смотрю', { mylist: 'watching', order: 'aired_on' }, call); });
      parts.push(function (call) { line('Запланировано', { mylist: 'planned', order: 'popularity' }, call); });
    }

    parts.push(function (call) { line('Онгоинги: ' + seasonText(seasonKey(now)), { season: seasonKey(now), status: 'ongoing', order: 'popularity' }, call); });
    parts.push(function (call) { line('Анонсы: ' + seasonText(seasonKey(next)), { season: seasonKey(next), order: 'popularity' }, call); });
    parts.push(function (call) { line('Прошлый сезон: ' + seasonText(seasonKey(prev)), { season: seasonKey(prev), order: 'ranked' }, call); });
    parts.push(function (call) { line('Популярное', { order: 'popularity', kind: 'tv' }, call); });
    parts.push(function (call) { line('Лучшие по оценке', { order: 'ranked', kind: 'tv' }, call); });
    parts.push(function (call) { line('Лучшие фильмы', { order: 'ranked', kind: 'movie' }, call); });

    if (loggedIn()) {
      parts.push(function (call) { line('Отложено', { mylist: 'on_hold', order: 'aired_on' }, call); });
    }

    POPULAR_GENRES.forEach(function (g) {
      parts.push(function (call) { line(g[1], { genre: g[0], order: 'popularity', season: (now.year - 6) + '_' + now.year }, call); });
    });

    return parts;
  }

  var Source = {
    main: function (params, oncomplite, onerror) {
      var parts = mainParts();
      var load = function (ok, empty) { Lampa.Api.partNext(parts, 4, ok, empty); };

      load(oncomplite, onerror);

      return load;
    },
    category: function (params, oncomplite, onerror) {
      return Source.main(params, oncomplite, onerror);
    },
    list: function (params, oncomplite, onerror) {
      var p = parseQuery(params.url);
      var page = parseInt(params.page, 10) || 1;

      gql('{ animes(' + animesArgs(p, page) + ') { ' + ANIME_FIELDS + ' } }', function (data) {
        var list = (data.animes || []).map(shikiCard);

        if (!list.length && page === 1) return onerror();

        oncomplite({ results: list, page: page, total_pages: list.length >= PAGE ? page + 1 : page });
      }, function () { onerror(); }, { auth: !!p.mylist });
    },
    // Карточка Shikimori → карточка TMDB. Объект активности меняем на месте, чтобы «Назад»
    // и восстановление после перезапуска открывали уже карточку TMDB
    full: function (params, oncomplite, onerror) {
      var card = params.card || {};

      if (!card.shiki) return Lampa.Api.sources.tmdb.full(params, oncomplite, onerror);

      findTmdb(card.shiki, function (found) {
        params.id = found.id;
        params.method = found.method;
        params.source = 'tmdb';
        params.card = { id: found.id, source: 'tmdb', name: card.name, title: card.title, original_name: found.method === 'tv' ? card.original_name : undefined, original_title: found.method === 'movie' ? card.original_title : undefined };

        if (found.season && window.tvt_api && tvt_api.openSeason) tvt_api.openSeason(found.id, found.season);

        rating_cache[found.method + found.id] = card.vote_average;
        cacheSet('tva_known', found.method + found.id, 1, 500);

        Lampa.Api.sources.tmdb.full(params, oncomplite, onerror);
      }, function () {
        Lampa.Noty.show('«' + (card.name || card.title) + '» не найдено на TMDB — открываю поиск');
        onerror();
        setTimeout(function () {
          Lampa.Activity.push({ url: '', title: 'Поиск', component: 'search', query: card.shiki.russian || card.shiki.name, page: 1 });
        }, 300);
      });
    },
    seasons: function (tv, from, oncomplite) {
      Lampa.Api.sources.tmdb.seasons(tv, from, oncomplite);
    },
    menu: function (params, oncomplite) { oncomplite([]); },
    clear: function () {}
  };

  // ---------------------------------------------------------------------------
  // Shikimori ↔ TMDB. На TMDB продолжения обычно — сезоны одного сериала
  // («Магическая битва 2» → «Магическая битва», 2 сезон), на Shikimori — отдельные тайтлы.
  // Сначала — готовая карта (id Shikimori = id MyAnimeList, карта Fribb/anime-lists, сезоны в
  // нумерации TVDB, как у трекеров), разбитая на маленькие файлы: нужен один, ~1,5 КБ.
  // Нет в карте — поиск по названию.
  // ---------------------------------------------------------------------------

  var MAP_BASE = 'https://bregal1337.github.io/anime-map/';
  var MAP_TTL = 7 * 86400000;
  var map_mem = {};
  var rating_cache = {};

  // kind: 'm' — по id Shikimori, 't' — по id TMDB
  function mapShard(kind, id, ok) {
    var name = kind + '/' + ('0' + (id % 100)).slice(-2);
    var key = 'tva_ms_' + name.replace('/', '');

    if (map_mem[name]) return ok(map_mem[name]);

    try {
      var saved = JSON.parse(localStorage.getItem(key) || 'null');

      if (saved && Date.now() - saved.t < MAP_TTL) {
        map_mem[name] = saved.d;
        return ok(saved.d);
      }
    } catch (e) {}

    var xhr = new XMLHttpRequest();
    var done = false;
    var finish = function (data) {
      if (done) return;

      done = true;
      ok(data);
    };

    xhr.open('GET', (field('tva_map_base', '') || MAP_BASE) + name + '.json', true);
    xhr.timeout = 10000;
    xhr.onload = function () {
      var data = null;

      try { data = JSON.parse(xhr.responseText); } catch (e) {}

      if (xhr.status === 200 && data) {
        map_mem[name] = data;

        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (e) {}
      }

      finish(data || {});
    };
    xhr.onerror = xhr.ontimeout = function () { finish({}); };
    xhr.send();
  }

  function tmdbKey(movie) {
    return (movie.original_name || movie.number_of_seasons || movie.first_air_date ? 'tv' : 'movie') + movie.id;
  }

  function tmdbGet(path, ok, fail) {
    var net = new Lampa.Reguest();
    var url = Lampa.TMDB.api(path + (path.indexOf('?') >= 0 ? '&' : '?') + 'api_key=' + Lampa.TMDB.key() + '&language=ru');

    net.timeout(15000);
    net.silent(url, ok, fail);
  }

  // «Season 3», «2nd Season», «Part 2», «: Shibuya Incident», «II» — убираем, остаётся название сериала
  function baseName(n) {
    return (n || '').replace(/\s*(?:season\s*\d+|\d+(?:st|nd|rd|th)\s*season|part\s*\d+|cour\s*\d+|\b(?:ii|iii|iv|v)\b)\s*/ig, ' ')
      .replace(/\s*[:：].*$/, '').replace(/\s*第\d+期.*$/, '').replace(/\s+\d+$/, '').trim();
  }

  function normName(n) {
    return (n || '').toLowerCase().replace(/[^a-zа-яё0-9぀-ヿ一-鿿]+/g, '');
  }

  function isAnimeTmdb(x) {
    return (x.genre_ids || []).indexOf(16) >= 0 && (!x.origin_country || !x.origin_country.length || x.origin_country.indexOf('JP') >= 0 || x.original_language === 'ja');
  }

  function cacheGet(name, key) {
    return readJson(name)[key];
  }

  function cacheSet(name, key, value, limit) {
    var all = readJson(name);

    all[key] = value;

    var keys = Object.keys(all);

    if (keys.length > limit) delete all[keys[0]];

    Lampa.Storage.set(name, all);
  }

  function findTmdb(s, ok, fail) {
    var hit = cacheGet('tva_map2', s.id);

    if (hit) return ok(hit);

    var save = function (found) {
      cacheSet('tva_map2', s.id, found, 500);
      ok(found);
    };

    mapShard('m', s.id, function (shard) {
      var m = shard[s.id];

      if (m) return save({ id: m[1], method: m[0] === 'm' ? 'movie' : 'tv', season: m[2] || 1, from: 'map' });

      searchTmdb(s, save, fail);
    });
  }

  // Поиск на TMDB, если в карте тайтла нет. Сначала полное название и год — так находятся ремейки
  // и отдельные сериалы («One Piece Log: Fish-Man Island Saga»), потом название без «Season 2» и
  // подзаголовка — продолжение как сезон сериала, начавшегося раньше
  function searchTmdb(s, ok, fail) {
    var method = s.kind === 'movie' ? 'movie' : 'tv';
    var year = parseInt((s.aired || '').slice(0, 4), 10) || 0;
    // Японское название — самое точное: на TMDB оно обычно и есть оригинальное
    var full = [s.japanese, s.english, s.name, s.russian].filter(function (n, i, a) { return n && a.indexOf(n) === i; });
    var bases = [baseName(s.english), baseName(s.name), baseName(s.russian)].filter(function (n, i, a) { return n && a.indexOf(n) === i && full.indexOf(n) < 0; });
    var wanted = full.concat(bases).map(normName);

    var yearOf = function (x) { return parseInt(((method === 'movie' ? x.release_date : x.first_air_date) || '').slice(0, 4), 10) || 0; };
    var nameScore = function (x) {
      var n = [normName(x.name || x.title), normName(x.original_name || x.original_title)];

      return wanted.some(function (w) { return w && n.indexOf(w) >= 0; }) ? 3 : 0;
    };

    var step = function (list, sequel) {
      var name = list.shift();

      if (!name) return sequel ? fail() : step(bases.slice(), true);

      tmdbGet('search/' + method + '?query=' + encodeURIComponent(name), function (json) {
        var best = null;
        var best_score = -1;

        // Жанр «Анимация» на TMDB проставлен не везде — при точном совпадении названия он не нужен
        (json && json.results || []).filter(function (x) { return isAnimeTmdb(x) || nameScore(x) >= 3; }).forEach(function (x, i) {
          var y = yearOf(x);
          var score = nameScore(x) - i * 0.1;

          if (!sequel) {
            if (!year || !y || Math.abs(y - year) <= 1) score += 3;
            else return;
          } else if (year && y && y > year + 1) return;

          if (score > best_score) {
            best_score = score;
            best = x;
          }
        });

        if (!best) return step(list, sequel);

        if (method === 'movie') return ok({ id: best.id, method: 'movie' });
        if (!sequel) return ok({ id: best.id, method: 'tv', season: 1 });

        franchiseSeason(s, function (season) { ok({ id: best.id, method: 'tv', season: season }); });
      }, function () { step(list, sequel); });
    };

    step(full.slice(), false);
  }

  // Какой по счёту это сезон в франшизе: TV по дате выхода (ONA — только если сам тайтл ONA:
  // в франшизах много коротких ONA-вставок, которые трекеры сезонами не считают)
  function franchiseSeason(s, done) {
    if (!s.franchise) return done(1);

    franchiseEntries(s.franchise, s.kind === 'ona', function (list) {
      for (var i = 0; i < list.length; i++) if (list[i].id === s.id) return done(i + 1);

      done(1);
    }, function () { done(1); });
  }

  function franchiseEntries(franchise, with_ona, ok, fail) {
    gql('{ animes(franchise: ' + arg(franchise) + ', kind: "tv,ona", limit: 30, order: aired_on, censored: true) { ' + ANIME_FIELDS + ' } }', function (data) {
      var all = (data.animes || []).filter(function (a) { return a.airedOn && a.airedOn.date; }).map(entryOf);
      var tv = all.filter(function (a) { return a.kind === 'tv'; });
      var list = with_ona || !tv.length ? all : tv;

      list.sort(function (a, b) { return a.aired < b.aired ? -1 : 1; });
      ok(list);
    }, fail, { priority: true });
  }

  // По дате выхода; без даты (ещё не вышло) — в конец
  function byAired(a, b) {
    if (!a.aired !== !b.aired) return a.aired ? -1 : 1;

    return a.aired < b.aired ? -1 : a.aired > b.aired ? 1 : 0;
  }

  function entryOf(a) {
    return { id: +a.id, name: a.name, russian: a.russian, kind: a.kind, episodes: a.episodes || a.episodesAired || 0, aired: a.airedOn && a.airedOn.date || '', score: a.score };
  }

  // Карточка TMDB (аниме) → тайтлы Shikimori по сезонам: { id, score, episodes, seasons: [{ id, season, episodes, aired, … }] }
  function shikiForTmdb(movie, ok, fail) {
    var key = tmdbKey(movie);
    var hit = cacheGet('tva_tmdb2', key);

    if (hit) return ok(hit);

    var save = function (entry) {
      cacheSet('tva_tmdb2', key, entry, 300);
      ok(entry);
    };

    mapShard('t', movie.id, function (shard) {
      var list = shard[(key.indexOf('tv') === 0 ? 't' : 'm') + movie.id];

      if (!list || !list.length) return searchShiki(movie, save, fail);

      var seasons = {};

      list.forEach(function (p) { seasons[p[0]] = p[1]; });

      gql('{ animes(ids: ' + arg(list.map(function (p) { return p[0]; }).join(',')) + ', limit: 50, censored: false) { ' + ANIME_FIELDS + ' } }', function (data) {
        var items = (data.animes || []).map(function (a) {
          var e = entryOf(a);

          e.season = seasons[e.id] || 0;

          return e;
        }).filter(function (e) { return e.season > 0 || key.indexOf('movie') === 0; });

        if (!items.length) return searchShiki(movie, save, fail);

        items.sort(function (a, b) { return (a.season - b.season) || byAired(a, b); });

        var main = items[0];

        save({ id: main.id, score: main.score, episodes: main.episodes, seasons: items, from: 'map' });
      }, function () { searchShiki(movie, save, fail); }, { priority: true });
    });
  }

  // Нет в карте — ищем на Shikimori по названию и году, сезоны — по франшизе
  function searchShiki(movie, ok, fail) {
    var tv = tmdbKey(movie).indexOf('tv') === 0;
    var year = parseInt(((tv ? movie.first_air_date : movie.release_date) || '').slice(0, 4), 10) || 0;
    var names = [movie.name || movie.title, movie.original_name || movie.original_title].filter(function (n, i, a) { return n && a.indexOf(n) === i; });

    var tryName = function () {
      var name = names.shift();

      if (!name) return fail();

      gql('{ animes(search: ' + arg(name) + ', limit: 10, kind: ' + arg(tv ? 'tv,ona' : 'movie') + ', censored: false) { ' + ANIME_FIELDS + ' } }', function (data) {
        var best = null;

        (data.animes || []).forEach(function (a) {
          var y = parseInt((a.airedOn && a.airedOn.date || '').slice(0, 4), 10) || 0;

          if (!best && (!year || !y || Math.abs(y - year) <= 1)) best = a;
        });

        if (!best) return tryName();

        var entry = { id: +best.id, score: best.score, episodes: best.episodes || 0 };

        if (!tv || !best.franchise) return ok(entry);

        franchiseEntries(best.franchise, best.kind === 'ona', function (seasons) {
          entry.seasons = seasons;
          ok(entry);
        }, function () { ok(entry); });
      }, tryName, { priority: true });
    };

    tryName();
  }

  // Тайтлы Shikimori для сезона (в нумерации раздач). Сезон бывает из нескольких тайтлов
  // («Атака титанов», 3 сезон = часть 1 + часть 2) — тогда список частей по порядку
  function shikiForSeason(entry, season, air_date) {
    var list = entry.seasons || [];

    if (!list.length) return season === 1 ? [{ id: entry.id, episodes: entry.episodes }] : [];

    // Из карты: номер сезона известен. Части, которые ещё не вышли, — в конец
    if (list[0].season) {
      return list.filter(function (s) { return s.season === season; }).sort(byAired);
    }

    if (air_date) {
      var t = Date.parse(air_date);
      var best = null;
      var dist = Infinity;

      list.forEach(function (s) {
        var d = Math.abs(Date.parse(s.aired) - t);

        if (d < dist) {
          dist = d;
          best = s;
        }
      });

      if (best && dist <= 60 * 86400000) return [best];
    }

    return list[season - 1] ? [list[season - 1]] : [];
  }

  // Аниме: жанр «Анимация» и Япония — или карточку открывали из раздела «Аниме» (на TMDB жанр бывает не проставлен)
  function isAnimeMovie(movie) {
    var genres = (movie.genres || []).map(function (g) { return g.id; }).concat(movie.genre_ids || []);

    if (movie.id && cacheGet('tva_known', tmdbKey(movie))) return true;

    return genres.indexOf(16) >= 0 && (movie.original_language === 'ja' || (movie.origin_country || []).indexOf('JP') >= 0 || (movie.production_countries || []).some(function (c) { return c.iso_3166_1 === 'JP'; }));
  }

  // Для tv.js: оценка Shikimori для заголовка экрана сериала (если уже известна)
  window.tvt_rating = function (movie) {
    if (!movie || !movie.id) return 0;

    var key = tmdbKey(movie);

    if (rating_cache[key]) return rating_cache[key];

    var hit = cacheGet('tva_tmdb2', key);

    return hit && hit.score || 0;
  };

  // Оценка Shikimori в строке оценок полной карточки
  function initRating() {
    Lampa.Listener.follow('full', function (e) {
      if (e.type !== 'complite' || !e.data || !e.data.movie) return;

      var movie = e.data.movie;

      if (!isAnimeMovie(movie)) return;

      var render = e.object && e.object.activity ? e.object.activity.render() : $(document);

      shikiForTmdb(movie, function (entry) {
        if (!entry.score) return;

        rating_cache[tmdbKey(movie)] = entry.score;

        var row = $(render).find('.full-start-new__rate-line, .full-start__rate-line').eq(0);

        if (!row.length || row.find('.rate--shiki').length) return;

        var el = $('<div class="full-start__rate rate--shiki"><div></div><div class="source--name">Shikimori</div></div>');

        el.find('div').eq(0).text((+entry.score).toFixed(1));
        row.prepend(el);
      }, function () {});
    });
  }

  // ---------------------------------------------------------------------------
  // Каталог: «Ещё» открывает подборку целиком, кнопка «Фильтр» в шапке меняет сезон, жанр,
  // тип, статус и сортировку
  // ---------------------------------------------------------------------------

  var filter_button = null;
  var genres_list = null;

  function loadGenres(ok) {
    if (genres_list) return ok(genres_list);

    gql('{ genres(entryType: Anime) { id russian kind } }', function (data) {
      genres_list = (data.genres || []).filter(function (g) { return g.kind === 'genre' || g.kind === 'theme'; }).filter(function (g) { return ['12', '539', '9'].indexOf(String(g.id)) < 0; });
      ok(genres_list);
    }, function () { ok([]); });
  }

  function seasonChoices() {
    var now = seasonOf(new Date());
    var out = [{ title: 'Любой', value: '' }];

    for (var i = 1; i >= -8; i--) {
      var s = shiftSeason(now, i);

      out.push({ title: seasonText(seasonKey(s)), value: seasonKey(s) });
    }

    for (var y = now.year; y >= now.year - 6; y--) out.push({ title: y + ' год', value: String(y) });

    out.push({ title: '2010–2019', value: '2010_2019' });
    out.push({ title: '2000–2009', value: '2000_2009' });
    out.push({ title: 'До 2000', value: '1960_1999' });

    return out;
  }

  function catalogTitle(p) {
    var parts = [];

    if (p.mylist) parts.push(STATUS_NAMES[p.mylist] || p.mylist);
    if (p.status) parts.push(STATE_NAMES[p.status] || p.status);
    if (p.season) parts.push(seasonText(p.season));
    if (p.kind) parts.push(KIND_NAMES[p.kind] || p.kind);
    if (p.genre_name) parts.push(p.genre_name);

    return parts.length ? parts.join(' · ') : 'Аниме';
  }

  function openFilter() {
    var act = Lampa.Activity.active();

    if (!act || act.source !== 'shikimori') return;

    var p = parseQuery(act.url);
    var enabled = Lampa.Controller.enabled().name;

    var apply = function () {
      var url = buildQuery(p);

      Lampa.Activity.replace({ url: url, title: catalogTitle(p), component: 'category_full', source: 'shikimori', page: 1 });
    };

    var pick = function (title, items, key, extra) {
      Lampa.Select.show({
        title: title,
        items: items.map(function (it) { return { title: it.title, value: it.value, selected: String(p[key] || '') === String(it.value) }; }),
        onBack: function () { openFilter(); },
        onSelect: function (a) {
          p[key] = a.value;
          if (extra) extra(a);
          apply();
        }
      });
    };

    Lampa.Select.show({
      title: 'Фильтр',
      items: [
        { title: 'Сезон', subtitle: seasonText(p.season), key: 'season' },
        { title: 'Жанр', subtitle: p.genre_name || 'Любой', key: 'genre' },
        { title: 'Тип', subtitle: KIND_NAMES[p.kind] || 'Любой', key: 'kind' },
        { title: 'Статус', subtitle: STATE_NAMES[p.status] || 'Любой', key: 'status' },
        { title: 'Сортировка', subtitle: ORDER_NAMES[p.order] || ORDER_NAMES.popularity, key: 'order' },
        { title: 'Сбросить фильтр', key: 'reset' }
      ],
      onBack: function () { Lampa.Controller.toggle(enabled); },
      onSelect: function (a) {
        // «Онгоинги» из строки главной для другого сезона дали бы пустой список — статус сбрасываем
        if (a.key === 'season') pick('Сезон', seasonChoices(), 'season', function () { p.status = ''; });
        else if (a.key === 'kind') pick('Тип', [{ title: 'Любой', value: '' }].concat(Object.keys(KIND_NAMES).map(function (k) { return { title: KIND_NAMES[k], value: k }; })), 'kind');
        else if (a.key === 'status') pick('Статус', [{ title: 'Любой', value: '' }].concat(Object.keys(STATE_NAMES).map(function (k) { return { title: STATE_NAMES[k], value: k }; })), 'status');
        else if (a.key === 'order') pick('Сортировка', Object.keys(ORDER_NAMES).map(function (k) { return { title: ORDER_NAMES[k], value: k }; }), 'order');
        else if (a.key === 'genre') {
          loadGenres(function (list) {
            pick('Жанр', [{ title: 'Любой', value: '' }].concat(list.map(function (g) { return { title: g.russian, value: String(g.id) }; })), 'genre', function (it) {
              p.genre_name = it.value ? it.title : '';
            });
          });
        } else if (a.key === 'reset') {
          p = { order: 'popularity' };
          apply();
        }
      }
    });
  }

  function initCatalog() {
    Lampa.Listener.follow('activity', function (e) {
      if (e.type !== 'start') return;

      var ours = e.object && e.object.source === 'shikimori' && e.component === 'category_full';

      if (ours && !filter_button) {
        filter_button = Lampa.Head.addIcon('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8L4 5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>', openFilter);
        filter_button.addClass('tva-filter');
      } else if (!ours && filter_button) {
        filter_button.remove();
        filter_button = null;
      }
    });
  }

  function initMenu() {
    var icon = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l2.6 5.6L20.5 9l-4.4 4.1 1.2 6L12 16.2 6.7 19.1l1.2-6L3.5 9l5.9-.4L12 3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

    Lampa.Menu.addButton(icon, 'Аниме Shikimori', function () {
      Lampa.Activity.push({ url: '', title: 'Аниме', component: 'main', source: 'shikimori', page: 1 });
    });
  }

  // ---------------------------------------------------------------------------
  // Вход в Shikimori (OAuth). Своё «приложение» на Shikimori создаётся один раз; ключи и
  // вход хранятся в Lampa и в приватном репозитории синхронизации (tv.js), поэтому на
  // остальных устройствах того же человека вход появляется сам.
  // ---------------------------------------------------------------------------

  var STORE_FILE = 'shikimori.json';

  function auth() {
    return readJson('tva_auth');
  }

  function saveAuth(a, push) {
    a.t = Date.now();
    Lampa.Storage.set('tva_auth', a);
    logged = null;
    updateStatus();

    if (push && window.tvt_api && tvt_api.store && tvt_api.store.ready()) {
      tvt_api.store.put(STORE_FILE, a, function () {}, function (status, msg) {
        console.log('Anime', 'не удалось сохранить вход в репозиторий', status, msg);
      });
    }
  }

  var logged = null;

  // Вход проверяется часто (для каждой карточки) — читаем хранилище один раз, сбрасываем при изменении
  function loggedIn() {
    if (logged === null) {
      var a = auth();

      logged = !!(a.refresh_token && a.user_id);
    }

    return logged;
  }

  function clientKeys() {
    var a = auth();

    return {
      id: (field('tva_client_id', '') + '').trim() || a.client_id || '',
      secret: (field('tva_client_secret', '') + '').trim() || a.client_secret || ''
    };
  }

  function tokenRequest(form, ok, fail) {
    var body = Object.keys(form).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(form[k]); }).join('&');

    shiki({ method: 'POST', path: '/oauth/token', body: body, type: 'application/x-www-form-urlencoded' }, function (json) {
      if (!json || !json.access_token) return fail(0, json && (json.error_description || json.error) || 'нет токена');
      ok(json);
    }, fail);
  }

  var refreshing = null;

  // Свежий токен доступа (живёт сутки). Не обновился — возможно, его уже обновило другое
  // устройство: берём вход из репозитория и пробуем ещё раз
  function withToken(ok, fail) {
    fail = fail || function () {};

    var a = auth();

    if (!a.refresh_token) return fail(401, 'не выполнен вход в Shikimori');
    if (a.access_token && (a.expires_at || 0) - 120000 > Date.now()) return ok(a.access_token);

    if (refreshing) return refreshing.push([ok, fail]);

    refreshing = [[ok, fail]];

    var finish = function (token, status, msg) {
      var list = refreshing;

      refreshing = null;
      list.forEach(function (cb) { token ? cb[0](token) : cb[1](status, msg); });
    };

    var refresh = function (cur, second) {
      tokenRequest({ grant_type: 'refresh_token', client_id: cur.client_id, client_secret: cur.client_secret, refresh_token: cur.refresh_token }, function (json) {
        cur.access_token = json.access_token;
        cur.refresh_token = json.refresh_token || cur.refresh_token;
        cur.expires_at = Date.now() + (json.expires_in || 86400) * 1000;
        saveAuth(cur, true);
        finish(cur.access_token);
      }, function (status, msg) {
        if (second || !window.tvt_api || !tvt_api.store || !tvt_api.store.ready()) return finish(null, status, msg);

        tvt_api.store.get(STORE_FILE, function (remote) {
          if (remote && remote.refresh_token && remote.refresh_token !== cur.refresh_token) {
            saveAuth(remote, false);
            if (remote.access_token && (remote.expires_at || 0) - 120000 > Date.now()) return finish(remote.access_token);
            refresh(remote, true);
          } else finish(null, status, msg);
        }, function () { finish(null, status, msg); });
      });
    };

    refresh(a, false);
  }

  function loadQr(done) {
    if (window.QRCode) return done(true);

    var s = document.createElement('script');

    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = function () { done(!!window.QRCode); };
    s.onerror = function () { done(false); };
    document.head.appendChild(s);
  }

  // Окно с QR-кодом для телефона. watch(stop) вызывается раз в 5 секунд, пока окно открыто
  function qrWindow(title, text, url, buttons, watch) {
    var html = $('<div class="tva-login"><div class="tva-login__qr"></div><div class="tva-login__text"></div><div class="tva-login__url"></div></div>');
    var enabled = Lampa.Controller.enabled().name;
    var open = true;
    var timer = null;

    var close = function () {
      if (!open) return;

      open = false;
      clearTimeout(timer);
      Lampa.Modal.close();
      Lampa.Controller.toggle(enabled);
    };

    var tick = function () {
      if (!open || !watch) return;

      watch(close);
      timer = setTimeout(tick, 5000);
    };

    html.find('.tva-login__text').text(text);
    html.find('.tva-login__url').text(url);

    loadQr(function (has) {
      if (has) {
        try {
          new window.QRCode(html.find('.tva-login__qr')[0], { text: url, width: 240, height: 240, correctLevel: window.QRCode.CorrectLevel.L });
        } catch (e) {}
      }
    });

    Lampa.Modal.open({
      title: title,
      html: html,
      size: 'medium',
      buttons: (buttons || []).map(function (b) {
        return { name: b.name, onSelect: function () { b.onSelect(close); } };
      }),
      onBack: close
    });

    timer = setTimeout(tick, 5000);

    return close;
  }

  // ---------------------------------------------------------------------------
  // Всё вводится на телефоне: на ТВ показываем QR-код, телефон открывает приватный репозиторий
  // синхронизации на сайте GitHub с готовым файлом, туда вставляются ключи или код, а ТВ сам
  // забирает их через несколько секунд. Клавиатура телевизора не нужна
  // ---------------------------------------------------------------------------

  var KEYS_FILE = 'shikimori_keys.txt';
  var KEYS_TEMPLATE = 'client_id: \nclient_secret: \n';

  function phoneReady() {
    if (window.tvt_api && tvt_api.store && tvt_api.store.ready() && tvt_api.store.info) return true;

    Lampa.Noty.show('Нужна синхронизация через GitHub в «Торренты TV» (Настройки → Торренты TV)');

    return false;
  }

  // Ссылка на сайт GitHub: создать файл с заготовкой или открыть существующий на редактирование
  function githubFileUrl(file, template, exists, done) {
    tvt_api.store.info(function (info) {
      var path = info.dir + file;

      done(exists ?
        info.web + '/edit/' + info.branch + '/' + path.split('/').map(encodeURIComponent).join('/') :
        info.web + '/new/' + info.branch + '?filename=' + encodeURIComponent(path) + '&value=' + encodeURIComponent(template));
    }, function (status, msg) {
      Lampa.Noty.show('GitHub: ' + (msg || status));
    });
  }

  function parseKeys(text) {
    var id = /client[_\s-]*id\s*[:=]\s*([A-Za-z0-9_\-]{10,})/i.exec(text || '');
    var secret = /client[_\s-]*secret\s*[:=]\s*([A-Za-z0-9_\-]{10,})/i.exec(text || '');

    return id && secret ? { id: id[1], secret: secret[1] } : null;
  }

  function phoneKeys(then) {
    if (!phoneReady()) return;

    tvt_api.store.get(KEYS_FILE, function (text, sha) {
      githubFileUrl(KEYS_FILE, KEYS_TEMPLATE, !!sha, function (url) {
        qrWindow('Ключи Shikimori с телефона', 'Откройте ссылку на телефоне (наведите камеру на код). Откроется ваш приватный репозиторий на GitHub: вставьте Client ID и Client Secret после двоеточий и нажмите «Commit changes». Телевизор заберёт ключи сам.', url, [], function (close) {
          tvt_api.store.get(KEYS_FILE, function (fresh) {
            var keys = parseKeys(typeof fresh === 'string' ? fresh : '');

            if (!keys) return;

            var cur = clientKeys();

            if (keys.id === cur.id && keys.secret === cur.secret && sha) {
              // Файл не меняли — ждём, пока поправят
              if (fresh === text) return;
            }

            Lampa.Storage.set('tva_client_id', keys.id);
            Lampa.Storage.set('tva_client_secret', keys.secret);
            close();
            Lampa.Noty.show('Shikimori: ключи получены');
            updateKeysDescr();

            if (then) setTimeout(then, 400);
          }, function () {});
        });
      });
    }, function (status, msg) {
      Lampa.Noty.show('GitHub: ' + (msg || status));
    });
  }

  // Код от Shikimori — в новый файл с телефона; имя каждый раз своё, чтобы не перепутать со старым
  function phoneCode(keys) {
    if (!phoneReady()) return;

    var file = 'shikimori_code_' + Date.now().toString(36) + '.txt';

    githubFileUrl(file, '', false, function (url) {
      qrWindow('Код Shikimori с телефона', 'Скопируйте код со страницы Shikimori, откройте эту ссылку на телефоне, вставьте код и нажмите «Commit changes». Телевизор заберёт его сам.', url, [], function (close) {
        tvt_api.store.get(file, function (text) {
          var code = (typeof text === 'string' ? text : '').replace(/^[^:]*:\s*/, '').trim();

          if (!code || !/^[A-Za-z0-9_\-]{10,}$/.test(code)) return;

          close();
          exchangeCode(code, keys);
        }, function () {});
      });
    });
  }

  function login() {
    var keys = clientKeys();

    if (!keys.id || !keys.secret) {
      if (window.tvt_api && tvt_api.store && tvt_api.store.ready()) return phoneKeys(login);

      return Lampa.Noty.show('Сначала укажите Client ID и Client Secret приложения Shikimori');
    }

    var url = HOSTS[host_index] + '/oauth/authorize?client_id=' + encodeURIComponent(keys.id) + '&redirect_uri=' + encodeURIComponent(REDIRECT) + '&response_type=code&scope=user_rates';

    qrWindow('Вход в Shikimori', 'Откройте ссылку на телефоне (наведите камеру на код), войдите в Shikimori и нажмите «Разрешить». Shikimori покажет код — нажмите «Код с телефона» и вставьте его на GitHub, или «Ввести код» здесь.', url, [{
      name: 'Код с телефона',
      onSelect: function (close) {
        close();
        phoneCode(keys);
      }
    }, {
      name: 'Ввести код',
      onSelect: function (close) {
        // Окно с QR закрываем, иначе поле ввода окажется под ним
        close();

        var enabled = Lampa.Controller.enabled().name;

        Lampa.Input.edit({ title: 'Код от Shikimori', value: '', free: true, nosave: true, keyboard: 'system' }, function (code) {
          code = (code || '').trim();
          Lampa.Controller.toggle(enabled);

          if (code) exchangeCode(code, keys);
        });
      }
    }]);
  }

  function exchangeCode(code, keys) {
    Lampa.Noty.show('Shikimori: проверяю код…');

    tokenRequest({ grant_type: 'authorization_code', client_id: keys.id, client_secret: keys.secret, code: code, redirect_uri: REDIRECT }, function (json) {
      var a = { client_id: keys.id, client_secret: keys.secret, app: appName(), access_token: json.access_token, refresh_token: json.refresh_token, expires_at: Date.now() + (json.expires_in || 86400) * 1000 };

      shiki({ method: 'GET', path: '/api/users/whoami', token: a.access_token }, function (me) {
        if (!me || !me.id) return Lampa.Noty.show('Shikimori: не удалось узнать пользователя');

        a.user_id = me.id;
        a.nickname = me.nickname;
        saveAuth(a, true);
        cache = {};
        ratesRefresh(true);
        Lampa.Noty.show('Shikimori: вход выполнен — ' + me.nickname);
      }, function (status) { Lampa.Noty.show('Shikimori: ошибка ' + status); });
    }, function (status, msg) {
      Lampa.Noty.show('Shikimori: код не подошёл (' + (msg || status) + ')');
    });
  }

  function logout() {
    Lampa.Storage.set('tva_auth', {});
    Lampa.Storage.set('tva_rates', {});
    logged = null;
    cache = {};
    rates = null;
    tmdb_index = {};
    decorateAll();
    updateStatus();
    Lampa.Noty.show('Shikimori: выход выполнен на этом устройстве');
  }

  // Вход сделан на другом устройстве этого человека — берём из репозитория синхронизации
  function pullAuth(manual) {
    if (!window.tvt_api || !tvt_api.store || !tvt_api.store.ready()) {
      if (manual) Lampa.Noty.show('Нужна синхронизация через GitHub в «Торренты TV»');
      return;
    }

    tvt_api.store.get(STORE_FILE, function (remote) {
      if (remote && remote.refresh_token && remote.user_id && (!loggedIn() || (remote.t || 0) > (auth().t || 0))) {
        saveAuth(remote, false);
        cache = {};
        ratesRefresh(true);
        if (manual) Lampa.Noty.show('Shikimori: вход взят из репозитория — ' + (remote.nickname || ''));
      } else if (manual) Lampa.Noty.show(remote ? 'Shikimori: в репозитории тот же вход' : 'Shikimori: в репозитории входа нет');
    }, function (status, msg) {
      if (manual) Lampa.Noty.show('Shikimori: ' + (msg || status));
    });
  }

  // ---------------------------------------------------------------------------
  // Список Shikimori: статусы и просмотренные серии (API v2 user_rates)
  // ---------------------------------------------------------------------------

  function rateGet(target, ok, fail) {
    withToken(function (token) {
      shiki({ priority: true, method: 'GET', path: '/api/v2/user_rates?user_id=' + auth().user_id + '&target_id=' + target + '&target_type=Anime', token: token }, function (list) {
        ok(Array.isArray(list) && list.length ? list[0] : null);
      }, fail);
    }, fail);
  }

  function rateSave(target, rate, patch, ok, fail) {
    withToken(function (token) {
      if (rate && rate.id) {
        shiki({ priority: true, method: 'PATCH', path: '/api/v2/user_rates/' + rate.id, body: JSON.stringify({ user_rate: patch }), type: 'application/json', token: token }, ok, fail);
      } else {
        var body = { user_id: auth().user_id, target_id: target, target_type: 'Anime' };

        for (var k in patch) body[k] = patch[k];

        shiki({ priority: true, method: 'POST', path: '/api/v2/user_rates', body: JSON.stringify({ user_rate: body }), type: 'application/json', token: token }, ok, fail);
      }
    }, fail);
  }

  function rateDelete(rate, ok, fail) {
    withToken(function (token) {
      shiki({ priority: true, method: 'DELETE', path: '/api/v2/user_rates/' + rate.id, token: token }, ok, fail);
    }, fail);
  }

  // Меню статусов для тайтла Shikimori
  function statusMenu(target, title, enabled) {
    Lampa.Loading.start(function () { Lampa.Loading.stop(); });

    rateGet(target.id, function (rate) {
      Lampa.Loading.stop();

      var items = Object.keys(STATUS_NAMES).map(function (k) { return { title: STATUS_NAMES[k], status: k, selected: rate && rate.status === k }; });

      if (rate) items.push({ title: 'Убрать из списка', remove: true });

      Lampa.Select.show({
        title: 'Shikimori: ' + title + (rate && rate.episodes ? ' · ' + rate.episodes + ' сер.' : ''),
        items: items,
        onBack: function () { Lampa.Controller.toggle(enabled); },
        onSelect: function (a) {
          Lampa.Controller.toggle(enabled);

          var done = function () {
            cache = {};
            rateLocal(target.id, a.remove ? null : a.status, a.status === 'completed' && target.episodes ? target.episodes : rate && rate.episodes, target.episodes);
            Lampa.Noty.show('Shikimori: ' + (a.remove ? 'убрано из списка' : STATUS_NAMES[a.status]) + ' — ' + title);
          };
          var fail = function (status, msg) { Lampa.Noty.show('Shikimori: не сохранилось (' + (msg || status) + ')'); };

          if (a.remove) rateDelete(rate, done, fail);
          else {
            var patch = { status: a.status };

            if (a.status === 'completed' && target.episodes) patch.episodes = target.episodes;

            rateSave(target.id, rate, patch, done, fail);
          }
        }
      });
    }, function (status, msg) {
      Lampa.Loading.stop();
      Lampa.Noty.show('Shikimori: ' + (msg || status));
    });
  }

  // Карточка (Shikimori или TMDB) → тайтл Shikimori; у сериала с несколькими сезонами спрашиваем, какой
  function cardStatus(card, enabled) {
    if (card.shiki) return statusMenu({ id: card.shiki.id, episodes: card.shiki.episodes }, card.name || card.title, enabled);

    Lampa.Loading.start(function () { Lampa.Loading.stop(); });

    shikiForTmdb(card, function (entry) {
      Lampa.Loading.stop();

      var list = entry.seasons || [];

      if (list.length > 1) {
        Lampa.Select.show({
          title: 'Какой сезон?',
          items: list.map(function (s, i) { return { title: (s.season || i + 1) + ' сезон — ' + (s.russian || s.name), subtitle: (s.aired || '').slice(0, 4) + (s.episodes ? ' · ' + s.episodes + ' сер.' : ''), s: s }; }),
          onBack: function () { Lampa.Controller.toggle(enabled); },
          onSelect: function (a) { statusMenu(a.s, a.s.russian || a.s.name, enabled); }
        });
      } else statusMenu({ id: entry.id, episodes: entry.episodes }, card.name || card.title, enabled);
    }, function () {
      Lampa.Loading.stop();
      Lampa.Noty.show('Shikimori: не нашёл этот тайтл');
    });
  }

  // Пункт «Shikimori» в меню карточки (долгое OK) и в «Закладках» на странице фильма
  var long_press = { el: null, at: 0 };

  function menuCard(params) {
    var items = params && params.items;

    if (!items || !items.some(function (a) { return a.checkbox && (a.where === 'history' || a.type === 'history'); })) return null;

    if (params.title === Lampa.Lang.translate('title_action')) {
      if (Date.now() - long_press.at > 3000) return null;

      for (var el = long_press.el; el && el !== document.body; el = el.parentNode) {
        if (el.card_data && el.card_data.id) return el.card_data;
      }

      return null;
    }

    var act = Lampa.Activity.active && Lampa.Activity.active();

    return act && act.card && act.card.id ? act.card : null;
  }

  function initCardMenu() {
    document.addEventListener('hover:long', function (e) {
      long_press.el = e.target;
      long_press.at = Date.now();
    }, true);

    var show = Lampa.Select.show;

    Lampa.Select.show = function (params) {
      try {
        var card = menuCard(params);

        if (card && loggedIn() && (card.shiki || isAnimeMovie(card))) {
          var enabled = Lampa.Controller.enabled().name;

          params.items.unshift({
            title: 'Shikimori: статус в списке',
            subtitle: 'Запланировано, смотрю, просмотрено…',
            onSelect: function () { cardStatus(card, enabled); }
          });
        }
      } catch (e) {
        console.log('Anime', 'card menu', e);
      }

      return show.apply(this, arguments);
    };
  }

  // ---------------------------------------------------------------------------
  // Просмотренные серии → Shikimori. tv.js сообщает, сколько серий каждого сезона досмотрено
  // (в нумерации раздач); число серий в списке Shikimori только растёт, последняя — «Просмотрено»
  // ---------------------------------------------------------------------------

  var progress_jobs = [];
  var progress_busy = false;

  function initProgress() {
    Lampa.Listener.follow('tvt_progress', function (e) {
      if (!loggedIn() || !field('tva_progress', true) || !e.movie || !isAnimeMovie(e.movie)) return;

      var sent = readJson('tva_sent');

      e.seasons.forEach(function (s) {
        var key = e.movie.id + ':' + s.season;

        if (s.watched > 0 && s.watched > (sent[key] || 0)) {
          progress_jobs = progress_jobs.filter(function (j) { return j.key !== key; });
          progress_jobs.push({ key: key, movie: e.movie, season: s });
        }
      });

      pumpProgress();
    });
  }

  function pumpProgress() {
    if (progress_busy || !progress_jobs.length) return;

    progress_busy = true;

    var job = progress_jobs.shift();
    var next = function () {
      progress_busy = false;
      setTimeout(pumpProgress, 500);
    };
    var mark = function (n) {
      var sent = readJson('tva_sent');

      sent[job.key] = n;
      Lampa.Storage.set('tva_sent', sent);
    };

    shikiForTmdb(job.movie, function (entry) {
      var parts = shikiForSeason(entry, job.season.season, job.season.air_date);
      var watched = job.season.watched;
      var offset = 0;

      if (!parts.length) return next();

      // Сезон из нескольких частей: серии раскладываем по ним по порядку
      var each = function (i) {
        var part = parts[i];

        if (!part) {
          mark(watched);
          cache = {};
          return next();
        }

        var last = i === parts.length - 1;
        var total = part.episodes || (last ? job.season.episodes - offset : 0);
        var n = Math.min(watched - offset, total || (watched - offset));

        offset += total || n;

        if (n <= 0) return each(i + 1);

        rateGet(part.id, function (rate) {
          if (rate && (rate.episodes || 0) >= n && (rate.status === 'completed' || !total || n < total)) return each(i + 1);

          var patch = { episodes: n };

          if (total && n >= total) patch.status = 'completed';
          else if (!rate || ['planned', 'on_hold', 'dropped'].indexOf(rate.status) >= 0) patch.status = 'watching';

          rateSave(part.id, rate, patch, function () {
            rateLocal(part.id, patch.status || rate.status, n, total);
            console.log('Anime', 'Shikimori: ' + (part.russian || part.name || part.id) + ' — ' + n + ' сер.');
            each(i + 1);
          }, function (status, msg) {
            console.log('Anime', 'Shikimori: не сохранилось', status, msg);
            next();
          });
        }, function () { next(); });
      };

      each(0);
    }, function () {
      mark(job.season.watched);
      next();
    });
  }

  // ---------------------------------------------------------------------------
  // Список Shikimori на устройстве: весь список одним запросом (600 тайтлов ≈ 170 КБ),
  // на устройстве — коротко { id: [статус, серий] }. Обновляется при запуске и при входе в раздел
  // не чаще раза в 15 минут, свои изменения записываются сразу. По нему — отметки на постерах.
  // ---------------------------------------------------------------------------

  var RATE_CODES = { planned: 'p', watching: 'w', rewatching: 'r', completed: 'c', on_hold: 'h', dropped: 'd' };
  var RATES_TTL = 15 * 60000;
  var rates = null;
  var rates_loading = null;
  var tmdb_index = {};

  function ratesData() {
    if (rates && rates.user === auth().user_id) return rates;

    var saved = readJson('tva_rates');

    rates = saved.user && saved.user === auth().user_id ? saved : { user: auth().user_id, t: 0, r: {}, tot: {} };

    return rates;
  }

  function ratesSave() {
    Lampa.Storage.set('tva_rates', rates);
  }

  function ratesRefresh(force, done) {
    done = done || function () {};

    if (!loggedIn()) return done(false);

    var data = ratesData();

    if (!force && Date.now() - data.t < RATES_TTL) return done(true);
    if (rates_loading) return rates_loading.push(done);

    rates_loading = [done];

    var finish = function (ok) {
      var list = rates_loading;

      rates_loading = null;
      list.forEach(function (cb) { cb(ok); });
    };

    var user = auth().user_id;
    var all = [];

    var page = function (n) {
      withToken(function (token) {
        shiki({ method: 'GET', path: '/api/v2/user_rates?user_id=' + user + '&target_type=Anime&page=' + n + '&limit=1000', token: token }, function (list) {
          list = Array.isArray(list) ? list : [];
          all = all.concat(list);

          if (list.length >= 1000 && n < 20) return page(n + 1);

          var r = {};

          all.forEach(function (x) {
            if (RATE_CODES[x.status]) r[x.target_id] = [RATE_CODES[x.status], x.episodes || 0];
          });

          rates = { user: user, t: Date.now(), r: r, tot: data.tot || {} };

          loadTotals(function () {
            ratesSave();
            buildTmdbIndex(function () {
              decorateAll();
              finish(true);
            });
          });
        }, function () { finish(false); });
      }, function () { finish(false); });
    };

    page(1);
  }

  // Сколько серий в тайтле — для «16/24» у того, что смотрю, отложил или бросил
  function loadTotals(done) {
    var ids = Object.keys(rates.r).filter(function (id) { return 'wrhd'.indexOf(rates.r[id][0]) >= 0; });
    var batch = function () {
      if (!ids.length) return done();

      var part = ids.splice(0, 50);

      gql('{ animes(ids: ' + arg(part.join(',')) + ', limit: 50, censored: false) { id episodes episodesAired } }', function (data) {
        (data.animes || []).forEach(function (a) { rates.tot[a.id] = a.episodes || a.episodesAired || 0; });
        batch();
      }, function () { done(); });
    };

    batch();
  }

  // Своё изменение (статус из меню, досмотренные серии) — сразу в список на устройстве
  function rateLocal(id, status, episodes, total) {
    if (!loggedIn()) return;

    var data = ratesData();

    if (status && RATE_CODES[status]) data.r[id] = [RATE_CODES[status], episodes || 0];
    else delete data.r[id];

    if (total) data.tot[id] = total;

    ratesSave();
    buildTmdbIndex(decorateAll);
  }

  // Карточки TMDB: id Shikimori → id TMDB по карте (те же маленькие файлы, по 6 сразу)
  function buildTmdbIndex(done) {
    var data = ratesData();
    var ids = Object.keys(data.r);
    var shards = {};

    ids.forEach(function (id) { shards[id % 100] = true; });

    var names = Object.keys(shards);
    var running = 0;
    var finished = false;

    var complete = function () {
      if (finished) return;

      finished = true;

      var index = {};
      var found = readJson('tva_map2');

      ids.forEach(function (id) {
        var m = (map_mem['m/' + ('0' + (id % 100)).slice(-2)] || {})[id];
        var key = m ? (m[0] === 'm' ? 'movie' : 'tv') + m[1] : found[id] ? found[id].method + found[id].id : '';
        var season = m ? m[2] || 1 : found[id] && found[id].season || 1;

        if (!key) return;

        (index[key] = index[key] || []).push({ id: +id, season: season, code: data.r[id][0], episodes: data.r[id][1] });
      });

      tmdb_index = index;
      done();
    };

    var next = function () {
      if (!names.length) {
        if (!running) complete();
        return;
      }

      running++;

      mapShard('m', +names.shift(), function () {
        running--;
        next();
      });
    };

    if (!names.length) return complete();

    for (var i = 0; i < 6; i++) next();
  }

  // Что показать на постере: смотрю → «16/24», отложено, просмотрено → ✓, запланировано, брошено
  function markFor(card) {
    if (!card || !rates) return null;

    var list;

    if (card.shiki) {
      var r = rates.r[card.shiki.id];

      if (!r) return null;

      list = [{ id: card.shiki.id, season: 1, code: r[0], episodes: r[1], total: card.shiki.episodes }];
    } else {
      if (!card.id || (card.source && card.source !== 'tmdb' && card.source !== 'cub')) return null;

      list = tmdb_index[(card.original_name || card.first_air_date || card.number_of_seasons || card.name && !card.title ? 'tv' : 'movie') + card.id];

      if (!list) return null;
    }

    var pick = function (codes) {
      var hit = list.filter(function (x) { return codes.indexOf(x.code) >= 0; });

      return hit.sort(function (a, b) { return b.season - a.season; })[0];
    };

    var x = pick('wr') || pick('h') || pick('c') || pick('p') || pick('d');

    if (!x) return null;

    return { code: x.code, episodes: x.episodes, total: x.total || rates.tot[x.id] || 0 };
  }

  // Отметка — один элемент: значок рисуется CSS (без картинок), число серий — текстом.
  // Ссылка на элемент хранится на карточке, поэтому повторная проверка ничего не ищет в DOM
  var marks_on = true;

  function decorate(el) {
    var m = marks_on ? markFor(el.card_data) : null;
    var code = m ? (m.code === 'r' ? 'w' : m.code) : '';
    var text = m && 'wh'.indexOf(code) >= 0 && m.episodes ? m.episodes + (m.total ? '/' + m.total : '') : '';
    var sign = code + text;

    if ((el.tva_sign || '') === sign) return;

    el.tva_sign = sign;

    if (el.tva_mark) {
      el.tva_mark.remove();
      el.tva_mark = null;
    }

    if (!code) return;

    var view = el.querySelector('.card__view');

    if (!view) return;

    var mark = document.createElement('div');

    mark.className = 'tva-mark tva-mark--' + code;

    if (text) mark.textContent = text;

    view.appendChild(mark);
    el.tva_mark = mark;
  }

  // Список поменялся — обновляем только карточки, которые уже показывались
  function decorateAll() {
    var cards = document.querySelectorAll('.card');

    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];

      if (el.card_data && (el.called_visible || el.tva_sign !== undefined)) decorate(el);
    }
  }

  // Lampa сама сообщает, когда карточка появилась на экране (событие visible, по нему же грузится
  // постер) — тогда и ставим отметку. Карточки за краем экрана не трогаем, за страницей не следим
  function initMarks() {
    marks_on = !!field('tva_marks', true);

    document.addEventListener('visible', function (e) {
      var el = e.target;

      if (rates && el && el.card_data && el.classList && el.classList.contains('card')) decorate(el);
    }, true);

    if (loggedIn()) {
      ratesData();
      buildTmdbIndex(decorateAll);
      setTimeout(function () { ratesRefresh(false); }, 8000);
    }

    // Зашли в раздел «Аниме» — освежаем список (если прошло 15 минут)
    Lampa.Listener.follow('activity', function (e) {
      if (e.type === 'start' && e.object && e.object.source === 'shikimori' && e.component === 'main') ratesRefresh(false);
    });
  }

  // ---------------------------------------------------------------------------
  // Shikimori → «Торренты TV»: при открытии сериала tv.js спрашивает, сколько серий каждого
  // сезона досмотрено по списку Shikimori, и отмечает их у себя («Продолжить» — со следующей).
  // Свежие данные одного запроса (статусы всех частей сериала сразу); одно и то же число
  // второй раз не переносится — снятая вручную отметка не вернётся
  // ---------------------------------------------------------------------------

  window.tvt_external_watched = function (movie, seasons, done) {
    if (!loggedIn() || !field('tva_import', true) || !movie || !isAnimeMovie(movie)) return done([]);

    shikiForTmdb(movie, function (entry) {
      var jobs = seasons.map(function (s) {
        return { s: s, parts: shikiForSeason(entry, s.season, s.air_date) };
      }).filter(function (j) { return j.parts.length; });

      var ids = [];

      jobs.forEach(function (j) {
        j.parts.forEach(function (p) {
          if (ids.indexOf(p.id) < 0) ids.push(p.id);
        });
      });

      if (!ids.length) return done([]);

      gql('{ animes(ids: ' + arg(ids.slice(0, 50).join(',')) + ', limit: 50, censored: false) { id episodes episodesAired userRate { status episodes } } }', function (data) {
        var by = {};

        (data.animes || []).forEach(function (a) {
          by[a.id] = a;

          var ur = a.userRate;

          if (ur && RATE_CODES[ur.status]) rateTouch(+a.id, ur.status, ur.episodes, a.episodes || a.episodesAired);
        });

        var pulled = readJson('tva_pulled');
        var sent = readJson('tva_sent');
        var out = [];

        jobs.forEach(function (j) {
          var watched = 0;

          for (var i = 0; i < j.parts.length; i++) {
            var a = by[j.parts[i].id];
            var ur = a && a.userRate;
            var total = a && (a.episodes || a.episodesAired) || j.parts[i].episodes || 0;

            if (!ur) break;

            // Просмотрено или пересматриваю — часть досмотрена целиком
            if ((ur.status === 'completed' || ur.status === 'rewatching') && total) {
              watched += total;
              continue;
            }

            watched += ur.episodes || 0;
            break;
          }

          watched = Math.min(watched, j.s.episodes || watched);

          var key = movie.id + ':' + j.s.season;

          if (watched > (pulled[key] || 0) && watched > (j.s.watched || 0)) out.push({ season: j.s.season, watched: watched });

          if (watched > 0) {
            pulled[key] = Math.max(pulled[key] || 0, watched);
            sent[key] = Math.max(sent[key] || 0, watched);
          }
        });

        Lampa.Storage.set('tva_pulled', pulled);
        Lampa.Storage.set('tva_sent', sent);

        if (changed_rates) {
          changed_rates = false;
          ratesSave();
          buildTmdbIndex(decorateAll);
        }

        done(out);
      }, function () { done([]); }, { auth: true, fresh: true, priority: true });
    }, function () { done([]); });
  };

  var changed_rates = false;

  // Статус тайтла с сервера — поправить список на устройстве без записи на диск каждого
  function rateTouch(id, status, episodes, total) {
    var data = ratesData();
    var cur = data.r[id];
    var code = RATE_CODES[status];

    if (!cur || cur[0] !== code || cur[1] !== (episodes || 0)) {
      data.r[id] = [code, episodes || 0];
      changed_rates = true;
    }

    if (total && data.tot[id] !== total) {
      data.tot[id] = total;
      changed_rates = true;
    }
  }

  // ---------------------------------------------------------------------------
  // «Ещё» в заголовке строки: в Lampa на него можно нажать только мышью или пальцем —
  // в разделе «Аниме» до него теперь доходит и пульт: вверх с карточек строки
  // ---------------------------------------------------------------------------

  function initLineMore() {
    var add = Lampa.Controller.add;

    Lampa.Controller.add = function (name, ctrl) {
      try {
        if (name === 'items_line' && ctrl && ctrl.link) patchLine(ctrl);
      } catch (e) {
        console.log('Anime', 'line more', e);
      }

      return add.apply(this, arguments);
    };
  }

  function patchLine(ctrl) {
    var act = Lampa.Activity.active && Lampa.Activity.active();

    if (!act || act.source !== 'shikimori') return;

    var link = ctrl.link;
    var root = link.render ? link.render(true) : link.html;

    root = root && root.jquery ? root[0] : root;

    if (!root || !root.querySelector) return;

    var on_button = false;
    var last_card = null;
    var button = function () { return root.querySelector('.items-line__head .items-line__more'); };
    var body = function () { return root.querySelector('.items-line__body') || root; };

    var back = function () {
      on_button = false;
      Lampa.Controller.collectionFocus(last_card && last_card.offsetParent !== null ? last_card : false, body());
    };

    var wrap = function (key, fn) {
      var orig = ctrl[key];

      ctrl[key] = function () {
        if (fn.apply(this, arguments) === false && orig) return orig.apply(this, arguments);
      };
    };

    wrap('toggle', function () {
      on_button = false;
      return false;
    });

    wrap('up', function () {
      var b = button();

      if (on_button || !b || b.offsetParent === null) {
        on_button = false;
        return false;
      }

      last_card = body().querySelector('.selector.focus') || null;
      on_button = true;
      Lampa.Controller.collectionAppend(b);
      Lampa.Controller.collectionFocus(b, root);
    });

    wrap('down', function () {
      if (!on_button) return false;
      back();
    });

    wrap('left', function () {
      if (!on_button) return false;
      back();
    });

    wrap('right', function () {
      if (!on_button) return false;
    });
  }

  // ---------------------------------------------------------------------------
  // Настройки
  // ---------------------------------------------------------------------------

  function statusText() {
    var a = auth();

    if (a.refresh_token && a.user_id) return 'Вход выполнен: ' + (a.nickname || a.user_id);

    return 'Вход не выполнен';
  }

  function ratesText() {
    if (!loggedIn()) return 'После входа';

    var data = ratesData();
    var n = Object.keys(data.r).length;

    if (!data.t) return 'Ещё не загружен';

    var d = new Date(data.t);

    return n + ' тайтлов, обновлён в ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function updateStatus() {
    $('.tva-status').text(statusText());
  }

  function maskSecret(v) {
    v = (v || '') + '';

    return v ? '•••• ' + v.slice(-4) : 'не указан';
  }

  function shortKey(v) {
    v = (v || '') + '';

    return v ? v.slice(0, 6) + '…' + v.slice(-4) : 'не указан';
  }

  function updateKeysDescr() {
    $('[data-name="tva_client_id_edit"] .settings-param__descr').text(shortKey(field('tva_client_id', '')));
    $('[data-name="tva_client_secret_edit"] .settings-param__descr').text(maskSecret(field('tva_client_secret', '')));
  }

  function initSettings() {
    Lampa.SettingsApi.addComponent({
      component: 'tva_anime',
      name: 'Аниме (Shikimori)',
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l2.6 5.6L20.5 9l-4.4 4.1 1.2 6L12 16.2 6.7 19.1l1.2-6L3.5 9l5.9-.4L12 3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_status', type: 'title' },
      field: { name: 'Shikimori' },
      onRender: function (item) {
        item.find('.settings-param-title span, .settings-param-title').first().after($('<div class="tva-status settings-param__descr"></div>').text(statusText()));
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_help', type: 'static' },
      field: {
        name: 'Как подключить',
        description: 'Один раз: shikimori.io → Настройки → Приложения → создать. Название — как в поле ниже, Redirect URI — urn:ietf:wg:oauth:2.0:oob, права — user_rates. Затем «Войти в Shikimori»: ключи и код вставляются на телефоне через ваш репозиторий синхронизации на GitHub, на ТВ ничего вводить не нужно. Вход появится на остальных устройствах сам.'
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_app_name', type: 'input', values: '', default: 'Lampa Anime', placeholder: 'Lampa Anime' },
      field: { name: 'Название приложения', description: 'Как назвали приложение на Shikimori' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_keys_phone', type: 'button' },
      field: { name: 'Ключи с телефона', description: 'QR-код → GitHub на телефоне → вставить Client ID и Secret. Вводить на ТВ ничего не нужно' },
      onChange: function () { phoneKeys(); }
    });

    // Запасной путь — системная клавиатура (у полей Lampa своя клавиатура, в неё не вставить с телефона)
    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_client_id_edit', type: 'button' },
      field: { name: 'Client ID', description: shortKey(field('tva_client_id', '')) },
      onChange: function () {
        Lampa.Input.edit({ title: 'Client ID', value: field('tva_client_id', '') + '', free: true, nosave: true, keyboard: 'system' }, function (v) {
          v = (v || '').trim();

          if (!v) return;

          Lampa.Storage.set('tva_client_id', v);
          updateKeysDescr();
        });
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_client_secret_edit', type: 'button' },
      field: { name: 'Client Secret', description: maskSecret(field('tva_client_secret', '')) },
      onChange: function () {
        Lampa.Input.edit({ title: 'Client Secret', value: '', free: true, nosave: true, keyboard: 'system' }, function (v) {
          v = (v || '').trim();

          if (!v) return;

          Lampa.Storage.set('tva_client_secret', v);
          updateKeysDescr();
        });
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_login', type: 'button' },
      field: { name: 'Войти в Shikimori', description: 'QR-код для телефона, затем код от Shikimori' },
      onChange: login
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_pull', type: 'button' },
      field: { name: 'Взять вход с другого устройства', description: 'Из репозитория синхронизации «Торренты TV»' },
      onChange: function () { pullAuth(true); }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_progress', type: 'trigger', default: true },
      field: { name: 'Отмечать серии на Shikimori', description: 'Досмотренные серии и «Просмотрено» после последней — в ваш список' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_import', type: 'trigger', default: true },
      field: { name: 'Брать серии из Shikimori', description: 'При открытии сериала в «Торренты TV» серии, отмеченные на Shikimori, отмечаются просмотренными, «Продолжить» — со следующей' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_marks', type: 'trigger', default: true },
      field: { name: 'Отметки на постерах', description: '✓ — просмотрено, ▶ 16/24 — смотрю, а также отложено, запланировано, брошено' },
      onChange: function () {
        setTimeout(function () {
          marks_on = !!field('tva_marks', true);
          decorateAll();
        }, 100);
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_rates_now', type: 'button' },
      field: { name: 'Обновить список Shikimori', description: ratesText() },
      onChange: function () {
        $('[data-name="tva_rates_now"] .settings-param__descr').text('Загружаю…');
        ratesRefresh(true, function (ok) {
          $('[data-name="tva_rates_now"] .settings-param__descr').text(ok ? ratesText() : 'Не получилось загрузить список');
        });
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'tva_anime',
      param: { name: 'tva_logout', type: 'button' },
      field: { name: 'Выйти на этом устройстве' },
      onChange: logout
    });
  }

  function initStyle() {
    $('head').append('<style>' +
      '.tva-login{display:flex;gap:1.5em;align-items:flex-start;flex-wrap:wrap}' +
      '.tva-login__qr{background:#fff;padding:.6em;border-radius:.5em;min-width:240px;min-height:240px}' +
      '.tva-login__text{flex:1;min-width:14em;font-size:1.1em;line-height:1.4}' +
      '.tva-login__url{width:100%;font-size:.8em;opacity:.6;word-break:break-all}' +
      '.rate--shiki>div:first-child{color:#73b6ff}' +
      '.tva-mark{position:absolute;top:.5em;right:.5em;z-index:2;display:flex;align-items:center;height:1.5em;min-width:1.5em;padding:0 .4em;box-sizing:border-box;justify-content:center;border-radius:.4em;background:#3a3f4a;color:#fff;font-size:.9em;font-weight:700;line-height:1}' +
      '.tva-mark::before{content:"";display:block;flex-shrink:0}' +
      '.tva-mark:not(:empty)::before{margin-right:.3em}' +
      '.tva-mark--c{background:#2e9d4c}' +
      '.tva-mark--c::before{width:.3em;height:.6em;margin-top:-.15em;border:solid #fff;border-width:0 .17em .17em 0;transform:rotate(45deg)}' +
      '.tva-mark--w{background:#2f7de1}' +
      '.tva-mark--w::before{border-left:.5em solid #fff;border-top:.32em solid transparent;border-bottom:.32em solid transparent}' +
      '.tva-mark--h{background:#c7861b}' +
      '.tva-mark--h::before{width:.16em;height:.6em;border-left:.17em solid #fff;border-right:.17em solid #fff}' +
      '.tva-mark--p::before{width:0;height:.42em;border:solid #fff;border-width:0 .27em .27em;border-bottom-color:transparent}' +
      '.tva-mark--d{background:#5a5a5a}' +
      '.tva-mark--d::before{content:"\\00d7";font-size:1.4em;font-weight:400;line-height:.7}' +
      '</style>');
  }

  function start() {
    if (window.tva_plugin_started) return;
    window.tva_plugin_started = true;

    // Другой адрес Shikimori (зеркало или стенд для проверки)
    if (field('tva_host', '')) HOSTS = [field('tva_host', '')];

    Lampa.Api.sources.shikimori = Source;

    initStyle();
    initSettings();
    initMenu();
    initCatalog();
    initRating();
    initCardMenu();
    initProgress();
    initMarks();
    initLineMore();

    // Вход сделан на другом устройстве — подхватываем
    if (!loggedIn()) setTimeout(function () { pullAuth(false); }, 6000);

    console.log('Anime', 'started', VERSION);
  }

  window.tva_api = { version: VERSION, login: login, phoneKeys: phoneKeys, phoneCode: phoneCode, parseKeys: parseKeys, exchange: function (code) { exchangeCode(code, clientKeys()); }, pullAuth: pullAuth, findTmdb: findTmdb, shikiForTmdb: shikiForTmdb, shikiForSeason: shikiForSeason, baseName: baseName, gql: gql, ratesRefresh: ratesRefresh, markFor: markFor, rates: function () { return rates; }, tmdbIndex: function () { return tmdb_index; }, qrWindow: qrWindow };

  if (window.appready) start();
  else {
    Lampa.Listener.follow('app', function (e) {
      if (e.type === 'ready') start();
    });
  }
})();
