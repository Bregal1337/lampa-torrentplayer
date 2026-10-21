// Runs the plugin's season and release code on every recorded title and prints a summary
// per title as JSON into #out (tests/run.py reads it and compares with tests/expect.json)
(function () {
  // [1,2,3,5,7,8] → '1-3,5,7-8'
  function ranges(list) {
    var out = [];

    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var b = a;

      while (i + 1 < list.length && list[i + 1] === b + 1) b = list[++i];
      out.push(a === b ? '' + a : a + '-' + b);
    }

    return out.join(',');
  }

  function summary(d) {
    var movie = JSON.parse(JSON.stringify(d.card));
    var data = {};

    Object.keys(d.seasons).forEach(function (n) { data[n] = { episodes: d.seasons[n] }; });

    var units = d.shiki ? tva_api.unitsFrom(d.shiki.map, d.shiki.mapped, d.shiki.entries) : null;
    var t = tvt_api.testSeasons(movie, d.rel, data, units);
    var seasons = t.list.map(function (s) {
      var rel = t.releases(s.season_number);
      var missing = [];

      for (var e = 1; e <= s.episode_count; e++) {
        if (!rel.some(function (it) { return tvt_api.coversEpisode(it, e, movie, s.season_number); })) missing.push(e);
      }

      var out = { n: s.season_number, episodes: s.episode_count, releases: rel.length };

      if (s.tmdb_season && s.tmdb_season !== s.season_number) out.tmdb = s.tmdb_season;
      if (s.parts && s.parts.length > 1) out.parts = s.parts.map(function (p) { return p.to - p.from + 1; }).join('+');
      if (missing.length) out.missing = ranges(missing);

      // ?debug: раздачи сезона, которые отсеяны по годам
      if (/debug/.test(location.search)) {
        var years = tvt_api.seasonYears(movie, s.season_number);

        out.years = years;
        out.foreign = t.items.filter(function (it) { return it.r.seasons.indexOf(s.season_number) >= 0 && rel.indexOf(it) < 0 && !tvt_api.sameTitle(it.el.Title, movie); }).map(function (it) { return it.el.Title; }).slice(0, 6);
        out.unnamed = t.list.length > 1 ? rel.filter(function (it) { return !it.r.seasons.length; }).map(function (it) { return it.el.Title; }) : [];
        out.outside = t.items.filter(function (it) {
          var sp = tvt_api.files.span(movie, it, s.season_number);

          return rel.indexOf(it) < 0 && sp && sp[0] > sp[1] && (it.r.seasons.indexOf(s.season_number) >= 0 || !it.r.seasons.length);
        }).map(function (it) { return it.el.Title; }).slice(0, 8);
        out.dropped = t.items.filter(function (it) {
          return it.r.seasons.length === 1 && it.r.seasons[0] === s.season_number && years && it.r.years.length && !it.r.years.some(function (y) { return y[1] >= years[0] - 1 && y[0] <= years[1] + 1; });
        }).map(function (it) { return it.el.Title; });
      }

      return out;
    });

    return { how: t.how, seasons: seasons, movie: movie, t: t };
  }

  function pad(n, w) {
    var s = '' + n;

    while (s.length < w) s = '0' + s;

    return s;
  }

  // Раскладка файлов раздачи по сериям экрана: tests/files.json — раздача (часть названия), шаблон
  // имени файла, номера файлов и с какой серии какого сезона они должны лечь
  function fileCase(c, built) {
    var it = built.t.items.filter(function (x) { return x.el.Title.indexOf(c.release) >= 0; })[0];

    if (!it) return 'раздача не найдена: ' + c.release;

    var movie = built.movie;
    var paths = [];

    for (var n = c.n[0]; n <= c.n[1]; n++) {
      paths.push('Release/' + c.file.replace(/\{n:0(\d)\}/, function (m, w) { return pad(n, +w); }));
    }

    var f = tvt_api.files;
    var part = f.partOffset(movie, it.r, paths.map(f.episodeNo).filter(Boolean));
    var ctx = { part: part, season: part ? 0 : f.seasonOverride(movie, it.r, paths.map(function (p) { return { s: f.pathSeason(p), e: f.episodeNo(p) }; })) };
    var bad = [];

    paths.forEach(function (path, i) {
      var fn = fileNums(path);
      var ls = fn.s;
      var le = fn.e;
      var to = f.target(movie, it.r, path, ls, le, ctx) || { season: ls, episode: le };
      var want = [c.expect[0], c.expect[1] + i];

      if (to.season !== want[0] || to.episode !== want[1]) bad.push(path.split('/').pop() + ' → ' + to.season + 'x' + to.episode + ' (надо ' + want[0] + 'x' + want[1] + ')');
    });

    return bad.length ? bad.slice(0, 3).join('; ') + (bad.length > 3 ? ' … ещё ' + (bad.length - 3) : '') : 'ok';
  }

  // Как Lampa (EpisodeParser, app.js 3.3.x) разбирает имя файла на сезон и серию — те же правила по порядку,
  // чтобы проверка видела номера, которые плагин получит от Lampa на самом деле
  var LAMPA_FILE = [[/\bs(\d+)\.?ep?(\d+)\b/i, 's', 'e'], [/\b(\d{1,2})[x\-](\d+)\b/i, 's', 'e'], [/\bs(\d{2})(\d{2,3})\b/i, 's', 'e'],
    [/season (\d+) episode (\d+)/i, 's', 'e'], [/сезон (\d+) серия (\d+)/i, 's', 'e'], [/(\d+) season (\d+) episode/i, 's', 'e'], [/(\d+) сезон (\d+) серия/i, 's', 'e'],
    [/episode (\d+)/i, 'e'], [/серия (\d+)/i, 'e'], [/(\d+) episode/i, 'e'], [/(\d+) серия/i, 'e'], [/season (\d+)/i, 's'], [/сезон (\d+)/i, 's'],
    [/(\d+) season/i, 's'], [/(\d+) сезон/i, 's'], [/\bs(\d+)\b/i, 's'], [/\bep?\.?(\d+)\b/i, 'e'], [/\b(\d{1,3}) of (\d+)/i, 'e'], [/\b(\d{1,3}) из (\d+)/i, 'e'],
    [/ - (\d{1,3})\b/i, 'e'], [/\[(\d{1,3})\]/i, 'e'], [/(\d+) сер/i, 'e']];
  var LAMPA_FOLDER = [[/season (\d+)/i, 's'], [/сезон (\d+)/i, 's'], [/(\d+) season/i, 's'], [/(\d+) сезон/i, 's'], [/\bs(\d+)\b/i, 's']];

  function lampaParse(path) {
    var out = { s: null, e: null };
    var parts = path.replace(/_/g, ' ').split('/');
    var name = parts.pop();
    var folder = parts.pop();
    var apply = function (list, text) {
      list.forEach(function (x) {
        var m = text.match(x[0]);

        if (m) x.slice(1).forEach(function (k, i) { if (m[i + 1] && out[k] == null) out[k] = parseInt(m[i + 1], 10); });
      });
    };

    apply(LAMPA_FILE, name);

    if (folder && out.s == null) apply(LAMPA_FOLDER, folder);
    if (out.s == null) out.s = 1;

    if (out.e == null) {
      var m = name.trim().match(/^(\d{1,3})\b/);

      out.e = m ? +m[1] : 0;
    }

    return out;
  }

  // Номера файла так, как их получит плагин: от Lampa, а если Lampa номера не нашла — свой разбор (initSplit)
  function fileNums(path) {
    var lp = lampaParse(path);

    return { s: lp.s, e: lp.e || tvt_api.files.episodeNo(path), lampa: lp.e };
  }

  var VIDEO = /\.(mkv|mp4|avi|m4v|mov|ts|m2ts|webm|wmv|mpg|mpeg|flv)$/i;

  // Настоящие списки файлов (tests/files_real, их собирает record_files.py): для каждой раздачи, которую
  // экран предлагает в сезоне, — сколько из заявленных в её названии серий нашлось среди её файлов.
  // Меньше 80% — раздача и раскладка файлов расходятся (так «Блич» 2×48 открывался «нет в раздаче»)
  function realFiles(real, built) {
    var movie = built.movie;
    var f = tvt_api.files;
    var bad = [];
    var checked = 0;

    built.t.list.forEach(function (season) {
      var n = season.season_number;

      built.t.releases(n).forEach(function (it) {
        var rec = real[it.el.id];

        if (!rec) return;

        var videos = rec.files.map(function (x) { return x[0]; }).filter(function (p) { return VIDEO.test(p); });

        if (!videos.length) return;

        var part = f.partOffset(movie, it.r, videos.map(f.episodeNo).filter(Boolean));
        var ctx = { part: part, season: part ? 0 : f.seasonOverride(movie, it.r, videos.map(function (p) { return { s: f.pathSeason(p), e: f.episodeNo(p) }; })) };
        var got = {};

        videos.forEach(function (p) {
          var fn = fileNums(p);
          var ls = fn.s;
          var le = fn.e;
          var to = f.target(movie, it.r, p, ls, le, ctx) || { season: ls, episode: le };

          if (to.season === n) got[to.episode] = true;
        });

        var span = f.span(movie, it, n) || [1, season.episode_count];
        var claimed = 0;
        var found = 0;

        for (var e = Math.max(1, span[0]); e <= Math.min(span[1], season.episode_count); e++) {
          claimed++;
          if (got[e]) found++;
        }

        // Раздача, у которой серий меньше, чем заявлено («1-24 из 24», а файлов 20), — не ошибка раскладки
        if (claimed > videos.length) claimed = videos.length;

        checked++;

        if (claimed && found < claimed * 0.8) bad.push(n + ' сезон, ' + found + ' из ' + claimed + ': ' + it.el.Title.slice(0, 90) + ' | ' + videos[0].split('/').pop().slice(0, 70));
      });
    });

    return { checked: checked, bad: bad };
  }

  function run() {
    var out = {};
    var cases = [];
    var real = {};

    return fetch('files.json').then(function (r) { return r.json(); }).then(function (list) {
      cases = list;

      return fetch('corpus/index.json');
    }).then(function (r) { return r.json(); }).then(function (files) {
      var next = function (i) {
        if (i >= files.length) return out;

        var name0 = files[i].replace(/\.json$/, '');

        return fetch('files_real/' + files[i]).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; }).then(function (fr) {
          if (fr) real[name0] = fr;

          return fetch('corpus/' + files[i]);
        }).then(function (r) { return r.json(); }).then(function (d) {
          var name = files[i].replace(/\.json$/, '');

          try {
            var built = summary(d);
            var mine = cases.filter(function (c) { return c.title === name; });

            out[name] = { how: built.how, seasons: built.seasons };

            if (mine.length) out[name].files = mine.map(function (c) { return fileCase(c, built); });
            if (real[name]) out[name].real = realFiles(real[name], built);
          } catch (e) {
            out[name] = { error: String(e && e.stack || e) };
          }

          return next(i + 1);
        });
      };

      return next(0);
    });
  }

  run().then(function (out) {
    document.getElementById('out').textContent = JSON.stringify(out);
  }, function (e) {
    document.getElementById('out').textContent = JSON.stringify({ error: String(e && e.stack || e) });
  });
})();
