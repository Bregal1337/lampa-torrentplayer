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
    var ctx = f.partOffset(movie, it.r, paths.map(f.episodeNo).filter(Boolean));
    var bad = [];

    paths.forEach(function (path, i) {
      var ls = f.pathSeason(path) || 1;
      var le = f.episodeNo(path);
      var to = f.target(movie, it.r, path, ls, le, ctx) || { season: ls, episode: le };
      var want = [c.expect[0], c.expect[1] + i];

      if (to.season !== want[0] || to.episode !== want[1]) bad.push(path.split('/').pop() + ' → ' + to.season + 'x' + to.episode + ' (надо ' + want[0] + 'x' + want[1] + ')');
    });

    return bad.length ? bad.slice(0, 3).join('; ') + (bad.length > 3 ? ' … ещё ' + (bad.length - 3) : '') : 'ok';
  }

  function run() {
    var out = {};
    var cases = [];

    return fetch('files.json').then(function (r) { return r.json(); }).then(function (list) {
      cases = list;

      return fetch('corpus/index.json');
    }).then(function (r) { return r.json(); }).then(function (files) {
      var next = function (i) {
        if (i >= files.length) return out;

        return fetch('corpus/' + files[i]).then(function (r) { return r.json(); }).then(function (d) {
          var name = files[i].replace(/\.json$/, '');

          try {
            var built = summary(d);
            var mine = cases.filter(function (c) { return c.title === name; });

            out[name] = { how: built.how, seasons: built.seasons };

            if (mine.length) out[name].files = mine.map(function (c) { return fileCase(c, built); });
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
