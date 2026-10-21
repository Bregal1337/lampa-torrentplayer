// Торренты TV — удобный для пульта экран торрентов для Lampa
// Экран фильма и сериала: сезоны, серии с превью из TMDB и прогрессом, «Продолжить» с места остановки,
// выбор озвучки и качества. Список раздач: быстрые фильтры, умная сортировка, компактные карточки.
(function () {
  'use strict';

  if (window.tvt_plugin_ready) return;
  window.tvt_plugin_ready = true;

  var VERSION = '1.15.4';

  // ---------------------------------------------------------------------------
  // Разбор названия раздачи
  // ---------------------------------------------------------------------------

  var STUDIOS = [
    ['LostFilm', ['lostfilm', 'lost film', 'лостфильм']],
    ['HDRezka', ['hdrezka', 'hd rezka', 'rezka studio', 'резка']],
    ['NewStudio', ['newstudio', 'new studio']],
    ['Jaskier', ['jaskier']],
    ['AlexFilm', ['alexfilm', 'alex film']],
    ['TVShows', ['tvshows', 'tv shows']],
    ['Кубик в Кубе', ['кубик в кубе', 'kubik v kube', 'kubikvkube']],
    ['Red Head Sound', ['red head sound', 'redheadsound', 'rhs']],
    ['Пифагор', ['пифагор', 'pifagor']],
    ['Невафильм', ['невафильм', 'nevafilm']],
    ['SDI Media', ['sdi media', 'sdimedia']],
    ['Iyuno', ['iyuno']],
    ['Movie Dubbing', ['movie dubbing', 'moviedubbing']],
    ['Videofilm', ['videofilm', 'видеофильм']],
    ['NovaFilm', ['novafilm', 'новафильм']],
    ['Amedia', ['amedia', 'амедиа']],
    ['Кураж-Бамбей', ['кураж-бамбей', 'кураж бамбей', 'kurazh-bambey']],
    ['Paramount Comedy', ['paramount comedy']],
    ['BaibaKo', ['baibako']],
    ['ColdFilm', ['coldfilm']],
    ['IdeaFilm', ['ideafilm']],
    ['Ultradox', ['ultradox']],
    ['Profix Media', ['profix media', 'profixmedia']],
    ['LE-Production', ['le-production', 'le production']],
    ['SoftBox', ['softbox']],
    ['Selena', ['selena']],
    ['Кириллица', ['кириллица']],
    ['Dragon Money', ['dragon money']],
    ['AniLibria', ['anilibria', 'анилибрия']],
    ['AniDUB', ['anidub']],
    ['AniMedia', ['animedia']],
    ['SHIZA', ['shiza']],
    ['Dream Cast', ['dreamcast', 'dream cast']],
    ['StudioBand', ['studioband']],
    ['Flarrow Films', ['flarrow']],
    ['Ozz', ['ozz']],
    ['Octopus', ['octopus']],
    ['HiWay Grope', ['hiwaygrope', 'hiway grope']],
    ['RuDub', ['rudub']],
    ['Pazl Voice', ['pazl voice', 'pazlvoice']],
    ['Twister', ['twister']],
    ['GoLTFilm', ['goltfilm']],
    ['Kerob', ['kerob']],
    ['iTunes', ['itunes']],
    ['Кинопоиск HD', ['kinopoisk', 'кинопоиск']],
    ['Postmodern', ['postmodern']],
    ['Hamster Studio', ['hamster']],
    ['Netflix', ['netflix']],
    ['Позитив', ['позитив']],
    ['Мосфильм-Мастер', ['мосфильм-мастер']],
    ['СВ-Дубль', ['св-дубль', 'sv-dubl']],
    ['Гоблин', ['гоблин', 'goblin', 'пучков']],
    ['Яроцкий', ['яроцкий', 'yarotsky', 'yarotskiy', 'yarockyi', 'jarocki']],
    ['Сыендук', ['сыендук', 'syenduk']],
    ['Есарев', ['есарев', 'yesarev', 'esarev']],
    ['Володарский', ['володарский', 'volodarsky', 'volodarskiy']],
    ['Гаврилов', ['гаврилов', 'gavrilov']],
    ['Михалёв', ['михалёв', 'михалев', 'mikhalev', 'mihalev']],
    ['Живов', ['живов', 'zhivov']],
    ['Визгунов', ['визгунов', 'vizgunov']],
    ['Карцев', ['карцев', 'kartsev']],
    ['Рябов', ['рябов']],
    ['Дохалов', ['дохалов', 'dohalov', 'dokhalov']],
    ['Сербин', ['сербин', 'serbin']],
    ['Немахов', ['немахов']],
    ['Гланц', ['гланц']]
  ];

  var KNOWN_STUDIOS = {};

  STUDIOS.forEach(function (s) { KNOWN_STUDIOS[s[0]] = true; });

  var TYPE_ORDER = ['dub', 'sub', 'mvo', 'dvo', 'avo', 'vo', 'amateur', 'ukr', 'orig'];

  var TYPE_LABELS = {
    dub: 'Дубляж',
    sub: 'Оригинал + субтитры',
    mvo: 'Многоголосый',
    dvo: 'Двухголосый',
    avo: 'Авторский',
    vo: 'Одноголосый',
    amateur: 'Любительский',
    ukr: 'Украинский',
    orig: 'Без перевода'
  };

  // Сокращения из названий раздач (rutor: D, P, P2, L, A; rutracker: Dub, MVO, DVO, AVO; kinozal: ДБ, ПМ, ПД, ЛМ, АП)
  var TYPE_TOKENS = {
    'd': 'dub', 'dub': 'dub', 'дб': 'dub', 'дубляж': 'dub', 'дублированный': 'dub', 'полное дублирование': 'dub',
    'p': 'mvo', 'mvo': 'mvo', 'пм': 'mvo', 'многоголосый': 'mvo', 'профессиональный многоголосый': 'mvo',
    'p2': 'dvo', 'dvo': 'dvo', 'пд': 'dvo', 'двухголосый': 'dvo', 'профессиональный двухголосый': 'dvo',
    'a': 'avo', 'avo': 'avo', 'ап': 'avo', 'ао': 'avo', 'авторский': 'avo',
    'p1': 'vo', 'vo': 'vo', 'по': 'vo', 'одноголосый': 'vo',
    'l': 'amateur', 'l1': 'amateur', 'l2': 'amateur', 'лм': 'amateur', 'лд': 'amateur', 'ло': 'amateur', 'любительский': 'amateur',
    'ukr': 'ukr', 'укр': 'ukr', 'ua': 'ukr', 'украинский': 'ukr'
  };

  var RES_ORDER = ['4K', '1080p', '720p', 'SD'];
  var RES_RANK = { '4K': 4, '1080p': 3, '720p': 2, 'SD': 1 };
  var SOURCE_ORDER = ['Remux', 'BDRip', 'WEB-DL', 'WEBRip', 'HDTV', 'HDRip', 'DVD'];

  function isWordChar(c) {
    return !!c && /[a-z0-9а-яё]/i.test(c);
  }

  function hasWord(lower, word) {
    var i = lower.indexOf(word);

    while (i >= 0) {
      if (!isWordChar(lower.charAt(i - 1)) && !isWordChar(lower.charAt(i + word.length))) return true;
      i = lower.indexOf(word, i + 1);
    }

    return false;
  }

  // Одна и та же студия из разных трекеров пишется по-разному («1001cinema» и «1001 cinema») — сводим к одному названию
  var studio_names = {};

  function studioDisplay(name) {
    var key = name.toLowerCase().replace(/[^a-z0-9а-яё]/g, '');

    if (!key) return '';
    if (!studio_names[key]) studio_names[key] = name;

    return studio_names[key];
  }

  function studioByName(name) {
    var lower = (name || '').toLowerCase();

    for (var i = 0; i < STUDIOS.length; i++) {
      for (var j = 0; j < STUDIOS[i][1].length; j++) {
        if (hasWord(lower, STUDIOS[i][1][j])) return STUDIOS[i][0];
      }
    }

    return '';
  }

  function addUnique(arr, value) {
    if (value && arr.indexOf(value) === -1) arr.push(value);
  }

  // Сокращения, которые можно искать и внутри фразы («720p Ukr», «Dub iTunes»): они не совпадают с обычными словами
  var WORD_TOKENS = ['dub', 'mvo', 'dvo', 'avo', 'ukr', 'укр', 'дб', 'пм', 'пд', 'лм', 'лд'];

  function voiceTypesFrom(text, types) {
    var lower = text.toLowerCase();

    lower.split(/[|\/,()\[\]+;]/).forEach(function (token) {
      token = token.replace(/^\s*\d+\s*[xх]\s*/, '').trim();

      if (TYPE_TOKENS[token]) addUnique(types, TYPE_TOKENS[token]);
      else {
        token.split(/\s+/).forEach(function (word) {
          if (WORD_TOKENS.indexOf(word) >= 0) addUnique(types, TYPE_TOKENS[word]);
        });
      }
    });

    if (lower.indexOf('дубляж') >= 0 || lower.indexOf('дублирован') >= 0) addUnique(types, 'dub');
    if (lower.indexOf('многоголос') >= 0) addUnique(types, 'mvo');
    if (lower.indexOf('двухголос') >= 0) addUnique(types, 'dvo');
    if (lower.indexOf('авторск') >= 0) addUnique(types, 'avo');
    if (lower.indexOf('одноголос') >= 0) addUnique(types, 'vo');
    if (lower.indexOf('любительск') >= 0) addUnique(types, 'amateur');
  }

  // Годы из названия: «2021» → [2021, 2021], «2002-2016» → [2002, 2016]
  function parseYears(lower) {
    var out = [];
    var re = /(?:^|[^\d×xх])((?:19[2-9]|20[0-4])\d)(?:\s*[-–—]\s*((?:19[2-9]|20[0-4])\d))?(?![\dpixх×])/g;
    var m;

    while ((m = re.exec(lower))) {
      var a = parseInt(m[1], 10);
      var b = m[2] ? parseInt(m[2], 10) : a;

      out.push([Math.min(a, b), Math.max(a, b)]);
    }

    return out;
  }

  // Раздача относится к фильму этого года (годов в названии нет — считаем, что да)
  function yearMatches(r, year) {
    if (!year || !r.years || !r.years.length) return true;

    return r.years.some(function (y) { return year >= y[0] - 1 && year <= y[1] + 1; });
  }

  function parseSeasons(lower) {
    var m;
    var out = [];

    // «(1 сезон: 1-24 серии из 24)» — это серии, а не сезоны 1–24
    m = lower.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*сезон/) ||
      lower.match(/сезон[ыа]?:?\s*(\d{1,2})\s*[-–]\s*(\d{1,2})(?!\s*(?:сери|эп|из|з\s|\d))/) ||
      // «S01-S03», «S01-03», но не «S2 - 10» (10-я серия 2 сезона)
      lower.match(/\bs(\d{1,2})\s*[-–]\s*s(\d{1,2})\b/) ||
      lower.match(/\bs(\d{1,2})[-–](\d{1,2})\b/) ||
      lower.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})x\d{2,3}\b/) ||
      lower.match(/seasons?\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/);

    if (m) {
      var from = parseInt(m[1], 10);
      var to = parseInt(m[2], 10);

      if (to >= from && to - from < 40) {
        for (var i = from; i <= to; i++) out.push(i);
      }

      return out;
    }

    // Аниме: «[ТВ-2]», «TV-3», «[02x01-06 из 23]», «2nd Season»
    m = lower.match(/(\d{1,2})\s*сезон/) ||
      lower.match(/сезон[ыа]?:?\s*(\d{1,2})/) ||
      lower.match(/\bs(\d{1,2})(?:e\d{1,3})?\b/) ||
      lower.match(/season\s*(\d{1,2})/) ||
      lower.match(/(\d{1,2})(?:st|nd|rd|th)\s*season/) ||
      lower.match(/(?:^|[^a-zа-яё])(?:tv|тв)\s*-?\s*(\d{1,2})(?!\d)/) ||
      lower.match(/\b(\d{1,2})x\d{2,3}\b/);

    if (m) out.push(parseInt(m[1], 10));

    return out;
  }

  // Сколько серий в сезоне по словам раздачи: «1-24 серии из 24», «(23 из 23)», «[02x01-06 из 23]»,
  // «Серій 6 з 12», «[2023, TV, 11 эп.]». Часть сезона («Часть 1: 1-13 из 13») не считаем — это не весь сезон,
  // а «Части 1-2» — весь
  function parseTotal(lower) {
    var clean = lower.replace(/\+\s*(спешл|спэшл|special|ova|sp)\S*/g, '');

    if (/(?:част[ьиа]|частина|part|cour)\s*\d+(?!\s*[-–]\s*\d)|фильм|movie|\bova\b|спешл|спэшл/.test(clean)) return 0;

    var m = lower.match(/(\d{1,4})\s*(?:[а-яё.]+\s*)?(?:из|з|of)\s*(\d{1,4})(?!\d|\s*(?:том|глав))/) ||
      lower.match(/\btv,\s*(\d{1,4})\s*(?:эп|ep)/) ||
      lower.match(/\bтв,\s*(\d{1,4})\s*эп/);

    if (!m) return 0;

    var total = parseInt(m[2] || m[1], 10);

    return total > 0 && total <= 400 ? total : 0;
  }

  function parseEpisodes(lower) {
    var m = lower.match(/(\d{1,4}\s*[-–]\s*\d{1,4})\s*(?:серии|серия|эпизоды)?\s*из\s*(\d{1,4})/) ||
      lower.match(/серии:?\s*(\d{1,4}\s*[-–]\s*\d{1,4})/);

    if (!m) return '';

    return 'Серии ' + m[1].replace(/\s+/g, '').replace('-', '–') + (m[2] ? ' из ' + m[2] : '');
  }

  // Диапазон серий в раздаче: «серии 1-13 из 23» → [1, 13]; «[ТВ-2, часть 4] (1—8)» → [1, 8]
  function parseEpisodeRange(lower) {
    var m = lower.match(/(\d{1,4})\s*[-–—]\s*(\d{1,4})\s*(?:серии|серия|серий|эпизоды)?\s*из\s*\d{1,4}/) ||
      lower.match(/серии:?\s*(\d{1,4})\s*[-–—]\s*(\d{1,4})/) ||
      // «(1 сезон: 208-242 серии)» — без «из»
      lower.match(/(\d{1,4})\s*[-–—]\s*(\d{1,4})\s*(?:серии|серия|серий|эпизоды)(?![а-яё])/) ||
      lower.match(/\d{1,2}x(\d{1,3})\s*[-–—]\s*(\d{1,3})/) ||
      lower.match(/\be(\d{1,3})\s*[-–—]\s*e?(\d{1,3})\b/) ||
      lower.match(/\((\d{1,3})\s*[-–—]\s*(\d{1,3})\)/) ||
      // «One Piece [1061-1118]», «[1021-1060 +3SP]», но не годы «[2022-2024]»
      lower.match(/\[(\d{1,4})\s*[-–—]\s*(\d{1,4})(?:\s*\+[^\]]*)?\]/);

    if (!m) return null;

    var from = parseInt(m[1], 10);
    var to = parseInt(m[2], 10);

    if (from >= 1900 && from <= 2100) return null;

    return to >= from ? [from, to] : null;
  }

  // Части сезона: «2 сезон: Часть 2», «[ТВ-2, часть 3]», «Части 1-3», «Season 3 Part 2», «2nd Cour» → [с, по]
  function parseParts(lower) {
    var m = lower.match(/част[иь]\s*(\d{1,2})\s*[-–—]\s*(\d{1,2})(?!\d)/) ||
      lower.match(/\bparts?\s*(\d{1,2})\s*[-–—]\s*(\d{1,2})\b/);

    if (m && +m[2] >= +m[1]) return [+m[1], +m[2]];

    m = lower.match(/част[ьи]\s*(\d{1,2})(?!\d)/) ||
      lower.match(/(?:^|[^\d])(\d{1,2})\s*[-–]?\s*(?:я\s+)?часть/) ||
      lower.match(/\bpart\s*(\d{1,2})\b/) ||
      lower.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+(?:part|cour)\b/) ||
      lower.match(/\bcour\s*(\d{1,2})\b/);

    return m && +m[1] > 0 ? [+m[1], +m[1]] : null;
  }

  // Слова в названиях звуковых дорожек, которые не являются студией
  var TRACK_SKIP = /^(original|оригинал\S*|orig|rus|russian|русский|eng|english|английский|ukr|ukrainian|украинский|full|forced|sdh|sub|subs|subtitles|default|stereo|mono|dub|dubbing|mvo|dvo|avo|vo|дубляж|дублированный|многоголосый|двухголосый|одноголосый|авторский|любительский|закадровый|профессиональный.*|dolby.*|dts.*|ac-?3.*|e-?ac-?3.*|aac.*|flac.*|truehd.*|atmos.*|opus.*|pcm.*|lpcm.*|director.*|commentary|коммент.*|\d.*|.)$/i;

  var TRACK_JUNK = /@|kbps|\bdd\+?\b|\bdts\b|\d[.,]\d|^(bd|3d|ger|amzn|nf|hdr|sdr|track|fixed|surround|compatibility.*|descriptive.*|audio description|license|лицензия|ліцензія|студия|студія|studio|english.*|russian.*|ukrainian.*|перевод|переклад|озвучка|озвучування|russia|ukraine|для|на заказ|на замовлен.*|original.*|.*-)$|\d/i;

  function capitalize(s) {
    return s.replace(/(^|\s)(\S)/g, function (m, sp, c) { return sp + c.toUpperCase(); });
  }

  // Часть названия дорожки → имя студии или '' (технические слова, инициалы, смесь латиницы и кириллицы отбрасываем)
  function cleanTrackPart(part) {
    part = part.trim()
      .replace(/^(rus|russian|ukr|ukrainian|eng|english)\s+/i, '')
      .replace(/^(mvo|dvo|avo|vo|dub|дубляж)\s+/i, '')
      .replace(/^(студия|студія|studio)\s+/i, '')
      .replace(/^([a-zа-яё]{1,2}\.\s*)+/i, '')
      .trim();

    if (part.length < 3 || TRACK_SKIP.test(part) || TRACK_JUNK.test(part) || TYPE_TOKENS[part]) return '';
    if (/[a-z]/i.test(part) && /[а-яё]/i.test(part)) return '';
    if (part.split(/\s+/).length > 3) return '';

    return part;
  }

  function parseDuration(str) {
    var m = (str || '').match(/^(\d+):(\d+):(\d+)/);

    return m ? parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) : 0;
  }

  // ffprobe из JacRed: реальные дорожки раздачи (язык, название озвучки), разрешение и кодек
  function applyFfprobe(streams, r) {
    var max_channels = 0;
    var video = null;

    streams.forEach(function (s) {
      var tags = s.tags || {};
      var title = (tags.title || '').trim();
      var lang = (tags.language || '').toLowerCase();

      if (s.codec_type === 'video') {
        if (!video && s.width && s.codec_name !== 'mjpeg' && s.codec_name !== 'png') video = s;
      } else if (s.codec_type === 'audio') {
        if (s.channels > max_channels) max_channels = s.channels;

        var track = (title || (lang && lang !== 'und' ? lang.toUpperCase() : '')) + (s.channels >= 6 ? ' ' + (s.channels >= 8 ? '7.1' : '5.1') : '');

        if (title || (lang && lang !== 'und')) addUnique(r.tracks, track.trim());
        if (lang === 'ukr' || lang === 'uk') addUnique(r.types, 'ukr');
        if (lang && ['rus', 'ru', 'ukr', 'uk', 'und'].indexOf(lang) < 0) r.orig_audio = true;
        if (!title || /коммент|comment/i.test(title)) return;

        voiceTypesFrom(title, r.types);

        // Сначала известные студии (их названия вырезаем, чтобы «Кураж-Бамбей» не распался на части),
        // затем остаток дорожки — как неизвестная студия, если это похоже на название
        var rest = title.toLowerCase();

        STUDIOS.forEach(function (st) {
          st[1].forEach(function (alias) {
            if (hasWord(rest, alias)) {
              addUnique(r.studios, st[0]);
              rest = rest.split(alias).join(' | ');
            }
          });
        });

        rest.split(/[\[\]()|\/,:;«»"_+]+|\s[-–]\s/).forEach(function (part) {
          part = cleanTrackPart(part);

          if (!part) return;

          var types = [];

          voiceTypesFrom(part, types);

          if (!types.length) addUnique(r.studios, studioDisplay(capitalize(part)));
        });
      } else if (s.codec_type === 'subtitle' && (lang === 'rus' || lang === 'ru')) {
        r.rus_subs = true;
      }
    });

    if (video) {
      var w = video.width;

      r.res = w >= 3200 ? '4K' : w >= 1800 ? '1080p' : w >= 1200 ? '720p' : 'SD';

      if (!r.hdr && video.color_transfer === 'smpte2084') r.hdr = 'HDR';
      if (video.codec_name === 'hevc') r.codec = 'HEVC';
      else if (video.codec_name === 'h264') r.codec = 'AVC';
      else if (video.codec_name === 'av1') r.codec = 'AV1';

      r.duration = parseDuration((video.tags || {}).DURATION) || parseInt(video.duration, 10) || 0;
    }

    r.channels = max_channels >= 8 ? '7.1' : max_channels >= 6 ? '5.1' : '';
  }

  // Русские субтитры и оригинальная дорожка по названию раздачи: «Original + Sub Rus», «JAP+Sub»,
  // «RAW+Rus Sub», «субтитры». «SubsPlease» (группа английских сабов) и «Sub Eng/Ukr» не считаются
  function subsFromTitle(lower, r) {
    lower = lower.replace(/subsplease/g, ' ');

    var rus = /sub\s*rus|rus\s*sub|субтитр|(?:\+|,)\s*sub\b(?!\s*(?:eng|ukr|en\b|ua\b|\/))/.test(lower);

    if (rus) r.rus_subs = true;
    if (/original|оригинал|\b(?:jap|jpn|raw)\b/.test(lower)) r.orig_audio = true;

    // kinozal: «СТ» в списке переводов — русские субтитры к оригинальной дорожке
    if (lower.split(/[|\/,()\[\]+;]/).some(function (t) { return t.trim() === 'ст'; })) {
      r.rus_subs = true;
      r.orig_audio = true;
    }
  }

  // «Cyberpunk: Edgerunners 2 / Киберпанк: Бегущие по краю 2 [TV] [10 из 10]»: сезона в названии нет,
  // но сразу после названия сериала стоит номер — это N-й сезон, если у сериала столько сезонов
  function nameSeason(title, movie) {
    var max = movie && movie.number_of_seasons || 0;

    if (max < 2) return 0;

    var norm = function (s) { return (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim(); };
    var t = ' ' + norm(title) + ' ';
    var names = [movie.name, movie.original_name, movie.title, movie.original_title].map(norm).filter(Boolean);

    for (var i = 0; i < names.length; i++) {
      var at = t.indexOf(' ' + names[i] + ' ');
      var m = at >= 0 ? /^(\d{1,2}) /.exec(t.slice(at + names[i].length + 2)) : null;

      if (m && +m[1] >= 2 && +m[1] <= max) return +m[1];
    }

    return 0;
  }

  function parseRelease(el, movie) {
    var title = el.Title || '';
    var lower = title.toLowerCase();
    var info = el.info || {};
    var r = {
      res: '',
      source: '',
      hdr: '',
      codec: '',
      cam: false,
      is3d: false,
      types: [],
      studios: [],
      seasons: [],
      tracks: [],
      episodes: ''
    };

    var q = parseInt(info.quality, 10) || 0;

    if (/2160p/.test(lower)) r.res = '4K';
    else if (/1080[pi]/.test(lower)) r.res = '1080p';
    else if (/720p/.test(lower)) r.res = '720p';
    else if (/\b(480|576|360)p/.test(lower)) r.res = 'SD';
    else if (q >= 2160 || /\b4k\b|\buhd\b/.test(lower)) r.res = '4K';
    else if (q >= 1080) r.res = '1080p';
    else if (q >= 720) r.res = '720p';
    else r.res = 'SD';

    if (/remux/.test(lower)) r.source = 'Remux';
    else if (/bdrip|bd-rip|blu-?ray|\bbd\b/.test(lower)) r.source = 'BDRip';
    else if (/web-?dl(?!-?rip)/.test(lower)) r.source = 'WEB-DL';
    else if (/web-?dl-?rip|web-?rip/.test(lower)) r.source = 'WEBRip';
    else if (/hdtv/.test(lower)) r.source = 'HDTV';
    else if (/hdrip/.test(lower)) r.source = 'HDRip';
    else if (/dvd/.test(lower)) r.source = 'DVD';

    r.cam = /\b(cam|camrip|ts|tc|telesynch?|telecine|hdts|tsrip|ts-rip|hdcam)\b/.test(lower) || lower.indexOf('экранка') >= 0;
    r.is3d = /\b3d\b/.test(lower) && !/\b2d\b/.test(lower);
    r.years = parseYears(lower);
    // Сборник фильмов (коллекция, трилогия, «6 x Blu-ray»)
    r.pack = /коллекци|collection|антологи|anthology|трилоги|trilogy|квадрологи|quadrilogy|тетралоги|пенталоги|гексалоги|сага\b|saga\b|все части|\b\d+\s*[xх]\s*(blu-?ray|bd|dvd|web|bdrip|remux)/.test(lower);
    // Образ диска (BDMV/VIDEO_TS): сотни служебных файлов, для потока не подходит
    r.disc = /bdmv|video_ts|\bbd-?(25|50|66|100)\b|\bdvd-?(5|9)\b|blu-?ray/.test(lower) && !/remux|rip/.test(lower);

    if (/dolby vision|\bdv\b|\bdovi\b/.test(lower)) r.hdr = 'DV';
    else if (/hdr10\+|hdr10plus/.test(lower)) r.hdr = 'HDR10+';
    else if (/hdr/.test(lower) || info.videotype === 'hdr') r.hdr = 'HDR';

    if (/hevc|h\.?265|x265/.test(lower)) r.codec = 'HEVC';
    else if (/\bav1\b/.test(lower)) r.codec = 'AV1';
    else if (/\bavc\b|h\.?264|x264/.test(lower)) r.codec = 'AVC';

    voiceTypesFrom(title, r.types);

    STUDIOS.forEach(function (s) {
      for (var j = 0; j < s[1].length; j++) {
        if (hasWord(lower, s[1][j])) {
          addUnique(r.studios, s[0]);
          break;
        }
      }
    });

    if (info.voices && info.voices.length) {
      info.voices.forEach(function (v) {
        var types = [];

        if (/субтитр|^\s*sub/i.test(v)) {
          if (!/eng|англ|ukr|укр/i.test(v)) r.rus_subs = true;
          return;
        }

        voiceTypesFrom(v, types);

        if (types.length) types.forEach(function (t) { addUnique(r.types, t); });
        else addUnique(r.studios, studioByName(v) || studioDisplay(v.trim()));
      });
    }

    if (Array.isArray(el.ffprobe) && el.ffprobe.length) applyFfprobe(el.ffprobe, r);

    subsFromTitle(lower, r);

    // Оригинал + субтитры: дорожка на языке оригинала и русские субтитры (по ffprobe или по названию).
    // Есть ключ OpenSubtitles — подходит и раздача без субтитров, их найдём перед запуском
    if (r.orig_audio && (r.rus_subs || osReady())) addUnique(r.types, 'sub');

    if (!r.types.length && !r.studios.length && /\beng\b|original|оригинал/.test(lower)) r.types.push('orig');

    r.seasons = info.seasons && info.seasons.length ? info.seasons.map(function (s) { return parseInt(s, 10); }).filter(function (s) { return s > 0; }) : parseSeasons(lower);

    if (!r.seasons.length && movie && movie.original_name) {
      var ns = nameSeason(title, movie);

      if (ns) r.seasons = [ns];
    }
    r.total = parseTotal(lower);
    r.episodes = parseEpisodes(lower);
    r.ep_range = parseEpisodeRange(lower);
    r.parts = parseParts(lower);

    return r;
  }

  // ---------------------------------------------------------------------------
  // Вспомогательное
  // ---------------------------------------------------------------------------

  function field(name, def) {
    var v = Lampa.Storage.field(name);

    return typeof v === 'undefined' || v === null || v === '' ? def : v;
  }

  function sizeText(bytes) {
    bytes = parseInt(bytes, 10) || 0;

    if (!bytes) return '';

    var gb = bytes / 1073741824;

    if (gb >= 1) return (gb >= 100 ? Math.round(gb) : gb.toFixed(1)) + ' ГБ';

    return Math.round(bytes / 1048576) + ' МБ';
  }

  function dateText(str) {
    var d = new Date(str);

    if (!str || isNaN(d.getTime())) return '';

    var days = Math.floor((Date.now() - d.getTime()) / 86400000);

    if (days < 1) return 'сегодня';
    if (days < 2) return 'вчера';
    if (days < 30) return days + ' дн. назад';

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  }

  function trackerText(str) {
    var list = (str || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    if (list.length <= 2) return list.join(', ');

    return list.slice(0, 2).join(', ') + ' +' + (list.length - 2);
  }

  function trackers(str) {
    return (str || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function preferredStudios() {
    var list = Lampa.Storage.get('tvt_pref_studios', '[]');

    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (e) { list = []; }
    }

    return Array.isArray(list) ? list : [];
  }

  function rememberStudio(name) {
    if (!name) return;

    var list = preferredStudios().filter(function (s) { return s !== name; });

    list.unshift(name);
    Lampa.Storage.set('tvt_pref_studios', list.slice(0, 5));
  }

  function plural(n, one, few, many) {
    var m10 = n % 10;
    var m100 = n % 100;

    if (m10 === 1 && m100 !== 11) return n + ' ' + one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return n + ' ' + few;

    return n + ' ' + many;
  }

  function releases(n) {
    return plural(n || 0, 'раздача', 'раздачи', 'раздач');
  }

  function seedsClass(n) {
    if (n >= 50) return 'good';
    if (n >= 10) return 'ok';
    if (n > 0) return 'low';
    return 'dead';
  }

  function markViewed(el) {
    var view = Lampa.Storage.cache('torrents_view', 5000, []);

    if (el.hash && view.indexOf(el.hash) === -1) {
      view.push(el.hash);
      Lampa.Storage.set('torrents_view', view);
    }

    el.viewed = true;
  }

  // Оценка раздачи для умной сортировки: качество ближе к предпочитаемому, больше раздающих, любимые озвучки
  function scoreRelease(it, prefer_single_season) {
    var r = it.r;
    var el = it.el;
    var seeds = parseInt(el.Seeders, 10) || 0;
    var pref = field('tvt_quality', '1080p');
    var s = 0;

    if (pref === 'auto') s += RES_RANK[r.res] * 8;
    else s += [40, 18, 6, 0][Math.min(3, Math.abs((RES_RANK[pref] || 3) - RES_RANK[r.res]))];

    s += Math.min(35, Math.log(1 + seeds) * 7);

    if (!seeds) s -= 30;
    if (r.cam) s -= 60;
    if (r.is3d) s -= 15;
    // Сборник фильмов и образ диска — сотни файлов и десятки гигабайт, телевизору тяжело
    if (r.pack && !r.seasons.length) s -= 50;
    if (r.disc) s -= 25;
    if (r.types.indexOf('dub') >= 0) s += 6;
    if (r.source === 'Remux' && pref !== '4K') s -= 4;

    var prefs = preferredStudios();

    for (var i = 0; i < prefs.length; i++) {
      if (r.studios.indexOf(prefs[i]) >= 0) {
        s += i === 0 ? 25 : 15;
        break;
      }
    }

    if (prefer_single_season && r.seasons.length === 1) s += 5;

    return s;
  }

  function buildSearchParams(movie) {
    var year = ((movie.first_air_date || movie.release_date || '0000') + '').slice(0, 4);
    var combinations = {
      df: movie.original_title,
      df_year: movie.original_title + ' ' + year,
      df_lg: movie.original_title + ' ' + movie.title,
      df_lg_year: movie.original_title + ' ' + movie.title + ' ' + year,
      lg: movie.title,
      lg_year: movie.title + ' ' + year,
      lg_df: movie.title + ' ' + movie.original_title,
      lg_df_year: movie.title + ' ' + movie.original_title + ' ' + year
    };

    return {
      url: '',
      title: Lampa.Lang.translate('title_torrents'),
      component: 'tvt_torrents',
      search: combinations[Lampa.Storage.field('parse_lang')] || movie.original_title || movie.title,
      search_one: movie.title,
      search_two: movie.original_title,
      movie: movie,
      page: 1
    };
  }

  // ---------------------------------------------------------------------------
  // Поиск раздач сразу в нескольких источниках: парсер из настроек Lampa,
  // поиск TorrServer (rutor) и свои Jackett/JacRed. Дубли склеиваются по хешу.
  // ---------------------------------------------------------------------------

  var MAIN_SOURCE = 'Парсер';
  var search_nets = [];

  function btih(el) {
    var m = /btih:([0-9a-z]{32,40})/i.exec(el.MagnetUri || el.Link || '');

    return m ? m[1].toLowerCase() : '';
  }

  // «http://192.168.1.5:9117|ключ, jac.example.org» → [{url, key, name}]
  function extraSources() {
    return (field('tvt_src_extra', '') + '').split(/[\s,;]+/).filter(Boolean).map(function (s) {
      var parts = s.split('|');
      var url = parts[0].replace(/\/+$/, '');

      if (!/^https?:\/\//i.test(url)) url = 'http://' + url;

      return { url: url, key: parts[1] || '', name: url.replace(/^https?:\/\//i, '') };
    });
  }

  function newNet() {
    var net = new Lampa.Reguest();

    net.timeout(1000 * (parseInt(field('parse_timeout', 15), 10) || 15));
    search_nets.push(net);

    return net;
  }

  function netGet(url, ok, err) {
    var net = newNet();

    if (net['native']) net['native'](url, ok, err);
    else net.silent(url, ok, err);
  }

  // Тот же запрос, что делает Lampa к Jackett/JacRed
  function jackettSearch(src, object, ok, err) {
    var movie = object.movie || {};
    var enc = encodeURIComponent;
    var u = src.url + '/api/v2.0/indexers/all/results?apikey=' + enc(src.key) + '&Query=' + enc(object.search || movie.title || movie.name || '');

    if (movie.id && !object.from_search) {
      var year = ((movie.first_air_date || movie.release_date || '0000') + '').slice(0, 4);

      if (!object.clarification) u += '&title=' + enc(movie.title || movie.name || '') + '&title_original=' + enc(movie.original_title || movie.original_name || '');

      u += '&year=' + enc(year) + '&is_serial=' + (movie.original_name ? 2 : 1);
      u += '&genres=' + enc((movie.genres || []).map(function (g) { return g.name; }).join(','));
      u += '&Category[]=' + (movie.number_of_seasons > 0 || movie.original_name ? 5000 : 2000);
    }

    netGet(u, function (json) {
      if (json && Array.isArray(json.Results)) ok(json.Results);
      else err('неверный ответ');
    }, function () { err('нет ответа'); });
  }

  // Ещё названия сериала, кроме карточки TMDB: названия его тайтлов на Shikimori (ромадзи, английское, русское)
  var title_names = {};

  function sameTitle(title, movie) {
    var norm = function (s) { return (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim(); };
    var t = ' ' + norm(title) + ' ';

    return [movie.title, movie.name, movie.original_title, movie.original_name].concat(title_names[movie.id] || []).some(function (n) {
      n = norm(n);

      return n && t.indexOf(' ' + n + ' ') >= 0;
    });
  }

  // Встроенный поиск TorrServer (rutor). Работает, если он включён в настройках TorrServer
  function torrserverSearch(object, ok, err) {
    var movie = object.movie || {};
    var query = object.search_one || movie.title || movie.name || object.search || '';

    netGet(Lampa.Torserver.url() + '/search/?query=' + encodeURIComponent(query), function (json) {
      if (!Array.isArray(json)) return err('поиск выключен');

      ok(json.filter(function (e) { return !movie.id || sameTitle(e.Title, movie); }).map(function (e) {
        return {
          Title: e.Title,
          Tracker: e.Tracker || 'rutor',
          Size: Lampa.Utils.sizeToBytes ? Lampa.Utils.sizeToBytes(e.Size) : parseInt(e.Size, 10) || 0,
          PublishDate: e.CreateDate,
          Seeders: parseInt(e.Seed, 10) || 0,
          Peers: parseInt(e.Peer, 10) || 0,
          MagnetUri: e.Magnet || (/^magnet:/i.test(e.Link || '') ? e.Link : ''),
          Link: e.Link
        };
      }).filter(function (el) { return el.MagnetUri || el.Link; }));
    }, function () { err('поиск выключен'); });
  }

  function mergeResults(lists) {
    var map = {};
    var out = [];

    lists.forEach(function (src) {
      if (!src) return;

      src.items.forEach(function (el) {
        var key = btih(el) || (el.Title + '|' + el.Size);
        var ex = map[key];

        if (!ex) {
          el.tvt_src = [src.name];
          map[key] = el;
          out.push(el);
          return;
        }

        if (ex.tvt_src.indexOf(src.name) === -1) ex.tvt_src.push(src.name);
        if (!ex.ffprobe && el.ffprobe) ex.ffprobe = el.ffprobe;
        if (!ex.info && el.info) ex.info = el.info;

        ex.Seeders = Math.max(parseInt(ex.Seeders, 10) || 0, parseInt(el.Seeders, 10) || 0);
        ex.Peers = Math.max(parseInt(ex.Peers, 10) || 0, parseInt(el.Peers, 10) || 0);

        var tr = trackers(ex.Tracker);

        trackers(el.Tracker).forEach(function (t) { addUnique(tr, t); });
        ex.Tracker = tr.join(', ');
      });
    });

    return out;
  }

  // Продолжения на трекерах часто названы «Название 2» («Cyberpunk: Edgerunners 2 / Киберпанк: Бегущие
  // по краю 2» на rutracker), а JacRed ищет раздачи по точному названию — на запрос с названием сериала
  // они не приходят. Для сезонов со 2-го (последних трёх вышедших) спрашиваем тот же JacRed ещё раз:
  // «Название N» и год сезона
  function seasonQueries(object) {
    var movie = object.movie || {};

    if (!movie.id || object.from_search || object.clarification || !movie.original_name) return [];
    if (!Lampa.Storage.field('parser_use') || Lampa.Storage.field('parser_torrent_type') !== 'jackett') return [];

    var url = ((Lampa.Storage.field('jackett_url') || '') + '').trim().replace(/\/+$/, '');

    if (!url) return [];
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;

    var src = { url: url, key: Lampa.Storage.field('jackett_key') || '', name: MAIN_SOURCE };
    var seasons = (movie.seasons || []).filter(function (s) { return s.season_number >= 2 && s.air_date && !isFuture(s.air_date); }).slice(-3);

    return seasons.map(function (s) {
      var n = s.season_number;
      var m = {};

      for (var k in movie) m[k] = movie[k];

      m.title = (movie.title || movie.name) + ' ' + n;
      m.name = (movie.name || movie.title) + ' ' + n;
      m.original_title = (movie.original_title || movie.original_name) + ' ' + n;
      m.original_name = (movie.original_name || movie.original_title) + ' ' + n;
      m.first_air_date = s.air_date;

      return { src: src, object: { movie: m, search: m.original_name } };
    });
  }

  // ok({Results}) — когда ответили все источники (или вышло время); fail — если не ответил ни один
  function searchReleases(object, ok, fail) {
    var tasks = [{ name: MAIN_SOURCE, run: function (done, err) {
      Lampa.Parser.get(object, function (data) { done(data && data.Results || []); }, err);
    } }];

    if (field('tvt_src_torrserver', false) && Lampa.Torserver && Lampa.Torserver.url()) {
      tasks.push({ name: 'TorrServer', run: function (done, err) { torrserverSearch(object, done, err); } });
    }

    extraSources().forEach(function (s) {
      tasks.push({ name: s.name, run: function (done, err) { jackettSearch(s, object, done, err); } });
    });

    var results = [];
    var failed = [];
    var left = tasks.length;
    var finished = false;
    var timer;
    var wait = 1000 * ((parseInt(field('parse_timeout', 15), 10) || 15) + 5);

    function finish() {
      if (finished) return;

      finished = true;
      clearTimeout(timer);

      var merged = mergeResults(results);

      if (!merged.length && failed.length === tasks.length) return fail(failed.join(', '));
      if (failed.length && tasks.length > 1) Lampa.Noty.show('Не ответили: ' + failed.join(', '));

      ok({ Results: merged });
    }

    // Запросы сезонов — только после ответа основного парсера и по одному: JacRed часто не принимает
    // несколько запросов сразу с одного устройства, и тогда терялся основной ответ. Ошибка или
    // пустой ответ на запрос сезона ничего не портит, основные раздачи уже есть
    function seasonsThenFinish() {
      var queries = results[0] ? seasonQueries(object) : [];

      if (!queries.length) return finish();

      clearTimeout(timer);
      timer = setTimeout(finish, Math.min(wait, 12000));

      var next = function (i) {
        var q = queries[i];

        if (!q || finished) return finish();

        setTimeout(function () {
          if (finished) return;

          jackettSearch(q.src, q.object, function (list) {
            results.push({ name: MAIN_SOURCE, items: list || [] });
            next(i + 1);
          }, function () { next(i + 1); });
        }, 400);
      };

      next(0);
    }

    tasks.forEach(function (t, i) {
      var settled = false;

      t.run(function (list) {
        if (settled) return;
        settled = true;
        results[i] = { name: t.name, items: list || [] };
        if (--left === 0) seasonsThenFinish();
      }, function () {
        if (settled) return;
        settled = true;
        failed.push(t.name);
        if (--left === 0) seasonsThenFinish();
      });
    });

    // Медленный источник не держит экран: отдаём то, что успело прийти
    timer = setTimeout(finish, wait);
  }

  function clearSearch() {
    search_nets.forEach(function (n) { n.clear(); });
    search_nets = [];

    if (Lampa.Parser.clear) Lampa.Parser.clear();
  }

  // «⊕ TorrServer, jackett.local» — откуда ещё пришла раздача, кроме основного парсера
  function sourceText(el) {
    var other = (el.tvt_src || []).filter(function (s) { return s !== MAIN_SOURCE; });

    return other.length ? '⊕ ' + other.join(', ') : '';
  }

  // ---------------------------------------------------------------------------
  // Экран торрентов
  // ---------------------------------------------------------------------------

  function Component(object) {
    var _this = this;
    var scroll = new Lampa.Scroll({ mask: false, over: true });
    var html = $('<div class="tvt"></div>');
    var head = $('<div class="tvt-head"><div class="tvt-head__title"></div><div class="tvt-head__stat"></div></div>');
    var rows = $('<div class="tvt-rows"></div>');
    var list = $('<div class="tvt-list"></div>');
    var items = [];
    var filtered = [];
    var shown = 0;
    var last;
    var initialized = false;
    var is_serial = false;

    var remember = field('tvt_remember', true);
    var saved = remember ? Lampa.Storage.get('tvt_filters', '{}') : {};

    if (typeof saved === 'string') {
      try { saved = JSON.parse(saved); } catch (e) { saved = {}; }
    }

    var state = {
      quality: saved.quality || '',
      vtype: '',
      studio: '',
      season: '',
      source: '',
      tracker: '',
      hdr: !!saved.hdr,
      hidecam: typeof saved.hidecam === 'boolean' ? saved.hidecam : true,
      sort: saved.sort || 'smart'
    };

    if (!object.movie) object.movie = { title: object.search, original_title: object.search };

    is_serial = !!(object.movie.original_name || object.movie.number_of_seasons);

    head.find('.tvt-head__title').text((object.movie.title || object.movie.name || object.search || '') + (object.search && object.search !== object.movie.title ? '  ·  «' + object.search + '»' : ''));

    html.append(head).append(rows).append(list);
    scroll.append(html);
    // Высота списка — экран без шапки Lampa. Без этого прокрутка растягивается на весь список
    // и не двигается за фокусом
    scroll.minus();

    this.create = function () {
      return this.render();
    };

    this.render = function () {
      return scroll.render();
    };

    this.initialize = function () {
      this.activity.loader(true);

      searchReleases(object, function (data) {
        var results = data && data.Results ? data.Results : [];

        items = results.map(function (el) {
          return { el: el, r: parseRelease(el, object.movie) };
        });

        _this.activity.loader(false);

        if (!items.length) _this.empty('Ничего не найдено по запросу «' + (object.search || '') + '»');
        else _this.apply(true);

        _this.activity.toggle();
      }, function (text) {
        _this.activity.loader(false);
        _this.empty('Не удалось получить список раздач: ' + (text || 'нет ответа от парсера'));
        _this.activity.toggle();
      });
    };

    this.empty = function (text) {
      rows.empty();
      list.empty();

      var box = $('<div class="tvt-empty"><div class="tvt-empty__text"></div></div>');

      box.find('.tvt-empty__text').text(text);

      var row = $('<div class="tvt-row"></div>');

      row.append(chip('Изменить поиск', '', false, function () { _this.editSearch(); }, 'search'));
      row.append(chip('Классический вид', '', false, function () { _this.classic(); }, 'classic'));

      box.append(row);
      list.append(box);
      head.find('.tvt-head__stat').text('');
    };

    this.saveFilters = function () {
      if (!remember) return;

      Lampa.Storage.set('tvt_filters', {
        quality: state.quality,
        hdr: state.hdr,
        hidecam: state.hidecam,
        sort: state.sort
      });
    };

    // Проходит ли раздача все фильтры, кроме фильтра except (для подсчёта чисел на кнопках)
    function pass(it, except) {
      var r = it.r;

      if (except !== 'quality' && state.quality && r.res !== state.quality) return false;
      if (except !== 'vtype' && state.vtype && r.types.indexOf(state.vtype) === -1) return false;
      if (except !== 'studio' && state.studio && r.studios.indexOf(state.studio) === -1) return false;
      if (except !== 'season' && state.season && r.seasons.indexOf(state.season) === -1) return false;
      if (except !== 'source' && state.source && r.source !== state.source) return false;
      if (except !== 'tracker' && state.tracker && trackers(it.el.Tracker).indexOf(state.tracker) === -1) return false;
      if (except !== 'hdr' && state.hdr && !r.hdr) return false;
      if (except !== 'hidecam' && state.hidecam && r.cam) return false;

      return true;
    }

    function facet(name, getter) {
      var counts = {};

      items.forEach(function (it) {
        if (!pass(it, name)) return;

        var vals = getter(it);

        if (!Array.isArray(vals)) vals = [vals];

        vals.forEach(function (v) {
          if (v || v === 0) counts[v] = (counts[v] || 0) + 1;
        });
      });

      return counts;
    }

    function score(it) {
      return scoreRelease(it, is_serial && !!state.season);
    }

    function sortItems(arr) {
      var by = {
        smart: function (a, b) { return b.score - a.score; },
        seeds: function (a, b) { return (b.el.Seeders || 0) - (a.el.Seeders || 0); },
        size_desc: function (a, b) { return (b.el.Size || 0) - (a.el.Size || 0); },
        size_asc: function (a, b) { return (a.el.Size || 0) - (b.el.Size || 0); },
        date: function (a, b) { return new Date(b.el.PublishDate || 0) - new Date(a.el.PublishDate || 0); },
        quality: function (a, b) { return (RES_RANK[b.r.res] - RES_RANK[a.r.res]) || ((b.el.Seeders || 0) - (a.el.Seeders || 0)); }
      };

      arr.forEach(function (it) { it.score = score(it); });
      arr.sort(by[state.sort] || by.smart);

      return arr;
    }

    var SORT_LABELS = {
      smart: 'Умная',
      seeds: 'По раздающим',
      quality: 'По качеству',
      size_desc: 'Сначала большие',
      size_asc: 'Сначала маленькие',
      date: 'Сначала новые'
    };

    function chip(label, count, active, onEnter, key, extra) {
      var c = $('<div class="tvt-chip selector"></div>');

      c.text(label);

      if (count !== '' && typeof count !== 'undefined') c.append($('<span class="tvt-chip__count"></span>').text(count));
      if (active) c.addClass('active');
      if (extra) c.addClass(extra);
      if (key) c.attr('data-key', key);

      c.on('hover:enter', onEnter);
      c.on('hover:focus', function (e) {
        last = e.target;
        scroll.update($(e.target), true);
      });

      return c;
    }

    function row(label, chips) {
      var r = $('<div class="tvt-row"><div class="tvt-row__label"></div><div class="tvt-row__chips"></div></div>');
      var box = r.find('.tvt-row__chips');

      r.find('.tvt-row__label').text(label);
      chips.forEach(function (c) { box.append(c); });

      return r;
    }

    function selectFrom(title, options, current, onSelect) {
      var enabled = Lampa.Controller.enabled().name;

      Lampa.Select.show({
        title: title,
        items: options.map(function (o) {
          return { title: o.title, subtitle: o.subtitle, value: o.value, selected: o.value === current };
        }),
        onBack: function () {
          Lampa.Controller.toggle(enabled);
        },
        onSelect: function (a) {
          Lampa.Controller.toggle(enabled);
          onSelect(a.value);
        }
      });
    }

    function set(name, value, focus_key) {
      state[name] = value;

      if (name === 'studio') rememberStudio(value);

      _this.saveFilters();
      _this.apply(false, focus_key);
    }

    this.buildRows = function () {
      rows.empty();

      // Качество
      var qc = facet('quality', function (it) { return it.r.res; });
      var quality = [chip('Любое', '', !state.quality, function () { set('quality', '', 'q:'); }, 'q:')];

      RES_ORDER.forEach(function (q) {
        if (qc[q] || state.quality === q) {
          quality.push(chip(q, qc[q] || 0, state.quality === q, function () { set('quality', state.quality === q ? '' : q, 'q:' + q); }, 'q:' + q));
        }
      });

      rows.append(row('Качество', quality));

      // Тип перевода
      var tc = facet('vtype', function (it) { return it.r.types; });
      var types = [chip('Любой', '', !state.vtype, function () { set('vtype', '', 't:'); }, 't:')];

      TYPE_ORDER.forEach(function (t) {
        if (tc[t] || state.vtype === t) {
          types.push(chip(TYPE_LABELS[t], tc[t] || 0, state.vtype === t, function () { set('vtype', state.vtype === t ? '' : t, 't:' + t); }, 't:' + t));
        }
      });

      if (types.length > 1) rows.append(row('Перевод', types));

      // Студии озвучки
      var sc = facet('studio', function (it) { return it.r.studios; });
      var prefs = preferredStudios();
      // Неизвестные студии из одной раздачи чаще всего мусор из названий дорожек — в кнопки не выносим
      var names = Object.keys(sc).filter(function (n) {
        return KNOWN_STUDIOS[n] || sc[n] >= 2 || prefs.indexOf(n) >= 0;
      }).sort(function (a, b) {
        var pa = prefs.indexOf(a) >= 0 ? 1 : 0;
        var pb = prefs.indexOf(b) >= 0 ? 1 : 0;

        return (pb - pa) || (sc[b] - sc[a]);
      });

      if (state.studio && names.indexOf(state.studio) === -1) names.unshift(state.studio);

      if (names.length) {
        var max = 7;
        var studios = [chip('Любая', '', !state.studio, function () { set('studio', '', 's:'); }, 's:')];
        var visible = names.slice(0, max);

        if (state.studio && visible.indexOf(state.studio) === -1) visible[max - 1] = state.studio;

        visible.forEach(function (n) {
          studios.push(chip(n, sc[n] || 0, state.studio === n, function () { set('studio', state.studio === n ? '' : n, 's:' + n); }, 's:' + n, prefs.indexOf(n) >= 0 ? 'pref' : ''));
        });

        if (names.length > max) {
          studios.push(chip('Ещё ' + (names.length - max) + ' ▾', '', false, function () {
            selectFrom('Студия озвучки', [{ title: 'Любая', value: '' }].concat(names.map(function (n) {
              return { title: n, subtitle: releases(sc[n]), value: n };
            })), state.studio, function (v) { set('studio', v, 's:more'); });
          }, 's:more'));
        }

        rows.append(row('Озвучка', studios));
      }

      // Прочее
      var other = [];

      other.push(chip('Сортировка: ' + SORT_LABELS[state.sort], '', false, function () {
        selectFrom('Сортировка', Object.keys(SORT_LABELS).map(function (k) {
          return { title: SORT_LABELS[k], subtitle: k === 'smart' ? 'Качество, раздающие и любимые озвучки' : '', value: k };
        }), state.sort, function (v) { set('sort', v, 'o:sort'); });
      }, 'o:sort'));

      var seasons = facet('season', function (it) { return it.r.seasons; });
      var season_list = Object.keys(seasons).map(function (s) { return parseInt(s, 10); }).sort(function (a, b) { return a - b; });

      if (is_serial && season_list.length) {
        other.push(chip('Сезон: ' + (state.season || 'все') + ' ▾', '', !!state.season, function () {
          selectFrom('Сезон', [{ title: 'Все сезоны', value: '' }].concat(season_list.map(function (s) {
            return { title: s + ' сезон', subtitle: releases(seasons[s]), value: s };
          })), state.season, function (v) { set('season', v, 'o:season'); });
        }, 'o:season'));
      }

      var src = facet('source', function (it) { return it.r.source; });
      var src_list = SOURCE_ORDER.filter(function (s) { return src[s]; });

      if (src_list.length > 1 || state.source) {
        other.push(chip('Источник: ' + (state.source || 'любой') + ' ▾', '', !!state.source, function () {
          selectFrom('Источник', [{ title: 'Любой', value: '' }].concat(src_list.map(function (s) {
            return { title: s, subtitle: releases(src[s]), value: s };
          })), state.source, function (v) { set('source', v, 'o:source'); });
        }, 'o:source'));
      }

      var tr = facet('tracker', function (it) { return trackers(it.el.Tracker); });
      var tr_list = Object.keys(tr).sort(function (a, b) { return tr[b] - tr[a]; });

      if (tr_list.length > 1 || state.tracker) {
        other.push(chip('Трекер: ' + (state.tracker || 'любой') + ' ▾', '', !!state.tracker, function () {
          selectFrom('Трекер', [{ title: 'Любой', value: '' }].concat(tr_list.map(function (t) {
            return { title: t, subtitle: releases(tr[t]), value: t };
          })), state.tracker, function (v) { set('tracker', v, 'o:tracker'); });
        }, 'o:tracker'));
      }

      var hdr_count = facet('hdr', function (it) { return it.r.hdr ? 'y' : ''; }).y || 0;

      if (hdr_count || state.hdr) {
        other.push(chip('HDR / DV', hdr_count, state.hdr, function () { set('hdr', !state.hdr, 'o:hdr'); }, 'o:hdr'));
      }

      var cam_count = 0;

      items.forEach(function (it) { if (it.r.cam) cam_count++; });

      if (cam_count) {
        other.push(chip(state.hidecam ? 'Экранки скрыты' : 'Экранки показаны', cam_count, state.hidecam, function () { set('hidecam', !state.hidecam, 'o:cam'); }, 'o:cam'));
      }

      if (state.quality || state.vtype || state.studio || state.season || state.source || state.tracker || state.hdr) {
        other.push(chip('Сбросить', '', false, function () {
          state.quality = state.vtype = state.studio = state.source = state.tracker = '';
          state.season = '';
          state.hdr = false;
          _this.saveFilters();
          _this.apply(false, 'q:');
        }, 'o:reset', 'reset'));
      }

      other.push(chip('Поиск ✎', '', false, function () { _this.editSearch(); }, 'o:search'));
      other.push(chip('Классический вид', '', false, function () { _this.classic(); }, 'o:classic'));

      rows.append(row('Ещё', other));
    };

    this.renderItem = function (it, best) {
      var el = it.el;
      var r = it.r;
      var seeds = parseInt(el.Seeders, 10) || 0;
      var item = $(
        '<div class="tvt-item selector">' +
          '<div class="tvt-item__q"><div class="tvt-item__res"></div><div class="tvt-item__hdr"></div></div>' +
          '<div class="tvt-item__body">' +
            '<div class="tvt-item__title"></div>' +
            '<div class="tvt-item__tags"></div>' +
            '<div class="tvt-item__meta"></div>' +
          '</div>' +
          '<div class="tvt-item__side"><div class="tvt-item__seeds"></div><div class="tvt-item__size"></div></div>' +
        '</div>'
      );

      item.find('.tvt-item__q').addClass('tvt-q--' + r.res.toLowerCase());
      item.find('.tvt-item__res').text(r.res);
      item.find('.tvt-item__hdr').text(r.hdr || '');
      item.find('.tvt-item__title').text(el.Title || '');

      var tags = item.find('.tvt-item__tags');

      if (best) tags.append($('<span class="tvt-tag tvt-tag--best">★ Лучший вариант</span>'));
      if (el.viewed) tags.append($('<span class="tvt-tag tvt-tag--viewed">✓ Открывали</span>'));

      r.types.forEach(function (t) { tags.append($('<span class="tvt-tag tvt-tag--type"></span>').text(TYPE_LABELS[t])); });
      r.studios.slice(0, 5).forEach(function (s) { tags.append($('<span class="tvt-tag tvt-tag--studio"></span>').text(s)); });
      if (r.studios.length > 5) tags.append($('<span class="tvt-tag tvt-tag--studio"></span>').text('+' + (r.studios.length - 5)));
      if (r.seasons.length) tags.append($('<span class="tvt-tag tvt-tag--season"></span>').text(r.seasons.length > 1 ? 'Сезоны ' + r.seasons[0] + '–' + r.seasons[r.seasons.length - 1] : 'Сезон ' + r.seasons[0]));
      if (r.source) tags.append($('<span class="tvt-tag"></span>').text(r.source));
      if (r.codec) tags.append($('<span class="tvt-tag"></span>').text(r.codec));
      if (r.channels) tags.append($('<span class="tvt-tag"></span>').text(r.channels));
      if (r.rus_subs && r.types.indexOf('sub') < 0) tags.append($('<span class="tvt-tag"></span>').text('Рус. субтитры'));
      if (r.is3d) tags.append($('<span class="tvt-tag tvt-tag--warn">3D</span>'));
      if (r.pack && !r.seasons.length) tags.append($('<span class="tvt-tag tvt-tag--warn">Сборник</span>'));
      if (r.disc) tags.append($('<span class="tvt-tag tvt-tag--warn">Образ диска</span>'));
      if (r.cam) tags.append($('<span class="tvt-tag tvt-tag--warn">Экранка</span>'));

      // Битрейт считаем только для фильмов: у сериала ffprobe описывает одну серию, а размер — всю раздачу
      var bitrate = !is_serial && r.duration > 600 && el.Size ? (el.Size * 8 / r.duration / 1000000) : 0;
      var meta = [trackerText(el.Tracker), sourceText(el), dateText(el.PublishDate), r.episodes, bitrate ? bitrate.toFixed(1) + ' Мбит/с' : ''].filter(Boolean).join('  ·  ');

      item.find('.tvt-item__meta').text(meta);
      item.find('.tvt-item__seeds').addClass('tvt-seeds--' + seedsClass(seeds)).text('▲ ' + seeds);
      item.find('.tvt-item__size').text(sizeText(el.Size));

      item.on('hover:focus', function (e) {
        last = e.target;
        scroll.update($(e.target), true);
      }).on('hover:enter', function () {
        last = item[0];
        _this.play(el, item);
      }).on('hover:long', function () {
        _this.menu(it, item);
      });

      return item;
    };

    this.play = function (el, item) {
      Lampa.Torrent.opened(function () {
        markViewed(el);
        item.find('.tvt-tag--viewed').length || item.find('.tvt-item__tags').prepend($('<span class="tvt-tag tvt-tag--viewed">✓ Открывали</span>'));
      });

      el.poster = object.movie.img;

      this.start();

      Lampa.Torrent.start(el, object.movie);
      Lampa.Listener.send('torrent', { type: 'onenter', element: el, item: item });
    };

    this.menu = function (it, item) {
      var enabled = Lampa.Controller.enabled().name;
      var menu = [{ title: 'Смотреть', play: true }];

      it.r.studios.forEach(function (s) {
        if (state.studio !== s) menu.push({ title: 'Только озвучка: ' + s, studio: s });
      });

      if (state.quality !== it.r.res) menu.push({ title: 'Только качество: ' + it.r.res, quality: it.r.res });
      if (it.el.MagnetUri) menu.push({ title: 'Скопировать magnet-ссылку', copy: true });

      Lampa.Select.show({
        title: 'Действие',
        items: menu,
        onBack: function () {
          Lampa.Controller.toggle(enabled);
        },
        onSelect: function (a) {
          Lampa.Controller.toggle(enabled);

          if (a.play) _this.play(it.el, item);
          else if (a.studio) set('studio', a.studio, 's:' + a.studio);
          else if (a.quality) set('quality', a.quality, 'q:' + a.quality);
          else if (a.copy) {
            Lampa.Utils.copyTextToClipboard(it.el.MagnetUri, function () {
              Lampa.Noty.show('Ссылка скопирована');
            }, function () {
              Lampa.Noty.show('Не удалось скопировать');
            });
          }
        }
      });
    };

    this.appendMore = function () {
      list.find('.tvt-more').remove();

      var next = filtered.slice(shown, shown + 40);

      next.forEach(function (it, i) {
        list.append(_this.renderItem(it, state.sort === 'smart' && shown + i === 0 && (parseInt(it.el.Seeders, 10) || 0) > 0));
      });

      shown += next.length;

      if (shown < filtered.length) {
        var more = $('<div class="tvt-more selector"></div>').text('Показать ещё ' + Math.min(40, filtered.length - shown) + ' из ' + (filtered.length - shown));

        more.on('hover:enter', function () {
          var index = shown;

          _this.appendMore();
          _this.refreshController(list.find('.tvt-item').eq(index)[0]);
        }).on('hover:focus', function (e) {
          last = e.target;
          scroll.update($(e.target), true);
        });

        list.append(more);
      }
    };

    this.apply = function (first, focus_key) {
      filtered = sortItems(items.filter(function (it) { return pass(it); }));
      shown = 0;

      // Запомненные качество/HDR с прошлого фильма здесь ничего не дают — показываем всё, не трогая сохранённое
      if (first && !filtered.length && (state.quality || state.hdr)) {
        state.quality = '';
        state.hdr = false;
        filtered = sortItems(items.filter(function (it) { return pass(it); }));
      }

      this.buildRows();
      list.empty();

      if (!filtered.length) {
        var none = $('<div class="tvt-none"></div>').text('Нет раздач с такими фильтрами. Снимите часть фильтров выше.');

        list.append(none);
      } else {
        this.appendMore();
      }

      head.find('.tvt-head__stat').text('Показано ' + filtered.length + ' из ' + items.length);

      var focus = focus_key ? rows.find('[data-key="' + focus_key.replace(/"/g, '\\"') + '"]')[0] : null;

      if (first) focus = list.find('.tvt-item')[0] || rows.find('.selector')[0];
      if (!focus && focus_key) focus = rows.find('[data-key^="' + focus_key.split(':')[0] + ':"]')[0];

      last = focus || last;

      if (!first) this.refreshController(last);
    };

    this.refreshController = function (focus) {
      if (focus) last = focus;

      if (Lampa.Controller.enabled().name === 'content') {
        Lampa.Controller.collectionSet(scroll.render());
        Lampa.Controller.collectionFocus(last || false, scroll.render());
      }
    };

    this.editSearch = function () {
      Lampa.Input.edit({
        title: 'Поиск раздач',
        value: object.search || '',
        free: true,
        nosave: true
      }, function (value) {
        if (value && value !== object.search) {
          Lampa.Activity.replace({ search: value, clarification: true });
        } else {
          Lampa.Controller.toggle('content');
        }
      });
    };

    this.classic = function () {
      Lampa.Activity.replace({ component: 'tvt_classic' });
    };

    this.start = function () {
      if (!initialized) {
        initialized = true;
        this.initialize();
      }

      if (object.movie && Lampa.Background && Lampa.Utils.cardImgBackgroundBlur) {
        Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
      }

      if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update(scroll.render(true));

      Lampa.Controller.add('content', {
        toggle: function () {
          Lampa.Controller.collectionSet(scroll.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        up: function () {
          if (Navigator.canmove('up')) Navigator.move('up');
          else Lampa.Controller.toggle('head');
        },
        down: function () {
          Navigator.move('down');
        },
        left: function () {
          if (Navigator.canmove('left')) Navigator.move('left');
          else Lampa.Controller.toggle('menu');
        },
        right: function () {
          Navigator.move('right');
        },
        back: this.back
      });

      Lampa.Controller.toggle('content');
    };

    this.back = function () {
      Lampa.Activity.backward();
    };

    this.pause = function () {};
    this.stop = function () {};

    this.destroy = function () {
      clearSearch();
      scroll.destroy();
      html.remove();
      items = filtered = [];
    };
  }

  // ---------------------------------------------------------------------------
  // Прогресс просмотра: Timeline Lampa, привязка «карточка + сезон + серия».
  // Хеш считаем так же, как Lampa при запуске файла из TorrServer, поэтому прогресс общий
  // для всех раздач и пишется самим плеером (MX, VLC и встроенный).
  // ---------------------------------------------------------------------------

  function cardKey(movie) {
    return (movie.original_name ? 'tv' : 'movie') + '_' + movie.id;
  }

  function episodeView(movie, s, e) {
    var hash = Lampa.Utils.hash([s, s > 10 ? ':' : '', e, movie.original_title].join(''));

    return Lampa.Timeline.view(hash, timelineLink(movie, s, e));
  }

  function movieView(movie) {
    return Lampa.Timeline.view(Lampa.Utils.hash(movie.original_title), timelineLink(movie));
  }

  // Привязки к карточке нет в некоторых сборках Lampa (например, с зеркала cflampa.mx) — там прогресс ищется только по хешу
  function timelineLink(movie, s, e) {
    return typeof Lampa.Timeline.link === 'function' ? Lampa.Timeline.link(movie, s, e) : null;
  }

  function isWatched(v) {
    return v && v.percent >= 90;
  }

  function timeText(sec) {
    sec = Math.round(sec || 0);

    var h = Math.floor(sec / 3600);
    var m = Math.floor(sec % 3600 / 60);
    var s = sec % 60;

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    return (h ? h + ':' + pad(m) : m) + ':' + pad(s);
  }

  function shortDate(str) {
    var d = new Date(str);

    if (!str || isNaN(d.getTime())) return '';

    var months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function isFuture(str) {
    var d = new Date(str);

    return !!str && !isNaN(d.getTime()) && d.getTime() > Date.now();
  }

  function readTitles() {
    var all = Lampa.Storage.get('tvt_titles', '{}');

    if (typeof all === 'string') {
      try { all = JSON.parse(all); } catch (e) { all = {}; }
    }

    return all && typeof all === 'object' ? all : {};
  }

  function titlePrefs(movie) {
    return readTitles()[cardKey(movie)] || {};
  }

  // Выбранные для фильма/сериала озвучка, качество, раздача и последняя серия
  function saveTitlePrefs(movie, patch) {
    var all = readTitles();
    var key = cardKey(movie);
    var cur = all[key] || {};

    for (var k in patch) cur[k] = patch[k];

    cur.t = Date.now();
    all[key] = cur;

    var keys = Object.keys(all);

    if (keys.length > 200) {
      keys.sort(function (a, b) { return (all[a].t || 0) - (all[b].t || 0); });
      keys.slice(0, keys.length - 200).forEach(function (old) { delete all[old]; });
    }

    Lampa.Storage.set('tvt_titles', all);
    scheduleSync(30000);
  }

  function tmdbSeasons(movie) {
    return (movie.seasons || []).filter(function (s) {
      return s.season_number > 0 && s.episode_count > 0;
    });
  }

  // Сезоны так, как их считают раздачи (см. splitSeasons)
  function realSeasons(movie) {
    var split = movie && season_splits[movie.id];

    return split ? split.list : tmdbSeasons(movie);
  }

  function coversSeason(it, n) {
    return it.r.seasons.indexOf(n) >= 0;
  }

  function seasonOf(movie, n) {
    return realSeasons(movie).filter(function (s) { return s.season_number === n; })[0] || null;
  }

  // Какие серии сезона n есть в раздаче: [с, по] в нумерации экрана или null — неизвестно (весь сезон).
  // Раздача части считает серии с начала части: «2 сезон: Часть 2: 1-13 серии из 13» — это 14–26-я
  // серии сезона, а «Части 1-3: 1-40 серии» — с начала сезона
  function releaseSpan(movie, it, n) {
    var r = it.r;
    var range = r.ep_range && r.seasons.length <= 1 ? r.ep_range : null;
    var season = movie && n ? seasonOf(movie, n) : null;
    var parts = season && season.parts || [];

    // Номера больше, чем серий в сезоне, — сквозные («Ван-Пис [1061-1118]», «Блич [168-366 из 366]»,
    // «Gintama TV-2 [202-252]»): переводим в номера этого сезона, вне сезона — раздача его не содержит.
    // Раздача сезона с номерами от 1 («2 сезон: 1-18 серии из 18» при 7 сериях на TMDB) — свой счёт сезонов, не сквозной
    if (range && season && range[1] > season.episode_count && !r.parts && (!r.seasons.length || range[0] > season.episode_count)) {
      var before = 0;

      realSeasons(movie).some(function (s) {
        if (s.season_number === n) return true;
        before += s.episode_count;
      });

      var a0 = Math.max(1, range[0] - before);
      var b0 = Math.min(season.episode_count, range[1] - before);

      return a0 <= b0 ? [a0, b0] : [0, -1];
    }

    if (!r.parts || parts.length < 2 || r.seasons.length > 1) return range;

    var a = parts[r.parts[0] - 1];
    var b = parts[Math.min(r.parts[1], parts.length) - 1];

    if (!a || !b) return range;
    if (!range) return [a.from, b.to];
    if (range[1] <= b.to - a.from + 1) return [a.from + range[0] - 1, a.from + range[1] - 1];

    return range;
  }

  function coversEpisode(it, e, movie, n) {
    var span = releaseSpan(movie, it, n);

    return span ? e >= span[0] && e <= span[1] : true;
  }

  // Годы раздачи не попадают в годы сезона — это другое произведение или другая нумерация сезонов
  // («Блич 2 сезон (1-21 из 21) / 2005» — арка старого сериала, а 2 сезон «Блича» — 2022–2026)
  function seasonYears(movie, n) {
    var list = realSeasons(movie);
    var yearOf = function (d) { return parseInt((d || '').slice(0, 4), 10) || 0; };

    for (var i = 0; i < list.length; i++) {
      var s = list[i];

      if (s.season_number !== n) continue;

      var eps = (s.episodes || []).filter(function (x) { return x.air_date; });
      var from = yearOf(eps.length ? eps[0].air_date : s.air_date);
      var to = eps.length ? yearOf(eps[eps.length - 1].air_date) : list[i + 1] ? yearOf(list[i + 1].air_date) : 0;

      return from ? [from, Math.max(from, to || new Date().getFullYear())] : null;
    }

    return null;
  }

  // Фильм: раздачи другого года («Коллекция 2002-2016» для фильма 2026) и сезоны
  // одноимённого сериала не предлагаем
  function movieReleases(items, year) {
    var same = items.filter(function (it) { return yearMatches(it.r, year) && !it.r.seasons.length; });
    var all = same.length ? same : items;
    var list = all.filter(function (it) { return !it.r.cam; });

    return list.length ? list : all.slice();
  }

  // Раздачи сезона n сериала
  function seasonReleases(movie, items, n) {
    var list = items.filter(function (it) { return !it.r.cam; });

    if (!list.length) list = items.slice();

    // Парсер присылает и чужое («Десять (1 сезон: 1-10 серии из 10)», «Три процента» к «Гинтаме») —
    // в сезоне только раздачи, где есть название сериала
    var named = list.filter(function (it) { return sameTitle(it.el.Title, movie); });

    if (named.length) list = named;

    // Раздачи с годами вне лет выхода — другое произведение с тем же названием
    // (фильм «Тетрадь смерти» 2017 года у сериала 2006–2007)
    // Конец — по последнему сезону и следующей серии: TMDB обновляет last_air_date с опозданием
    // («Киберпанк: Бегущие по краю», 2 сезон вышел в 2026, а last_air_date ещё 2022); идущий сериал — до этого года
    var yearOf = function (d) { return parseInt((d || '').slice(0, 4), 10) || 0; };
    var y0 = yearOf(movie.first_air_date);
    var y1 = Math.max(yearOf(movie.last_air_date), yearOf(movie.next_episode_to_air && movie.next_episode_to_air.air_date));

    (movie.seasons || []).forEach(function (s) { y1 = Math.max(y1, yearOf(s.air_date)); });

    if (!y1 || movie.in_production || /returning|production|planned/i.test(movie.status || '')) y1 = Math.max(y1, new Date().getFullYear());

    if (y0) {
      var in_years = list.filter(function (it) {
        return !it.r.years.length || it.r.years.some(function (y) { return y[1] >= y0 - 1 && y[0] <= y1 + 1; });
      });

      if (in_years.length) list = in_years;
    }

    var exact = list.filter(function (it) { return coversSeason(it, n); });
    var unnamed = list.filter(function (it) { return !it.r.seasons.length; });
    var years = isAnimation(movie) ? seasonYears(movie, n) : null;

    // Раздачи нескольких сезонов часто подписаны годом начала сериала («1-2 сезоны … / 2019») — их не трогаем
    if (years) {
      var in_season = exact.filter(function (it) {
        return it.r.seasons.length > 1 || !it.r.years.length || it.r.years.some(function (y) { return y[1] >= years[0] - 1 && y[0] <= years[1] + 1; });
      });

      if (in_season.length) exact = in_season;
    }

    // Сезон в названии не указан: у односезонного сериала это тот же сезон — берём вместе с «[S01]»
    // («Тетрадь смерти»: одна раздача с S01 и полсотни «1-37 из 37»), у многосезонного — запасной вариант
    var out = realSeasons(movie).length <= 1 ? exact.concat(unnamed) : exact.length ? exact : unnamed;

    // Аниме: раздача без сезона, но со сквозными номерами серий целиком внутри этого сезона и в его годы
    // («Блич / Bleach / 2004 / [BDRip 1080p][HEVC][1-189]») — тоже раздача сезона
    if (out === exact && years) {
      var before = 0;
      var season = null;

      realSeasons(movie).some(function (s) {
        if (s.season_number === n) return (season = s);
        before += s.episode_count;
      });

      if (season) {
        out = exact.concat(unnamed.filter(function (it) {
          var g = it.r.ep_range;

          // OVA, спешлы и фильмы под названием сериала («Атака титанов OVA 1-3 (1-8 серии из 8)») — не серии сезона
          return g && g[0] > before && g[1] <= before + season.episode_count && !it.r.parts && !/\b(?:ova|ona|oad|special|movie)s?\b|спешл|спэшл|фильм/i.test(it.el.Title || '') &&
            (!it.r.years.length || it.r.years.some(function (y) { return y[1] >= years[0] - 1 && y[0] <= years[1] + 1; }));
        }));
      }
    }

    // Серии раздачи все вне сезона («Ван-Пис [1061-1118]» для 3 сезона) — не предлагаем
    var inside = out.filter(function (it) {
      var span = releaseSpan(movie, it, n);

      return !span || span[0] <= span[1];
    });

    return inside.length ? inside : out;
  }

  // ---------------------------------------------------------------------------
  // Аниме: TMDB одни тайтлы делит на сезоны как трекеры, а другие держит одним сезоном
  // («Магическая битва»: 1 сезон, 59 серий; на трекерах «1 сезон» 24, «2 сезон» 23, «3 сезон» 12).
  // Структуру берём из самих раздач: сколько серий в каждом сезоне — по большинству названий
  // («2 сезон: 1-23 серии из 23», «[ТВ-2] (23 из 23)», «[02x01-06 из 23]»). Сезон TMDB режем,
  // только если в него укладываются несколько сезонов трекеров; места разрезов уточняем по
  // перерывам между датами выхода серий. Где TMDB и трекеры совпадают, ничего не меняется.
  // ---------------------------------------------------------------------------

  var season_splits = {};
  var SPLIT_GAP = 45 * 86400000;      // перерыв между сериями, после которого начинается новый сезон
  var SPLIT_BIG_GAP = 90 * 86400000;  // такой перерыв — новый сезон, даже если раздачи о нём не говорят

  // Сезоны по раздачам: {номер: {count — серий по большинству, seen — в скольких раздачах}}, плюс суммы
  // для раздач на несколько сезонов («1-3 сезон: 1-35 серии из 35»)
  function releaseSeasons(items) {
    var out = {};
    var ranges = [];

    items.forEach(function (it) {
      var r = it.r;

      r.seasons.forEach(function (s) {
        if (!out[s]) out[s] = { votes: {}, seen: 0, count: 0 };
        out[s].seen++;
      });

      if (!r.total) return;

      if (r.seasons.length === 1) {
        var v = out[r.seasons[0]].votes;

        v[r.total] = (v[r.total] || 0) + 1;
      } else if (r.seasons.length > 1) {
        ranges.push({ from: r.seasons[0], to: r.seasons[r.seasons.length - 1], total: r.total });
      }
    });

    for (var s in out) {
      var best = 0;
      var votes = out[s].votes;

      for (var k in votes) if (!best || votes[k] > votes[best] || (votes[k] === votes[best] && +k < +best)) best = +k;

      out[s].count = best;
    }

    // Серий сезона не назвала ни одна раздача, но есть сумма по нескольким сезонам — вычитаем известные
    // (раздачи с суммой тоже ошибаются, поэтому и здесь берём то, что выходит чаще)
    var derived = {};

    ranges.forEach(function (g) {
      var unknown = [];
      var known = 0;

      for (var i = g.from; i <= g.to; i++) {
        if (!out[i]) out[i] = { votes: {}, seen: 0, count: 0 };
        if (out[i].count) known += out[i].count;
        else unknown.push(i);
      }

      if (unknown.length === 1 && g.total - known > 0) {
        var d = derived[unknown[0]] = derived[unknown[0]] || {};

        d[g.total - known] = (d[g.total - known] || 0) + 1;
      }
    });

    for (var u in derived) {
      var pick = 0;

      for (var c in derived[u]) if (!pick || derived[u][c] > derived[u][pick]) pick = +c;

      out[u].count = pick;
    }

    return out;
  }

  // План без серий TMDB: какие сезоны TMDB на какие сезоны трекеров делятся. null — делить нечего
  function isAnimation(movie) {
    return movie.original_language === 'ja' || (movie.genres || []).some(function (g) { return g.id === 16 || /аниме|мульт|anim/i.test(g.name || ''); });
  }

  function planSplit(movie, items) {
    var tmdb = tmdbSeasons(movie);
    var rel = releaseSeasons(items);
    var max = 0;

    // У игровых сериалов сезоны TMDB и трекеров совпадают, а перерывы посреди сезона бывают — не трогаем
    if (!isAnimation(movie) || !tmdb.length || tmdb.length > 8) return null;

    // Сезон есть, если его назвали хотя бы две раздачи или одна — с числом серий
    for (var s in rel) if ((rel[s].seen >= 2 || rel[s].count) && +s > max && +s <= 40) max = +s;

    var plan = [];
    var next = 1;
    var split = false;

    tmdb.forEach(function (t, ti) {
      var left_tmdb = tmdb.length - ti - 1;
      var group = [];
      var sum = 0;

      if (next <= max) {
        group.push(next);
        sum = rel[next] ? rel[next].count : 0;

        // Берём в этот сезон TMDB ещё сезоны трекеров, пока остальным сезонам TMDB их хватает
        // и серий по раздачам не больше, чем в сезоне TMDB
        while (next + group.length <= max && max - (next + group.length - 1) > left_tmdb) {
          var cand = next + group.length;
          var c = rel[cand] ? rel[cand].count : 0;

          if (sum && c && sum + c > t.episode_count + 2) break;

          group.push(cand);
          sum = sum && c ? sum + c : 0;
        }
      }

      if (group.length > 1) split = true;

      plan.push({ tmdb: t, seasons: group.length ? group : [next], counts: (group.length ? group : [next]).map(function (n) { return rel[n] ? rel[n].count : 0; }) });
      next = (group.length ? group[group.length - 1] : next) + 1;
    });

    // Последний сезон TMDB заметно длиннее последнего сезона трекеров — возможно, следующий сезон
    // трекеры ещё не назвали (вышла только первая часть); проверим по датам, когда будут серии
    var last = plan[plan.length - 1];
    var known = 0;

    last.counts.forEach(function (c) { known += c; });

    var tail = last.counts.every(function (c) { return c > 0; }) && last.tmdb.episode_count >= known + 3;

    return split || tail ? { plan: plan, tail: tail } : null;
  }

  // Lampa сама режет 1-й сезон TMDB по перерывам в 90 дней и отдаёт только первую часть,
  // а все серии кладёт в episodes_original — берём все
  function tmdbEpisodes(json) {
    var list = json && (json.episodes_original || json.episodes);

    return Array.isArray(list) ? list : [];
  }

  function airTime(ep) {
    var t = ep && ep.air_date ? Date.parse(ep.air_date) : NaN;

    return isNaN(t) ? 0 : t;
  }

  // Перерыв перед серией i (между i-1 и i), мс
  function gapBefore(list, i) {
    var a = airTime(list[i - 1]);
    var b = airTime(list[i]);

    return a && b ? b - a : 0;
  }

  // Ближайший к цели перерыв (±2 серии): раздачи иногда считают на серию больше или меньше
  function snapCut(list, target) {
    var best = -1;

    for (var d = 0; d <= 2; d++) {
      [target - d, target + d].forEach(function (i) {
        if (best < 0 && i > 0 && i < list.length && gapBefore(list, i) >= SPLIT_GAP) best = i;
      });
    }

    return best > 0 ? best : target;
  }

  // Следующий большой перерыв после серии from
  function nextGap(list, from, min) {
    for (var i = from + 1; i < list.length; i++) if (gapBefore(list, i) >= min) return i;

    return -1;
  }

  // Серии TMDB {номер: {episodes}} + план → сезоны как у трекеров или null
  function splitSeasons(movie, data, plan) {
    var out = [];
    var abs = 0;
    var changed = false;

    for (var pi = 0; pi < plan.plan.length; pi++) {
      var p = plan.plan[pi];
      var t = p.tmdb;
      var json = data[t.season_number] || data[t.season_number + ''];
      var list = tmdbEpisodes(json).filter(function (e) { return e.episode_number > 0; });

      list.sort(function (a, b) { return a.episode_number - b.episode_number; });

      if (!list.length) {
        // Серий нет — сезон как есть (делить вслепую нельзя)
        if (p.seasons.length > 1) return null;

        out.push({ season_number: p.seasons[0], episode_count: t.episode_count, air_date: t.air_date, poster_path: t.poster_path, tmdb_season: t.season_number, episodes: [] });
        abs += t.episode_count;
        continue;
      }

      var cuts = [];
      var pos = 0;
      var seasons = p.seasons.slice();
      var counts = p.counts.slice();

      for (var i = 0; i < seasons.length - 1; i++) {
        var cut = counts[i] ? snapCut(list, pos + counts[i]) : nextGap(list, pos + 2, SPLIT_GAP);

        if (cut <= pos || cut >= list.length) return null;

        cuts.push(cut);
        pos = cut;
      }

      // Хвост: в последнем сезоне TMDB после известных серий долгий перерыв — это следующий сезон
      if (pi === plan.plan.length - 1 && plan.tail) {
        var lc = counts[counts.length - 1];
        var tail_cut = lc ? snapCut(list, pos + lc) : -1;

        if (tail_cut > pos && tail_cut < list.length && gapBefore(list, tail_cut) >= SPLIT_BIG_GAP) {
          cuts.push(tail_cut);
          seasons.push(seasons[seasons.length - 1] + 1);
        }
      }

      if (cuts.length) changed = true;

      var start = 0;

      cuts.concat([list.length]).forEach(function (end, k) {
        var v = seasons[k];
        var part = list.slice(start, end).map(function (ep, i) {
          var c = {};

          for (var key in ep) c[key] = ep[key];

          c.tmdb_episode = ep.episode_number;
          c.abs = abs + start + i + 1;
          c.episode_number = i + 1;
          c.season_number = v;

          return c;
        });

        out.push({ season_number: v, episode_count: part.length, air_date: part[0].air_date, poster_path: t.poster_path, tmdb_season: t.season_number, episodes: part });
        start = end;
      });

      abs += list.length;
    }

    return changed ? out : null;
  }

  // ---------------------------------------------------------------------------
  // Аниме с данными Shikimori (anime.js, window.tvt_units): там каждая часть сериала — отдельный тайтл
  // с числом серий и датой выхода, а карта аниме знает, какой это сезон у трекеров. Серии TMDB
  // раскладываем по тайтлам по датам выхода; тайтлы одного сезона — его части («Блич», 2 сезон:
  // четыре части по 13, 13, 14 и 10 серий, у трекеров — «2 сезон: Часть 2: 1-13 серии из 13»).
  // Сезон TMDB режем, если в нём несколько сезонов; два сезона TMDB в один не склеиваем.
  // ---------------------------------------------------------------------------

  var DAY = 86400000;

  function dayTime(d) {
    var t = d ? Date.parse(d) : NaN;

    return isNaN(t) ? 0 : t;
  }

  // «Bleach: Sennen Kessen-hen - Ketsubetsu-tan», «Атака титанов 3. Часть 2» — часть тайтла head;
  // «Jujutsu Kaisen 2nd Season», «Mushoku Tensei II» — новый сезон
  function isPartName(name, head) {
    var norm = function (s) { return (s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim(); };
    var n = norm(name);
    var h = norm(head);

    if (!n || !h || n === h || n.indexOf(h) !== 0) return false;

    var rest = n.slice(h.length);

    if (/^\s*[:.]?\s*(?:season|сезон)|^\s*\d|^\s+(?:ii|iii|iv|v|vi)\b/.test(rest)) return false;

    return /^\s*[-–—]\s*\S|^\s*[:.]?\s*(?:part|часть|cour)\s*\d|^\s+(?:\d+(?:st|nd|rd|th)\s+)?(?:part|cour)\b/.test(rest);
  }

  // Название части без названия сериала: «Блич: Тысячелетняя кровавая война — Прощание» → «Прощание»
  function partTitle(u, head) {
    var n = u.russian || u.name;
    var h = head.russian || head.name;

    if (u === head || !n) return '';
    if (h && n.indexOf(h) === 0) n = n.slice(h.length);

    return n.replace(/^[\s.:,–—-]+/, '').replace(/^(?:часть|part)\s*\d+[\s.:,–—-]*/i, '').trim();
  }

  // → список сезонов (как у splitSeasons, у сезонов из нескольких частей ещё parts),
  // 'tmdb' — сезоны как на TMDB, null — тайтлы Shikimori с сериями TMDB не сходятся
  // votes — сезоны по названиям раздач (releaseSeasons): по ним видно, считают ли трекеры тайтлы сезонами
  function unitSeasons(movie, data, units, votes) {
    var tmdb = tmdbSeasons(movie);
    var flat = [];

    for (var ti = 0; ti < tmdb.length; ti++) {
      var t = tmdb[ti];
      var json = data[t.season_number] || data[t.season_number + ''];
      var list = tmdbEpisodes(json).filter(function (e) { return e.episode_number > 0; });

      if (!list.length) return null;

      list.sort(function (a, b) { return a.episode_number - b.episode_number; });
      list.forEach(function (ep) { flat.push({ ep: ep, t: t }); });
    }

    var now = Date.now();
    var fresh = function (u) { var a = dayTime(u.aired); return a && a <= now + DAY; };
    var base = (units || []).filter(function (u) { return !u.extra && fresh(u); });
    var extra = (units || []).filter(function (u) { return u.extra && fresh(u); });

    if (!base.length || !flat.length) return null;

    // Тайтл франшизы, которого нет в карте, но который выходил между тайтлами из карты и не одновременно
    // с ними («Гинтама»: Porori-hen и Shirogane no Tamashii-hen), — тоже часть сериала. Шедшие параллельно
    // («Naruto SD» во время «Ураганных хроник») — отдельные сериалы
    var period = function (u) { var a = dayTime(u.aired); var b = dayTime(u.released) || (u.status === 'released' ? a : now); return [a, Math.max(a, b)]; };
    var between = extra.filter(function (x) {
      var px = period(x);

      return px[0] > dayTime(base[0].aired) && px[0] < dayTime(base[base.length - 1].aired) && !base.some(function (u) {
        var pu = period(u);

        return px[0] <= pu[1] + 3 * DAY && pu[0] <= px[1] + 3 * DAY;
      });
    });

    if (between.length) {
      base = base.concat(between).sort(function (a, b) { return a.aired < b.aired ? -1 : 1; });
      extra = extra.filter(function (x) { return between.indexOf(x) < 0; });
    }

    // Первая серия тайтла: первая ещё не разложенная серия TMDB, вышедшая не раньше тайтла (±3 дня)
    var startOf = function (u, from) {
      var a = dayTime(u.aired) - 3 * DAY;

      for (var i = from; i < flat.length; i++) {
        var at = airTime(flat[i].ep);

        if (!at || at >= a) return i;
      }

      return flat.length;
    };

    var spans = [];
    var align = function (list, from) {
      var p = from;

      for (var k = 0; k < list.length; k++) {
        var u = list[k];
        var s = startOf(u, p);

        if (s >= flat.length) break;

        // Ближайшая серия TMDB вышла уже после конца тайтла — у сериала на TMDB его серий нет (спин-офф или
        // пародия того же времени: «Атака! Титаны средней школы» между 1 и 2 сезоном «Атаки титанов») — пропускаем
        var at0 = airTime(flat[s].ep);
        var until = dayTime(u.released) ? dayTime(u.released) + 14 * DAY : u.status === 'released' ? dayTime(u.aired) + 120 * DAY : now + DAY;

        if (at0 && at0 > until) continue;

        // Серии до начала тайтла (спешлы, пересказы) — предыдущему тайтлу
        if (s > p) {
          if (!spans.length) {
            if (s - p > 2) return -1;
            s = p;
          } else {
            spans[spans.length - 1].to = s - 1;
          }
        }

        var n = u.episodes || u.aired_episodes;
        var next = list[k + 1];
        var end = next ? startOf(next, s + 1) - 1 : n ? s + n - 1 : flat.length - 1;

        end = Math.min(end, flat.length - 1);

        // Вышедший тайтл занял заметно больше или меньше серий, чем в нём есть, — раскладка не та
        if (next && n && u.status === 'released' && Math.abs(end - s + 1 - n) > Math.max(2, Math.round(n * 0.2))) return -1;

        spans.push({ u: u, from: s, to: end });
        p = end + 1;
      }

      return p;
    };

    var p = align(base, 0);

    if (p < 0) return null;

    // После последнего тайтла из карты на TMDB есть ещё серии — новая часть, которой в карте пока нет
    if (p < flat.length && spans.length) {
      var last = spans[spans.length - 1].u;
      var later = extra.filter(function (u) { return u.aired > last.aired; });

      if (later.length) {
        var q = align(later, p);

        if (q < 0) return null;
        p = q;
      }
    }

    if (p < flat.length && spans.length) spans[spans.length - 1].to = flat.length - 1;

    // Тайтл на несколько сезонов TMDB. «Гинтама»: TMDB режет её по годам, а трекеры считают сезонами тайтлы
    // («ТВ-1» — 201 серия, это 1–4-й сезоны TMDB; «ТВ-2» — Gintama') — сезоны по тайтлам, если тайтлов
    // несколько и раздачи сами называют сезоны. «Ван-Пис», «Наруто»: один тайтл, у раздач сквозные номера — сезоны TMDB
    var tmdbOf = function (i) { return flat[i].t.season_number; };
    var spanning = spans.some(function (sp) { return tmdbOf(sp.from) !== tmdbOf(sp.to); });
    var voted = 0;

    for (var vs in votes || {}) if ((votes[vs].seen >= 2 || votes[vs].count) && +vs > voted && +vs <= 40) voted = +vs;

    if (spanning && (spans.length < 2 || voted < 2)) return 'tmdb';

    // Номера сезонов: из карты, если они идут подряд с 1 и не склеивают сезоны TMDB, иначе — по порядку,
    // а тайтл того же сезона TMDB с названием части («… - Ketsubetsu-tan», «… Part 2») — часть сезона
    var from_map = spans[0].u.season === 1 && spans.every(function (sp, i) {
      var prev = spans[i - 1];

      if (sp.u.season < 1) return false;
      if (!prev) return true;
      if (sp.u.season === prev.u.season) return tmdbOf(sp.from) === tmdbOf(prev.from);

      return sp.u.season === prev.u.season + 1;
    });
    var num = 0;
    var head = null;

    spans.forEach(function (sp, i) {
      var prev = spans[i - 1];
      var same = false;

      if (from_map) same = !!prev && sp.u.season === prev.u.season;
      else if (prev && tmdbOf(sp.from) === tmdbOf(prev.from)) same = isPartName(sp.u.name, head.name) || isPartName(sp.u.russian, head.russian) || isPartName(sp.u.english, head.english);

      if (!same) {
        num++;
        head = sp.u;
      }

      sp.season = num;
      sp.head = head;
    });

    var out = [];
    var changed = false;

    spans.forEach(function (sp) {
      var cur = out[out.length - 1];

      if (!cur || cur.season_number !== sp.season) {
        var t = flat[sp.from].t;

        cur = { season_number: sp.season, episode_count: 0, air_date: flat[sp.from].ep.air_date || t.air_date, poster_path: t.poster_path, tmdb_season: t.season_number, episodes: [], parts: [] };
        out.push(cur);
      }

      var first = cur.episodes.length + 1;

      for (var i = sp.from; i <= sp.to; i++) {
        var c = {};
        var ep = flat[i].ep;

        for (var key in ep) c[key] = ep[key];

        c.tmdb_episode = ep.episode_number;
        c.tmdb_season = flat[i].t.season_number;
        c.abs = i + 1;
        c.episode_number = cur.episodes.length + 1;
        c.season_number = sp.season;
        c.part = cur.parts.length + 1;
        cur.episodes.push(c);
      }

      cur.parts.push({ n: cur.parts.length + 1, from: first, to: cur.episodes.length, id: sp.u.id, name: partTitle(sp.u, sp.head) });
      cur.episode_count = cur.episodes.length;
    });

    out.forEach(function (s) {
      var t = tmdb.filter(function (x) { return x.season_number === s.tmdb_season; })[0];

      // Сезон совпал с сезоном TMDB — номера серий как на TMDB
      if (s.season_number === s.tmdb_season && t && s.episode_count === tmdbEpisodes(data[t.season_number] || data[t.season_number + '']).filter(function (e) { return e.episode_number > 0; }).length) {
        s.episodes.forEach(function (c) { c.episode_number = c.tmdb_episode; });
        s.parts.forEach(function (pt) {
          pt.from = s.episodes[pt.from - 1].episode_number;
          pt.to = s.episodes[pt.to - 1].episode_number;
        });
      } else {
        changed = true;
      }

      // Тайтлы Shikimori сезона по порядку — anime.js раскладывает по ним досмотренные серии
      s.shiki = s.parts.map(function (pt) { return { id: pt.id, episodes: pt.to - pt.from + 1 }; });

      if (s.parts.length > 1) changed = true;
      else s.parts = [];
    });

    return changed || out.length !== tmdb.length ? out : 'tmdb';
  }

  // Тайтлы Shikimori один к одному совпадают с сезонами TMDB («Клинок»: пять тайтлов — пять сезонов
  // с тем же числом серий) — раскладывать нечего, серии всех сезонов можно не грузить
  function unitsMatchTmdb(units, tmdb) {
    var now = Date.now();
    var list = units.filter(function (u) { var a = dayTime(u.aired); return !u.extra && a && a <= now + DAY; });

    if (list.length !== tmdb.length) return false;

    return list.every(function (u, i) {
      var n = u.episodes || u.aired_episodes;

      return (!u.season || u.season === i + 1) && n && Math.abs(n - tmdb[i].episode_count) <= 1;
    });
  }

  // Сезоны TMDB как список с серийными номерами: { season_number, episodes: [{ episode_number, abs }] }
  function tmdbList(movie, data) {
    var abs = 0;

    return tmdbSeasons(movie).map(function (t) {
      var list = tmdbEpisodes(data[t.season_number] || data[t.season_number + '']).filter(function (e) { return e.episode_number > 0; });

      list.sort(function (a, b) { return a.episode_number - b.episode_number; });

      return { season_number: t.season_number, episodes: list.map(function (ep) { return { episode_number: ep.episode_number, abs: ++abs }; }) };
    });
  }

  // Сезоны собраны иначе, чем раньше (было по названиям раздач, стало по Shikimori): отметки просмотра лежат
  // по старым номерам серий («Реинкарнация»: старый «2 сезон» — это вторая часть 1 сезона). Один раз
  // перекладываем их по сквозному номеру серии. → [[view, percent, time, duration], …] — что записать
  function moveMarks(movie, from, to) {
    var target = {};
    var marks = [];
    var out = [];

    to.forEach(function (s) {
      s.episodes.forEach(function (ep) { target[ep.abs] = [s.season_number, ep.episode_number]; });
    });

    from.forEach(function (s) {
      s.episodes.forEach(function (ep) {
        var v = episodeView(movie, s.season_number, ep.episode_number);

        if (v.percent > 0 || v.time > 0) marks.push({ to: target[ep.abs], old: [s.season_number, ep.episode_number], percent: v.percent, time: v.time, duration: v.duration });
      });
    });

    var placed = {};

    marks.forEach(function (m) { if (m.to) placed[m.to.join(':')] = m; });

    // Старые места, на которые ничего не переезжает, — освобождаем
    marks.forEach(function (m) {
      if (placed[m.old.join(':')]) return;

      var v = episodeView(movie, m.old[0], m.old[1]);

      out.push([v, 0, 0, v.duration || 0]);
    });

    Object.keys(placed).forEach(function (k) {
      var m = placed[k];
      var p = k.split(':');
      var v = episodeView(movie, +p[0], +p[1]);

      if (v.percent !== m.percent || v.time !== m.time) out.push([v, m.percent, m.time, m.duration || v.duration || 0]);
    });

    return out;
  }

  // Сезоны сериала: по Shikimori (units) или, без них, по названиям раздач. data — серии всех сезонов TMDB.
  // → { list — сезоны для season_splits или null (как на TMDB), how — как получились (для консоли) }
  // Сезонов TMDB много — серии всех грузить дорого; стоит, только если тайтлов Shikimori несколько
  // («Гинтама»: 11 сезонов TMDB, 8 тайтлов), а не один на весь сериал («Ван-Пис»: 23 сезона, один тайтл)
  function unitsUsable(units, tmdb) {
    return !!units && units.length > 0 && (tmdb.length <= 8 || (tmdb.length <= 16 && units.filter(function (u) { return !u.extra; }).length >= 2));
  }

  function unitNames(movie, units) {
    var names = [];

    (units || []).forEach(function (u) {
      [u.name, u.russian, u.english].forEach(function (x) { if (x && names.indexOf(x) < 0) names.push(x); });
    });

    title_names[movie.id] = names;
  }

  function buildSeasons(movie, items, data, units) {
    if (units) unitNames(movie, units);

    if (unitsUsable(units, tmdbSeasons(movie))) {
      var list = unitSeasons(movie, data, units, releaseSeasons(items));

      if (list === 'tmdb') return { list: null, how: 'Shikimori: как на TMDB' };
      if (list) return { list: list, how: 'Shikimori' };
    }

    var plan = planSplit(movie, items);

    return { list: plan ? splitSeasons(movie, data, plan) : null, plan: plan, how: plan ? 'по раздачам' : 'без изменений' };
  }

  // Серия по номеру в сезоне TMDB («Jujutsu Kaisen - 25» → 2 сезон, 1 серия). Без сезона — по сквозному номеру
  function splitAbsolute(split, tmdb_season, e) {
    for (var i = 0; i < split.list.length; i++) {
      var p = split.list[i];

      for (var j = 0; j < p.episodes.length; j++) {
        var ep = p.episodes[j];

        if (tmdb_season ? (ep.tmdb_season || p.tmdb_season) === tmdb_season && ep.tmdb_episode === e : ep.abs === e) {
          return { season: p.season_number, episode: ep.episode_number };
        }
      }
    }

    return null;
  }

  // Сезон из пути файла: «[TV-2]/05.mkv», «S02E05», «2nd Season - 05», «Сезон 2/…»
  function pathSeason(path) {
    var parts = (path || '').toLowerCase().replace(/_/g, ' ').split('/').reverse();
    var res = [/\bs(\d{1,2})(?=e\d|\b)/, /(?:^|[^a-zа-яё])(?:tv|тв)\s*-?\s*(\d{1,2})(?!\d)/, /season\s*(\d{1,2})/, /(\d{1,2})(?:st|nd|rd|th)\s*season/, /(\d{1,2})\s*сезон/, /сезон\s*(\d{1,2})/, /\b(\d{1,2})x\d{2,3}\b/];

    for (var i = 0; i < parts.length; i++) {
      for (var j = 0; j < res.length; j++) {
        var m = parts[i].match(res[j]);

        if (m && +m[1] > 0) return +m[1];
      }
    }

    return 0;
  }

  // Какой серии (в нумерации раздач) соответствует файл. ls/le — что разобрала Lampa
  function splitFile(split, r, path, ls, le) {
    if (!le) return null;

    var s = pathSeason(path) || (r.seasons.length === 1 ? r.seasons[0] : 0) || (ls > 1 ? ls : 0);

    if (s) {
      var p = split.list.filter(function (x) { return x.season_number === s; })[0];

      if (p && le > p.episode_count) return splitAbsolute(split, p.tmdb_season, le) || { season: s, episode: le };

      return { season: s, episode: le };
    }

    return splitAbsolute(split, 0, le) || { season: ls || 1, episode: le };
  }

  // Сериал без разрезанных сезонов: раздача одного сезона («2 сезон», «[S02]», «Название 2»), а в именах
  // файлов сезона нет («Cyberpunk Edgerunners - 01.mkv») — Lampa считает их 1-м сезоном, показывает
  // серии 1-го сезона и пишет прогресс туда же. Все файлы такой раздачи — её сезон. Раздача нескольких
  // сезонов со сквозной нумерацией (1–20) — раскладываем по числу серий сезонов: 11–20 — это 2-й
  function releaseSeasonFile(movie, r, path, ls, le) {
    if (!le || pathSeason(path) || !r.seasons.length) return null;

    if (r.seasons.length === 1) return r.seasons[0] !== ls ? { season: r.seasons[0], episode: le } : null;

    var list = r.seasons.slice().sort(function (a, b) { return a - b; });
    var counts = {};

    realSeasons(movie).forEach(function (s) { counts[s.season_number] = s.episode_count; });

    // Номер не больше, чем серий в первом сезоне раздачи, — нумерация может быть и по сезонам, не трогаем
    if (!counts[list[0]] || le <= counts[list[0]]) return null;

    var e = le;

    for (var i = 0; i < list.length; i++) {
      var cnt = counts[list[i]];

      if (!cnt) return null;
      if (e <= cnt) return list[i] !== ls || e !== le ? { season: list[i], episode: e } : null;

      e -= cnt;
    }

    return null;
  }

  // Сквозной номер серии → сезон и серия экрана («One Piece - 0500.mkv» → 13 сезон, 9 серия)
  function absTarget(movie, abs) {
    var list = realSeasons(movie);
    var e = abs;

    for (var i = 0; i < list.length; i++) {
      if (e <= list[i].episode_count) return { season: list[i].season_number, episode: e };

      e -= list[i].episode_count;
    }

    return null;
  }

  // Раздача одной части («2 сезон: Часть 2: 1-13», «[ТВ-2, часть 2]») обычно считает серии с начала
  // части: 01–13 — это 14–26-я серии сезона. Решаем по номерам всех видеофайлов раздачи: все не больше
  // длины части — сдвиг на начало части; номера уже от начала сезона (14–26) — сдвига нет
  function partOffset(movie, r, nums) {
    if (!r.parts || r.seasons.length > 1 || !nums.length) return null;

    var with_parts = realSeasons(movie).filter(function (s) { return (s.parts || []).length >= r.parts[0]; });
    var s = r.seasons.length ? seasonOf(movie, r.seasons[0]) : with_parts.length === 1 ? with_parts[0] : null;

    if (!s || !s.parts || s.parts.length < 2) return null;

    var a = s.parts[r.parts[0] - 1];
    var b = s.parts[Math.min(r.parts[1], s.parts.length) - 1];
    var min = Math.min.apply(null, nums);
    var max = Math.max.apply(null, nums);

    if (!a || !b || a.from <= 1 || min >= a.from || max > b.to - a.from + 1) return null;

    return { season: s.season_number, offset: a.from - 1 };
  }

  // Раздача одного сезона («2 сезон: Части 1-4: 1-48 серии из 50»), а в именах всех файлов — другой сезон
  // («Bleach.Thousand-Year.Blood.War.S01E48»: стриминг считает «Тысячелетнюю войну» отдельным сериалом).
  // Номера файлов сходятся с тем, что написано в названии раздачи, — верим названию. Без серий в названии
  // верим файлам: раздача «[S02]» с файлами S01E01–10 бывает просто 1 сезоном. files — [{ s, e }]
  function seasonOverride(movie, r, files) {
    if (r.seasons.length !== 1 || !files.length) return 0;

    var n = r.seasons[0];
    var season = seasonOf(movie, n);
    var s0 = files[0].s;

    if (!season || !s0 || s0 === n || files.some(function (f) { return f.s !== s0; })) return 0;

    var nums = files.map(function (f) { return f.e; }).filter(Boolean);

    if (!nums.length) return 0;

    var min = Math.min.apply(null, nums);
    var max = Math.max.apply(null, nums);
    var range = r.ep_range;
    var fits = range ? min === range[0] && max === range[1] : r.total ? max === r.total : false;

    return fits && max <= season.episode_count ? n : 0;
  }

  // Какой серии экрана соответствует файл раздачи. ls/le — что разобрала Lampa по имени файла,
  // ctx — что известно о раздаче целиком: part — сдвиг для раздачи части (partOffset), season — сезон из
  // названия раздачи вместо сезона в именах файлов (seasonOverride)
  function fileTarget(movie, r, path, ls, le, ctx) {
    if (!le) return null;
    if (ctx && ctx.part) return { season: ctx.part.season, episode: le + ctx.part.offset };
    if (ctx && ctx.season) return { season: ctx.season, episode: le };

    var split = season_splits[movie.id];
    var to = split ? splitFile(split, r, path, ls, le) : releaseSeasonFile(movie, r, path, ls, le);
    var s = to ? to.season : pathSeason(path) || (r.seasons.length === 1 ? r.seasons[0] : 0) || ls || 1;
    var e = to ? to.episode : le;
    var season = seasonOf(movie, s);

    // Номер больше, чем серий в сезоне, — сквозная нумерация («One Piece - 0500», «Gintama TV-2 [202-252]»)
    if (season && e > season.episode_count) return absTarget(movie, e) || to;

    return to;
  }

  // Серии сезонов, которые уже загружал экран сериала: по ним названия и кадры в списке файлов
  var episode_cache = {};

  // Только что вышедший сезон: русские названия и описания в API TMDB появляются позже, чем на сайте
  // («Эпизод 1…10», описаний нет), английские — обычно сразу. Пока русских нет — берём английские
  var PLACEHOLDER = /^(эпизод|серия|episode)\s*\d+$/i;

  function englishFallback(movie, n, episodes, done) {
    var empty = episodes.filter(function (ep) { return !ep.name || PLACEHOLDER.test(ep.name.trim()); });

    if (!movie.id || !episodes.length || empty.length < episodes.length / 2) return done();

    var finished = false;
    var finish = function () {
      if (finished) return;

      finished = true;
      clearTimeout(timer);
      done();
    };
    var timer = setTimeout(finish, 6000);
    var net = new Lampa.Reguest();

    net.timeout(6000);
    net.silent(Lampa.TMDB.api('tv/' + movie.id + '/season/' + n + '?api_key=' + Lampa.TMDB.key() + '&language=en-US'), function (json) {
      var en = {};

      (json && json.episodes || []).forEach(function (ep) { en[ep.episode_number] = ep; });

      episodes.forEach(function (ep) {
        var e = en[ep.episode_number];

        if (!e) return;
        if ((!ep.name || PLACEHOLDER.test(ep.name.trim())) && e.name && !PLACEHOLDER.test(e.name.trim())) ep.name = e.name;
        if (!ep.overview && e.overview) ep.overview = e.overview;
        if (!ep.still_path && e.still_path) ep.still_path = e.still_path;
      });

      finish();
    }, finish);
  }

  function cachedEpisode(movie, s, e) {
    return (episode_cache[movie.id + ':' + s] || []).filter(function (x) { return x.episode_number === e; })[0] || null;
  }

  // Какую раздачу открыли последней: по ней понятно, какой это сезон, если в именах файлов его нет
  var torrent_ctx = null;

  function initSplit() {
    var start = Lampa.Torrent.start;

    Lampa.Torrent.start = function (el, movie) {
      torrent_ctx = el && movie ? { movie_id: movie.id, r: parseRelease(el, movie) } : null;

      return start.apply(this, arguments);
    };

    var VIDEO = /\.(mkv|mp4|avi|m4v|mov|ts|m2ts|webm|wmv|mpg|mpeg|flv)$/i;

    // Lampa считает сезон по имени файла, а без него — первым. Для разрезанного сезона, раздачи одного
    // сезона без сезона в именах файлов, раздачи части и сквозной нумерации переставляем сезон, серию и
    // прогресс у файла и его копии в плейлисте, а в уже нарисованной плитке — название, кадр, сезон и дату
    Lampa.Listener.follow('torrent_file', function (e) {
      var movie = e.params && e.params.movie;

      if (e.type === 'list_open') {
        var videos = (e.items || []).filter(function (f) { return VIDEO.test(f.path || ''); });
        var nums = videos.map(function (f) { return fileEpisodeNo(f.path); }).filter(Boolean);

        if (torrent_ctx && movie && torrent_ctx.movie_id === movie.id) {
          torrent_ctx.part = partOffset(movie, torrent_ctx.r, nums);
          torrent_ctx.season = torrent_ctx.part ? 0 : seasonOverride(movie, torrent_ctx.r, videos.map(function (f) { return { s: pathSeason(f.path), e: fileEpisodeNo(f.path) }; }));
        }

        return;
      }

      if (e.type !== 'render') return;

      var el = e.element;

      if (!movie || !movie.id || !el) return;

      var split = season_splits[movie.id];
      var ctx = torrent_ctx && torrent_ctx.movie_id === movie.id ? torrent_ctx : null;
      var r = ctx ? ctx.r : { seasons: [] };
      var ls = parseInt(el.season, 10) || 0;
      // Lampa номера не нашла («[AniDub]_BLEACH_300_[1280x720_x264]») — берём свой разбор имени файла
      var le = parseInt(el.episode, 10) || fileEpisodeNo(el.path);
      var to = fileTarget(movie, r, el.path, ls, le, ctx) || (le && !parseInt(el.episode, 10) ? { season: ls || 1, episode: le } : null);

      if (!to) return;

      var moved = to.season != el.season || to.episode != el.episode;
      var view = moved ? episodeView(movie, to.season, to.episode) : null;
      var copy = (el.playlist || []).filter(function (p) { return p !== el && p.url === el.url; })[0];
      var part = split && split.list.filter(function (p) { return p.season_number === to.season; })[0];
      var ep = split ? part && part.episodes.filter(function (x) { return x.episode_number === to.episode; })[0] : cachedEpisode(movie, to.season, to.episode);
      var name = ep && ep.name || (moved ? 'Серия ' + to.episode : '');
      var still = ep && ep.still_path ? Lampa.Api.img(ep.still_path) : moved && movie.backdrop_path ? Lampa.Api.img(movie.backdrop_path) : '';

      [el, copy].forEach(function (o) {
        if (!o) return;

        if (moved) {
          o.season = to.season;
          o.episode = to.episode;
          o.timeline = view;
          if (o.subtitle) o.subtitle = Lampa.Lang.translate('torrent_serial_episode') + ': ' + to.episode;
          if (ep && ep.air_date && Lampa.Utils.parseTime) o.air_date = Lampa.Utils.parseTime(ep.air_date).full;
        }

        // Название и кадр Lampa взяла из сезона TMDB по номеру файла (или не нашла сезон) — ставим своей серии
        if (name) o.title = o.fname = name;
        if (still) o.img = o.thumbnail = still;
      });

      var item = e.item && e.item.find ? e.item : null;

      if (!item) return;

      if (moved) {
        var line = item.find('.time-line');

        if (line.length) line.replaceWith(Lampa.Timeline.render(view));

        item.find('.torrent-serial__line b').first().text(to.season);
        item.find('.torrent-serial__episode').text(to.episode);
        if (el.air_date) item.find('.torrent-serial__line span').eq(1).text(Lampa.Lang.translate('torrent_serial_date') + ' - ' + el.air_date);
      }

      if (name) item.find('.torrent-serial__title').text(name);

      if (still) {
        var img = item.find('.torrent-serial__img');

        img.attr('data-src', still);
        if (img.attr('src')) img.attr('src', still);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Субтитры из раздачи. Lampa прикладывает к серии только файлы, в имени которых есть полное
  // имя видео, а в аниме-раздачах субтитры часто названы иначе («Subs/[Group] Title - 05.ass»
  // к «[Other] Title - 05 (1080p) [CRC].mkv»). Подбираем по номеру серии и сезону, русские —
  // первыми; приложение Lampa передаёт их в MX Player вместе с плейлистом
  // ---------------------------------------------------------------------------

  var SUB_EXT = ['ass', 'ssa', 'srt', 'vtt'];

  function fileExt(path) {
    return ((path || '').split('.').pop() || '').toLowerCase();
  }

  // Номер серии из имени файла: убираем CRC, год, разрешение, кодеки — остаётся номер
  function fileEpisodeNo(path) {
    var n = (path || '').split('/').pop().replace(/\.[^.]+$/, '').toLowerCase().replace(/_/g, ' ');

    n = n.replace(/\[[0-9a-f]{8}\]/g, ' ')
      .replace(/(?:19|20)\d{2}(?!\d)/g, ' ')
      .replace(/\b\d{3,4}x\d{3,4}\b|\b\d{3,4}[pi]\b|\b[xh]\.?26[45]\b|\b10\s?-?bit\b|\b(?:aac|ac3|eac3|flac|dts|opus)\s?\d?(?:\.\d)?\b|\b\d\.\d\b|\bv\d\b/g, ' ');

    var m = n.match(/s\d{1,2}\s*e(\d{1,4})/) || n.match(/\be(?:p|pisode)?\s*\.?\s*(\d{1,4})\b/) || n.match(/(\d{1,4})\s*(?:серия|эпизод|話)/) ||
      n.match(/第\s*(\d{1,4})/) || n.match(/\s[-–]\s*(\d{1,4})(?!\d)/) || n.match(/\[(\d{1,4})\]/);

    if (m) return +m[1];

    // Отдельно стоящее число («(SB-RAW)Bleach 01 (R2DVD …)»), а не цифра внутри слова (R2DVD)
    var alone = n.match(/(?:^|[\s\[\](){}._-])\d{1,4}(?=$|[\s\[\](){}._-])/g);

    if (alone) return +alone[alone.length - 1].replace(/\D/g, '');

    var all = n.match(/\d{1,4}/g);

    return all ? +all[all.length - 1] : 0;
  }

  // 2 — русские, 0 — язык не указан (в русских раздачах это почти всегда русские), -1 — другой язык
  function subLang(path) {
    var p = (path || '').toLowerCase();

    if (/(?:^|[^a-z])(?:rus|ru|russian)(?:[^a-z]|$)|рус/.test(p)) return 2;
    if (/(?:^|[^a-z])(?:eng|en|english|ukr|ua|jpn|jap|ja)(?:[^a-z]|$)|англ|укр/.test(p)) return -1;

    return 0;
  }

  function subLabel(path, lang) {
    var parts = path.split('/');
    var file = parts.pop().replace(/\.[^.]+$/, '');
    var dirs = parts.slice(1).join(' / ');
    var text = (lang === 2 ? 'Рус' : lang === -1 ? 'Другой язык' : 'Субтитры') + ' · ' + (dirs || file);

    if (/надпис|sign/i.test(path)) text += ' (надписи)';

    return text.length > 60 ? text.slice(0, 57) + '…' : text;
  }

  // Субтитры к видеофайлу: та же серия, тот же сезон (если он есть в пути), русские и полные — первыми
  function releaseSubs(video, files, single, url_of) {
    var ep = fileEpisodeNo(video.path);
    var season = pathSeason(video.path);
    var dir = video.path.split('/').slice(0, -1).join('/').toLowerCase();

    if (!ep && !single) return [];

    var list = files.filter(function (f) {
      if (SUB_EXT.indexOf(fileExt(f.path)) < 0) return false;
      if (single) return true;
      if (fileEpisodeNo(f.path) !== ep) return false;

      var s = pathSeason(f.path);

      return !s || !season || s === season;
    }).map(function (f) {
      var lang = subLang(f.path);
      var fdir = f.path.split('/').slice(0, -1).join('/').toLowerCase();
      var near = fdir.indexOf(dir) === 0 ? 1 : 0;

      return { f: f, lang: lang, score: lang * 10 + near * 3 - (/надпис|sign/i.test(f.path) ? 5 : 0) };
    });

    if (list.some(function (x) { return x.lang >= 0; })) list = list.filter(function (x) { return x.lang >= 0; });

    return list.sort(function (a, b) { return b.score - a.score; }).slice(0, 4).map(function (x) {
      return { label: subLabel(x.f.path, x.lang), url: url_of(x.f), lang: x.lang, signs: /надпис|sign/i.test(x.f.path) };
    });
  }

  // Имя субтитров в ссылке TorrServer (файл он берёт по index, имя в пути не читает): «<видео>.ru.ass».
  // По нему mpv узнаёт язык и сам включает русские, если в его настройках язык субтитров — русский;
  // надписи — «<видео>.ru.signs.ass», без языка, чтобы сами не включались вместо полных
  function subForPlayer(sub, video_path, russian) {
    var m = /\/stream\/([^?]*)/.exec(sub.url || '');

    if (!m || !russian) return sub;

    var ext = fileExt(decodeURIComponent(m[1]));
    var base = (video_path || '').split('/').pop().replace(/\.[^.]+$/, '') || 'subtitles';

    if (SUB_EXT.indexOf(ext) < 0) return sub;

    sub.url = sub.url.replace(/\/stream\/[^?]*/, '/stream/' + encodeURIComponent(base + '.ru' + (sub.signs ? '.signs' : '') + '.' + ext));
    if (!sub.signs) sub.language = 'ru';

    return sub;
  }

  // Субтитры, которые нашла сама Lampa (файлы с тем же именем, что у видео), — по алфавиту папок, и «надписи»
  // оказываются раньше полных («Genkaku Team надписи» < «Genkaku Team полные»). MX Player и MPV включают первые
  // из списка — и вместо субтитров показывают одни вывески. Русские полные — первыми, надписи — в конец
  function sortSubs(list) {
    return list.map(function (s, i) {
      var text = (s.label || '') + ' ' + decodeURIComponent((s.url || '').split('?')[0]);

      s.lang = subLang(text);
      s.signs = /надпис|sign/i.test(text);

      return { s: s, i: i, score: s.lang * 10 - (s.signs ? 5 : 0) };
    }).sort(function (a, b) { return (b.score - a.score) || (a.i - b.i); }).map(function (x) { return x.s; });
  }

  // Субтитры файлов открытой раздачи — по «хеш:номер файла». Ими пользуется встроенный mpv в Lampa для ПК
  // (lampa-mpv.js): Lampa запускает его с одной ссылкой на видео, без субтитров
  var sub_map = {};

  function streamKey(url) {
    var h = /[?&]link=([^&]+)/.exec(url || '');
    var i = /[?&]index=(\d+)/.exec(url || '');

    return h && i ? decodeURIComponent(h[1]).toLowerCase() + ':' + i[1] : '';
  }

  window.tvt_subs_for = function (url) {
    return sub_map[streamKey(url)] || null;
  };

  function initSubs() {
    Lampa.Listener.follow('torrent_file', function (e) {
      if (e.type === 'list_open') sub_map = {};
      if (e.type !== 'render' || !e.element || !e.params) return;

      var el = e.element;
      var files = e.params.files || [];

      if (!files.some(function (f) { return SUB_EXT.indexOf(fileExt(f.path)) >= 0; })) return;

      var hash = el.torrent_hash;
      var url_of = function (f) {
        return Lampa.Torserver.stream(f.path, hash, f.id).replace('&preload', '&play');
      };

      // Свой подбор (по номеру серии, полные русские первыми) заменяет найденное Lampa; ничего не нашли — её список, но по порядку
      var subs = releaseSubs(el, files, (e.items || []).length === 1, url_of);

      if (!subs.length && el.subtitles && el.subtitles.length) subs = sortSubs(el.subtitles);
      if (!subs.length) return;

      // Язык не указан, но раздача с русскими субтитрами («[RUS(ext), JAP+Sub]») — значит, русские
      var rus_release = !!(torrent_ctx && torrent_ctx.r && torrent_ctx.r.rus_subs);

      subs.forEach(function (s, i) {
        s.index = i;
        subForPlayer(s, el.path, s.lang === 2 || (s.lang === 0 && rus_release));
      });

      el.tvt_subs = true;
      sub_map[streamKey(el.url)] = subs;

      var copy = (el.playlist || []).filter(function (p) { return p !== el && p.url === el.url; })[0];

      el.subtitles = subs;
      if (copy) copy.subtitles = subs;
    });
  }

  // ---------------------------------------------------------------------------
  // Субтитры из интернета — OpenSubtitles, когда выбраны «Оригинал + субтитры», а в раздаче
  // русских нет. Нужен свой бесплатный ключ API (opensubtitles.com → профиль → API consumers);
  // без входа — 5 загрузок в сутки с одного IP, со входом — по лимиту аккаунта. Плеер получает
  // прямую ссылку на .srt (живёт 3 часа). Берём текущую серию и, если лимит позволяет, следующую
  // ---------------------------------------------------------------------------

  var OS_FILE = 'opensubtitles.txt';
  var OS_TEMPLATE = 'api_key: \nusername: \npassword: \n';
  var os_ready = null;

  function osConf() {
    return readJson('tvt_os');
  }

  function osSave(c) {
    Lampa.Storage.set('tvt_os', c);
    os_ready = null;
  }

  function osReady() {
    if (os_ready === null) os_ready = !!(osConf().key && field('tvt_os_on', true));

    return os_ready;
  }

  function osRequest(c, method, path, body, ok, fail) {
    var headers = { 'Api-Key': c.key, 'Accept': 'application/json', 'User-Agent': 'LampaTorrentsTV v' + VERSION };
    var url = (field('tvt_os_host', '') || 'https://' + (c.base || 'api.opensubtitles.com')) + '/api/v1' + path;

    if (body) headers['Content-Type'] = 'application/json';
    if (c.token) headers['Authorization'] = 'Bearer ' + c.token;

    if (Lampa.Platform.is('android') && window.AndroidJS && typeof AndroidJS.httpReq === 'function') {
      var net = new Lampa.Reguest();

      net.timeout(10000);
      net['native'](url, function (json) {
        if (typeof json === 'string') {
          try { json = JSON.parse(json); } catch (e) {}
        }

        ok(json);
      }, function (err) {
        fail(err && err.status || 0, err && (err.responseText || err.message) || '');
      }, body ? JSON.stringify(body) : false, { headers: headers, dataType: 'json' });

      return;
    }

    // В браузере User-Agent не задать — OpenSubtitles может отказать, на ТВ запрос идёт через приложение
    var xhr = new XMLHttpRequest();

    xhr.open(method, url, true);
    xhr.timeout = 10000;

    for (var h in headers) {
      if (h !== 'User-Agent') xhr.setRequestHeader(h, headers[h]);
    }

    xhr.onload = function () {
      var json = null;

      try { json = JSON.parse(xhr.responseText); } catch (e) {}

      if (xhr.status >= 200 && xhr.status < 300) ok(json);
      else fail(xhr.status, json && (json.message || json.error) || xhr.responseText || '');
    };
    xhr.onerror = xhr.ontimeout = function () { fail(0, 'нет связи'); };
    xhr.send(body ? JSON.stringify(body) : null);
  }

  // Вход нужен только для лимита больше 5 в сутки. Токен живёт сутки; неверный пароль не повторяем
  // чаще раза в час — OpenSubtitles просит не долбить вход
  function osLogin(c, done) {
    if (!c.user || !c.pass) return done(c);
    if (c.token && Date.now() - (c.token_t || 0) < 20 * 3600000) return done(c);
    if (c.login_fail && Date.now() - c.login_fail < 3600000) return done(c);

    c.token = '';
    c.base = '';

    osRequest(c, 'POST', '/login', { username: c.user, password: c.pass }, function (json) {
      if (json && json.token) {
        c.token = json.token;
        c.token_t = Date.now();
        c.base = json.base_url || '';
        c.login_fail = 0;
      }

      osSave(c);
      done(c);
    }, function () {
      c.login_fail = Date.now();
      osSave(c);
      done(c);
    });
  }

  // Сезон и серия для поиска: OpenSubtitles нумерует, как TMDB, а у разрезанного сезона номер —
  // как у раздач, поэтому сначала номер TMDB, потом номер раздачи
  function osTargets(movie, el) {
    var s = parseInt(el.season, 10) || 0;
    var e = parseInt(el.episode, 10) || 0;
    var out = [];
    var split = season_splits[movie.id];

    if (split) {
      var part = split.list.filter(function (p) { return p.season_number === s; })[0];
      var ep = part && part.episodes[e - 1];

      if (part && ep && ep.tmdb_episode) out.push({ season: part.tmdb_season, episode: ep.tmdb_episode });
    }

    if (!out.length || out[0].season !== s || out[0].episode !== e) out.push({ season: s, episode: e });

    return out;
  }

  function osSearch(c, q, ok, fail) {
    var params = { ai_translated: 'exclude', languages: 'ru' };

    if (q.season) {
      params.parent_tmdb_id = q.tmdb;
      params.season_number = q.season;
      params.episode_number = q.episode;
    } else params.tmdb_id = q.tmdb;

    // Параметры по алфавиту — так советует OpenSubtitles (иначе лишний редирект)
    var path = '/subtitles?' + Object.keys(params).sort().map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');

    osRequest(c, 'GET', path, null, function (json) { ok(json && json.data || []); }, fail);
  }

  // Лучший вариант: похож на имя файла (та же релиз-группа), от доверенных, без пометок для слабослышащих, популярный
  function osBest(list, filename) {
    var words = (filename || '').toLowerCase().split(/[^a-z0-9а-яё]+/).filter(function (w) {
      return w.length >= 3 && !/^(mkv|mp4|avi|1080p|720p|2160p|x264|x265|hevc|avc|aac|flac|webrip|bdrip|web|rip)$/.test(w) && !/^\d+$/.test(w);
    });
    var best = null;
    var best_score = -Infinity;

    list.forEach(function (it) {
      var a = it.attributes || {};
      var f = (a.files || [])[0];

      if (!f || a.language !== 'ru' || a.foreign_parts_only) return;

      var rel = (a.release || '').toLowerCase();
      var score = words.filter(function (w) { return rel.indexOf(w) >= 0; }).length * 5 + (a.from_trusted ? 3 : 0) - (a.hearing_impaired ? 2 : 0) + Math.log(1 + (a.download_count || 0));

      if (score > best_score) {
        best_score = score;
        best = { file_id: f.file_id, release: a.release || f.file_name || '' };
      }
    });

    return best;
  }

  function osDownload(c, file_id, ok, fail) {
    osRequest(c, 'POST', '/download', { file_id: file_id }, function (json) {
      if (json && json.link) ok(json);
      else fail(0, json && json.message || 'нет ссылки');
    }, fail);
  }

  // Перед запуском серии (autoPick): ищем субтитры для неё и следующей, кладём в серию и в её копию в плейлисте
  function onlineSubs(ap, el, go) {
    var c = osConf();

    if (!osReady() || !ap.target.want_subs || (el.subtitles && el.subtitles.length)) return go();

    var finished = false;
    var finish = function (text) {
      if (finished) return;

      finished = true;
      clearTimeout(timer);
      Lampa.Loading.stop();

      if (text) Lampa.Noty.show(text);

      go();
    };
    var timer = setTimeout(function () { finish('OpenSubtitles не ответил — запускаю без субтитров'); }, 10000);

    var playlist = el.playlist || [];
    var at = -1;

    playlist.forEach(function (p, i) { if (at < 0 && p.url === el.url) at = i; });

    var items = [el];

    if (!ap.target.movie && playlist[at + 1]) items.push(playlist[at + 1]);

    var put = function (it, subs) {
      it.subtitles = subs;
      playlist.forEach(function (p) { if (p.url === it.url) p.subtitles = subs; });
    };

    Lampa.Loading.start(function () { finish(''); }, 'Субтитры OpenSubtitles…');

    osLogin(c, function (c) {
      var got = 0;
      var remaining = null;

      var report = function () {
        if (!got) return 'OpenSubtitles: русских субтитров к этой серии нет';

        return 'Субтитры OpenSubtitles: ' + (got > 1 ? 'эта и следующая серия' : 'эта серия') + (remaining !== null ? ' · загрузок на сегодня осталось ' + remaining : '');
      };

      var each = function (i) {
        var it = items[i];

        // Следующую серию берём, только если лимит позволяет: на сегодня должно остаться хотя бы 3
        if (!it || (i > 0 && remaining !== null && remaining < 3)) return finish(report());

        var targets = ap.target.movie ? [{ season: 0, episode: 0 }] : osTargets(ap.movie, it);

        var attempt = function (j) {
          var t = targets[j];

          if (!t) return each(i + 1);

          osSearch(c, { tmdb: ap.movie.id, season: t.season, episode: t.episode }, function (list) {
            var b = osBest(list, (it.path || it.title || '').split('/').pop());

            if (!b) return attempt(j + 1);

            osDownload(c, b.file_id, function (json) {
              if (typeof json.remaining === 'number') remaining = json.remaining;

              put(it, [{ label: 'OpenSubtitles · ' + (b.release || 'рус').slice(0, 40), url: json.link }]);
              got++;
              each(i + 1);
            }, function (status, msg) {
              if (status === 406 || /quota|limit|allowed/i.test(msg || '')) return finish(got ? report() : 'OpenSubtitles: лимит загрузок на сегодня исчерпан');

              finish(got ? report() : 'OpenSubtitles: ' + (msg || status));
            });
          }, function (status, msg) {
            finish(status === 401 || status === 403 ? 'OpenSubtitles: ключ API не подошёл' : got ? report() : 'OpenSubtitles: ' + (msg || status || 'нет связи'));
          });
        };

        attempt(0);
      };

      each(0);
    });
  }

  // Ключ и вход — из файла в репозитории синхронизации (вставляются на телефоне на сайте GitHub)
  function osParse(text) {
    var get = function (name) {
      var m = new RegExp(name + '\\s*[:=][ \\t]*([^\\r\\n]*)', 'i').exec(text || '');

      return m ? m[1].trim() : '';
    };

    return { key: get('api[_\\s-]*key'), user: get('username'), pass: get('password') };
  }

  function osFromPhone() {
    if (!syncConfig()) return Lampa.Noty.show('Сначала настройте синхронизацию через GitHub (ниже)');

    var qr = window.tva_api && tva_api.qrWindow;

    storeGet(OS_FILE, function (text, sha) {
      storeInfo(function (info) {
        var path = info.dir + OS_FILE;
        var url = sha ? info.web + '/edit/' + info.branch + '/' + path.split('/').map(encodeURIComponent).join('/') :
          info.web + '/new/' + info.branch + '?filename=' + encodeURIComponent(path) + '&value=' + encodeURIComponent(OS_TEMPLATE);
        var hint = 'Откройте ссылку на телефоне. Откроется ваш приватный репозиторий на GitHub: вставьте ключ API после «api_key:» (логин и пароль OpenSubtitles — по желанию, для лимита больше 5 загрузок в сутки) и нажмите «Commit changes». Телевизор заберёт их сам.';
        var watch = function (close) {
          storeGet(OS_FILE, function (fresh) {
            var parsed = osParse(typeof fresh === 'string' ? fresh : '');

            if (!parsed.key || (sha && fresh === text)) return;

            var c = osConf();

            c.key = parsed.key;
            c.user = parsed.user;
            c.pass = parsed.pass;
            c.token = '';
            c.login_fail = 0;
            osSave(c);
            close();
            osUpdateDescr();
            Lampa.Noty.show('OpenSubtitles: ключ получен' + (parsed.user ? ', вход — ' + parsed.user : ''));
          }, function () {});
        };

        if (qr) return qr('OpenSubtitles с телефона', hint, url, [], watch);

        // Без плагина «Аниме» QR-кода нет — показываем ссылку текстом и так же ждём файл
        var html = $('<div style="line-height:1.4"></div>');
        var open = true;
        var enabled = Lampa.Controller.enabled().name;
        var tick = function () {
          if (!open) return;

          watch(function () {
            open = false;
            Lampa.Modal.close();
            Lampa.Controller.toggle(enabled);
          });
          setTimeout(tick, 5000);
        };

        html.append($('<div></div>').text(hint)).append($('<div style="margin-top:1em;word-break:break-all;opacity:.7"></div>').text(url));
        Lampa.Modal.open({
          title: 'OpenSubtitles с телефона',
          html: html,
          size: 'medium',
          onBack: function () {
            open = false;
            Lampa.Modal.close();
            Lampa.Controller.toggle(enabled);
          }
        });
        setTimeout(tick, 5000);
      }, function (status, msg) { Lampa.Noty.show('GitHub: ' + (msg || status)); });
    }, function (status, msg) { Lampa.Noty.show('GitHub: ' + (msg || status)); });
  }

  function osDescr() {
    var c = osConf();

    if (!c.key) return 'Ключ не задан';

    return 'Ключ •••• ' + c.key.slice(-4) + (c.user ? ' · вход: ' + c.user : ' · без входа: 5 загрузок в сутки');
  }

  function osUpdateDescr() {
    $('[data-name="tvt_os_phone"] .settings-param__descr').text(osDescr());
  }

  function nextEpisode(movie, s, e) {
    var list = realSeasons(movie);

    for (var i = 0; i < list.length; i++) {
      if (list[i].season_number === s) {
        if (e < list[i].episode_count) return { season: s, episode: e + 1 };
        if (list[i + 1]) return { season: list[i + 1].season_number, episode: 1 };
      }
    }

    return null;
  }

  // Где остановились: самая свежая отметка просмотра или последняя запущенная серия; досмотренная → следующая
  function resumePoint(movie) {
    var last = titlePrefs(movie).last;
    var best = null;

    realSeasons(movie).forEach(function (s) {
      for (var e = 1; e <= s.episode_count; e++) {
        var v = episodeView(movie, s.season_number, e);

        if (v.percent > 0 || v.time > 0) {
          var updated = v.updated || 0;
          var pos = s.season_number * 1000 + e;

          if (!best || updated > best.updated || (updated === best.updated && pos > best.pos)) {
            best = { season: s.season_number, episode: e, updated: updated, pos: pos, view: v };
          }
        }
      }
    });

    if (last && last.season && last.episode && (!best || (last.t || 0) > best.updated + 60000)) {
      best = { season: last.season, episode: last.episode, view: episodeView(movie, last.season, last.episode) };
    }

    if (!best) return null;

    if (isWatched(best.view)) return nextEpisode(movie, best.season, best.episode) || { season: best.season, episode: best.episode };

    return { season: best.season, episode: best.episode };
  }

  // ---------------------------------------------------------------------------
  // Запуск серии: Lampa сама добавляет торрент в TorrServer и строит список файлов,
  // мы прячем этот список, находим нужную серию и «нажимаем» её. Буферизация, плейлист,
  // субтитры и продолжение с места остаются стандартными.
  // ---------------------------------------------------------------------------

  var autoplay = null;

  function finishAutoplay() {
    if (autoplay) {
      clearTimeout(autoplay.timer);
      clearTimeout(autoplay.wait);
    }

    autoplay = null;
    $('body').removeClass('tvt-autopick');
  }

  // Фильм: Lampa строит список и плейлист из всех видеофайлов раздачи разом. В образе диска
  // или сборнике их сотни, и телевизор зависает. Оставляем только основные файлы (не меньше
  // 40% самого большого, максимум 12): сам фильм, его части или фильмы сборника.
  // Массив тот же, по которому Lampa потом идёт, поэтому меняем его на месте.
  function keepMainFiles(items) {
    var max = 0;

    items.forEach(function (f) { max = Math.max(max, f.length || 0); });

    if (!max) return;

    var keep = items.filter(function (f) { return (f.length || 0) >= max * 0.4; }).slice(0, 12);

    if (keep.length === items.length) return;

    items.length = 0;
    keep.forEach(function (f) { items.push(f); });
  }

  // missing — что делать, если нужной серии в раздаче не оказалось (экран сериала пробует другую раздачу).
  // limit — сколько ждать список файлов: другую раздачу плагин открывает сам, и если у неё нет сидов, Lampa
  // крутила бы загрузку полторы минуты; такую закрываем раньше
  function startAutoplay(el, movie, target, done, missing, limit) {
    finishAutoplay();

    var ap = autoplay = { el: el, target: target, movie: movie, files: [], picked: false, started: false, done: done, missing: missing, time: Date.now() };

    if (limit) {
      ap.wait = setTimeout(function () {
        if (autoplay !== ap || ap.opened) return;

        finishAutoplay();

        // Окно загрузки Lampa закрывается своим «Назад» — оно же отменяет торрент в TorrServer
        if (Lampa.Controller.enabled().name === 'modal') Lampa.Controller.back();

        Lampa.Noty.show('Раздача не отвечает — выберите другую в «Все раздачи»');
      }, limit);
    }

    el.poster = movie.img;
    // TorrServer подписывает торрент по title, у результатов парсера есть только Title
    if (!el.title) el.title = el.Title;

    if (Lampa.Torrent.opened) Lampa.Torrent.opened(function () { markViewed(el); });

    Lampa.Torrent.start(el, movie);
  }

  // Раздачи, в которых при открытии не нашлось ни одного файла нужного сезона («Гинтама (ТВ-7) [14 из 14]»
  // с сериями 354–367 — это 8 сезон по счёту экрана): в этом сезоне их больше не предлагаем.
  // Пометки — своей версии плагина: после обновления раскладка файлов могла стать другой
  function badKey(el, movie, season) {
    return VERSION + ':' + (movie && movie.id) + ':' + season + ':' + (btih(el) || el.Title || '');
  }

  function markBadRelease(el, movie, season) {
    var all = readJson('tvt_bad');
    var keys = Object.keys(all).filter(function (k) { return k.indexOf(VERSION + ':') === 0; });
    var keep = {};

    keys.slice(-299).forEach(function (k) { keep[k] = all[k]; });
    keep[badKey(el, movie, season)] = Date.now();
    Lampa.Storage.set('tvt_bad', keep);
  }

  function autoPick() {
    var ap = autoplay;

    if (!ap || ap.picked) return;

    var found = null;
    var t = ap.target;

    if (t.movie) {
      ap.files.forEach(function (f) {
        if (!found || (f.element.length || 0) > (found.element.length || 0)) found = f;
      });
    } else {
      ap.files.forEach(function (f) {
        if (!found && f.element.season == t.season && f.element.episode == t.episode) found = f;
      });
    }

    if (found) {
      ap.picked = true;
      if (!t.movie) rememberSession(ap.movie, t, found.element.torrent_hash, ap.files);

      // Приложение Lampa отдаёт MX Player и MPV субтитры только той серии, с которой начали, — следующие серии
      // плейлиста идут без них. У серии свои субтитры из раздачи — плееру одна серия, следующую экран сериала
      // включит сам (single). Встроенный mpv в Lampa для ПК плейлиста и так не получает
      if (!t.movie && found.element.tvt_subs && Lampa.Platform && Lampa.Platform.is && Lampa.Platform.is('android')) {
        var own = (found.element.playlist || []).filter(function (p) { return p.url === found.element.url; })[0];

        if (own) {
          found.element.playlist = [own];
          t.single = true;
        }
      }

      if (!t.movie && window.LampaMpv) t.single = true;
      onlineSubs(ap, found.element, function () { found.item.trigger('hover:enter'); });
    } else {
      var missing = !t.movie && ap.missing;

      if (!t.movie && ap.el && ap.files.length && !ap.files.some(function (f) { return f.element.season == t.season; })) markBadRelease(ap.el, ap.movie, t.season);

      finishAutoplay();

      // Серии в файлах нет — закрываем список файлов и пробуем другую раздачу, а не оставляем человека в тупике
      if (missing) {
        Lampa.Modal.close();
        Lampa.Controller.toggle('content');
        return missing();
      }

      Lampa.Noty.show(t.movie ? 'Не удалось выбрать файл — выберите вручную' : 'Серия ' + t.episode + ' не найдена в раздаче — выберите файл вручную');
    }
  }

  // ---------------------------------------------------------------------------
  // Досмотренные серии по данным TorrServer. Внешний плеер (MX) сам идёт по плейлисту
  // и возвращает в Lampa позицию только последней серии, а если Android выгрузил
  // Lampa — вообще ничего. TorrServer же помнит каждый файл, который плеер открыл
  // (&play), и не забывает его даже после удаления торрента. При запуске запоминаем,
  // что уже было отмечено, потом смотрим, какие серии плеер открыл за этот сеанс:
  // плейлист идёт по порядку, значит всё до последней открытой серии досмотрено.
  // ---------------------------------------------------------------------------

  function tsViewed(hash, ok, fail) {
    var url = Lampa.Torserver && Lampa.Torserver.url ? Lampa.Torserver.url() : '';

    if (!url || !hash) return fail();

    var net = new Lampa.Reguest();

    net.timeout(5000);
    net.silent(url + '/viewed', function (json) {
      ok((Array.isArray(json) ? json : []).filter(function (v) { return v && v.hash === hash; }).map(function (v) { return v.file_index; }));
    }, function () { fail(); }, JSON.stringify({ action: 'list', hash: hash }));
  }

  function sessionCard(movie) {
    var c = {};

    ['id', 'title', 'name', 'original_title', 'original_name', 'first_air_date', 'number_of_seasons'].forEach(function (k) {
      if (typeof movie[k] !== 'undefined') c[k] = movie[k];
    });

    return c;
  }

  function rememberSession(movie, target, hash, files) {
    if (!hash || !movie || !movie.id) return;

    var map = {};

    files.forEach(function (f) {
      var el = f.element;

      if (el.episode) map[el.id] = [parseInt(el.season || target.season, 10), parseInt(el.episode, 10)];
    });

    var session = { card: sessionCard(movie), s: target.season, e: target.episode, hash: hash, files: map, t: Date.now() };

    // Снимок до запуска: старые отметки TorrServer к этому сеансу не относятся
    tsViewed(hash, function (list) {
      var all = readJson('tvt_sessions');

      session.base = list;
      all[cardKey(movie)] = session;

      var keys = Object.keys(all);

      if (keys.length > 30) {
        keys.sort(function (a, b) { return (all[a].t || 0) - (all[b].t || 0); });
        keys.slice(0, keys.length - 30).forEach(function (k) { delete all[k]; });
      }

      Lampa.Storage.set('tvt_sessions', all);
    }, function () {});
  }

  // done(список отмеченных серий [[s, e], ...])
  function recoverSession(key, done) {
    var all = readJson('tvt_sessions');
    var ses = all[key];

    if (!ses || !ses.base || !ses.card) return done([]);

    var pos = function (p) { return p[0] * 1000 + p[1]; };

    tsViewed(ses.hash, function (list) {
      var start = ses.s * 1000 + ses.e;
      var last = start;
      var marked = [];

      list.forEach(function (idx) {
        var p = ses.files[idx];

        if (p && ses.base.indexOf(idx) === -1 && pos(p) > last) last = pos(p);
      });

      if (last > start) {
        var movie = ses.card;
        var eps = [];

        for (var id in ses.files) {
          var p = ses.files[id];

          if (pos(p) >= start && pos(p) < last && !eps.some(function (x) { return pos(x) === pos(p); })) eps.push(p);
        }

        eps.sort(function (a, b) { return pos(a) - pos(b); }).forEach(function (p) {
          var v = episodeView(movie, p[0], p[1]);

          if (!isWatched(v)) {
            v.handler(100, v.duration || 0, v.duration || 0);
            marked.push(p);
          }
        });

        var lp = [Math.floor(last / 1000), last % 1000];
        var prefs = titlePrefs(movie);

        if (!prefs.last || pos([prefs.last.season, prefs.last.episode]) < last) {
          saveTitlePrefs(movie, { last: { season: lp[0], episode: lp[1], t: Date.now() } });
        }

        // Если смотреть продолжат, следующий разбор начнётся с последней открытой серии
        ses.s = lp[0];
        ses.e = lp[1];
      }

      ses.base = list;
      all = readJson('tvt_sessions');
      all[key] = ses;
      Lampa.Storage.set('tvt_sessions', all);

      done(marked);
    }, function () { done([]); });
  }

  function markedText(marked) {
    if (!marked.length) return '';

    var by_season = {};

    marked.forEach(function (p) { (by_season[p[0]] = by_season[p[0]] || []).push(p[1]); });

    return 'Досмотренные в плеере серии отмечены: ' + Object.keys(by_season).map(function (s) {
      var e = by_season[s];

      return s + ' сезон ' + (e.length > 1 ? e[0] + '–' + e[e.length - 1] : e[0]);
    }).join(', ');
  }

  // При запуске Lampa: разбираем все незакрытые сеансы (например, Lampa выгрузили посреди просмотра)
  function recoverAllSessions() {
    var keys = Object.keys(readJson('tvt_sessions'));
    var total = [];

    var next = function () {
      var key = keys.shift();

      if (!key) {
        if (total.length) Lampa.Noty.show(markedText(total));
        return;
      }

      recoverSession(key, function (marked) {
        total = total.concat(marked);
        next();
      });
    };

    next();
  }

  function initAutoplay() {
    Lampa.Listener.follow('torrent_file', function (e) {
      if (!autoplay) return;

      if (Date.now() - autoplay.time > 180000) return finishAutoplay();

      if (e.type === 'list_open') {
        autoplay.files = [];
        autoplay.opened = true;
        clearTimeout(autoplay.wait);
        $('body').addClass('tvt-autopick');

        if (autoplay.target.movie && Array.isArray(e.items)) keepMainFiles(e.items);
      } else if (e.type === 'render') {
        autoplay.files.push({ element: e.element, item: e.item });
        clearTimeout(autoplay.timer);
        autoplay.timer = setTimeout(autoPick, 30);
      } else if (e.type === 'onenter') {
        if (!autoplay.picked || autoplay.started) return;

        var ap = autoplay;
        var back = function () {
          Lampa.Modal.close();
          Lampa.Controller.toggle('content');
          if (ap.done) ap.done();
        };

        ap.started = true;
        finishAutoplay();

        // Встроенный плеер: окно файлов закроем после выхода из плеера. Внешний (MX, VLC): сразу
        if (Lampa.Player.opened && Lampa.Player.opened()) Lampa.Player.callback(back);
        else back();
      } else if (e.type === 'list_close') {
        finishAutoplay();
      }
    });

    // Буферизацию отменили «Назад» — Lampa вернулась в скрытое окно файлов, закрываем его как обычно
    if (Lampa.Controller.listener) Lampa.Controller.listener.follow('toggle', function (e) {
      var ap = autoplay;

      if (ap && ap.picked && !ap.started && e.name === 'modal') {
        setTimeout(function () {
          if (autoplay === ap && !ap.started && Lampa.Controller.enabled().name === 'modal') {
            finishAutoplay();
            Lampa.Controller.back();
          }
        }, 0);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Экран фильма / сериала: сезоны, серии с прогрессом, выбор озвучки и качества
  // ---------------------------------------------------------------------------

  function TitleScreen(object) {
    var _this = this;
    var movie = object.movie;
    var serial = !!(movie.original_name || movie.number_of_seasons);
    var movie_year = parseInt((movie.release_date || '') + '', 10) || 0;
    var html = $('<div class="tvt-title"></div>');
    var head = $('<div class="tvt-title__head"><div class="tvt-title__name"></div><div class="tvt-title__meta"></div></div>');
    var body = $('<div class="tvt-title__body"></div>');
    var cols = {};
    var order = serial ? ['seasons', 'episodes', 'details'] : ['details'];
    var col = serial ? 'episodes' : 'details';
    var items = [];
    var seasons_data = {};
    var cur = { season: 0, episode: 0 };
    var pick = { voice: 'any', quality: '', release: null, list: [], voices: [], qualities: [] };
    var prefs = titlePrefs(movie);
    var resume = null;
    var initialized = false;
    var ready = false;
    var season_timer;
    var refresh_timer;
    var det = {};

    html.append(head).append(body);

    // --- шапка ---

    // Число сезонов — после разбора раздач: сезон TMDB может разрезаться на несколько
    function renderHead() {
      var year = ((movie.first_air_date || movie.release_date || '') + '').slice(0, 4);
      var meta = [year, (movie.genres || []).slice(0, 3).map(function (g) { return g.name; }).join(', ')];

      // Оценка Shikimori от плагина «Аниме» (anime.js) — для аниме она точнее TMDB
      var shiki = window.tvt_rating ? window.tvt_rating(movie) : 0;

      if (shiki) meta.push('Shikimori ★ ' + (+shiki).toFixed(1));
      else if (movie.vote_average) meta.push('★ ' + (+movie.vote_average).toFixed(1));

      if (serial) {
        var rs = realSeasons(movie);
        var total = 0;

        rs.forEach(function (s) { total += s.episode_count; });
        meta.push(plural(rs.length, 'сезон', 'сезона', 'сезонов') + ', ' + plural(total, 'серия', 'серии', 'серий'));
      } else if (movie.runtime) {
        meta.push(Math.floor(movie.runtime / 60) + ' ч ' + (movie.runtime % 60) + ' мин');
      }

      head.find('.tvt-title__name').text(movie.title || movie.name || '');
      head.find('.tvt-title__meta').text(meta.filter(Boolean).join('  ·  '));
    }

    delete season_splits[movie.id];
    renderHead();

    // --- колонки ---

    function makeCol(name) {
      var c = { el: $('<div class="tvt-col tvt-col--' + name + '"></div>'), last: null, scroll: new Lampa.Scroll({ mask: true, over: true }) };

      c.el.append(c.scroll.render());
      cols[name] = c;
      body.append(c.el);

      return c;
    }

    if (serial) {
      makeCol('seasons');
      makeCol('episodes');
    } else {
      makeCol('info');
    }

    makeCol('details');

    function bindFocus(el, name) {
      el.on('hover:focus', function (e) {
        cols[name].last = e.target;
        col = name;
        cols[name].scroll.update($(e.target), true);
      });

      return el;
    }

    function focusCol(name, target) {
      var c = cols[name];

      if (!c) return;

      var el = target || c.last;

      if (!el || !$.contains(c.el[0], el) || !$(el).hasClass('selector')) el = c.el.find('.selector')[0];

      col = name;
      c.last = el || null;

      Lampa.Controller.collectionSet(c.el);
      Lampa.Controller.collectionFocus(el || false, c.el);
    }

    // Пересобрали кнопки в текущей колонке — обновляем навигацию, не сбивая фокус
    function refreshCollection(focus) {
      if (Lampa.Controller.enabled().name !== 'content') return;

      focusCol(col, focus || cols[col].last);
    }

    function seasonEl(n) {
      return cols.seasons && cols.seasons.el.find('[data-season="' + n + '"]')[0];
    }

    function episodeEl(n) {
      return cols.episodes && cols.episodes.el.find('[data-episode="' + n + '"]')[0];
    }

    function primaryFor(name) {
      if (name === 'seasons') return seasonEl(cur.season);
      if (name === 'episodes') return episodeEl(cur.episode);
      if (name === 'details') return cols.details.el.find('.tvt-btn--play')[0];
    }

    // --- раздачи для текущего сезона, озвучки, качества ---

    function releasesFor(n) {
      if (!serial) return movieReleases(items, movie_year);

      var list = seasonReleases(movie, items, n);
      var bad = readJson('tvt_bad');
      var good = list.filter(function (it) { return !bad[badKey(it.el, movie, n)]; });

      return good.length ? good : list;
    }

    function matchVoice(key) {
      return function (it) {
        if (key === 'any') return true;
        if (key.indexOf('s:') === 0) return it.r.studios.indexOf(key.slice(2)) >= 0;
        if (key.indexOf('t:') === 0) return it.r.types.indexOf(key.slice(2)) >= 0;

        return true;
      };
    }

    function voiceOptions(list) {
      var counts = {};
      var labels = {};
      var fav = preferredStudios();

      list.forEach(function (it) {
        it.r.studios.forEach(function (s) {
          counts['s:' + s] = (counts['s:' + s] || 0) + 1;
          labels['s:' + s] = s;
        });

        it.r.types.forEach(function (t) {
          counts['t:' + t] = (counts['t:' + t] || 0) + 1;
          labels['t:' + t] = TYPE_LABELS[t];
        });
      });

      var studios = Object.keys(counts).filter(function (k) {
        return k.indexOf('s:') === 0 && (KNOWN_STUDIOS[labels[k]] || counts[k] >= 2 || fav.indexOf(labels[k]) >= 0);
      }).sort(function (a, b) {
        var fa = fav.indexOf(labels[a]) >= 0 ? 1 : 0;
        var fb = fav.indexOf(labels[b]) >= 0 ? 1 : 0;

        return (fb - fa) || (counts[b] - counts[a]);
      });

      var types = TYPE_ORDER.filter(function (t) { return counts['t:' + t]; }).map(function (t) { return 't:' + t; });

      return [{ key: 'any', label: 'Любая', count: list.length }].concat(types.concat(studios).map(function (k) {
        return { key: k, label: labels[k], count: counts[k], fav: fav.indexOf(labels[k]) >= 0 };
      }));
    }

    function releaseKey(it) {
      return it.el.hash || it.el.Title;
    }

    // Озвучка и качество отсекают друг друга: выбрана озвучка — в качестве остаются только те, что у неё
    // есть, выбрано качество — в озвучках только те, что есть в этом качестве. «Любая» и «Любое» снимают
    // выбор; без выбранного качества лучшей считается раздача в качестве из настроек (scoreRelease)
    function computePick() {
      var list = serial ? releasesFor(cur.season) : releasesFor(0);
      var want_voice = prefs.voice || 'any';
      var want_q = prefs.quality && prefs.quality !== 'auto' ? prefs.quality : '';

      pick.all = list;

      // Сначала озвучка — она важнее: есть в сезоне — берём, нет — «Любая»
      pick.voice = voiceOptions(list).some(function (v) { return v.key === want_voice; }) ? want_voice : 'any';

      var by_voice = list.filter(matchVoice(pick.voice));
      var qc = {};

      by_voice.forEach(function (it) { qc[it.r.res] = (qc[it.r.res] || 0) + 1; });

      // Качество: выбранное есть у этой озвучки — берём, нет — «Любое»
      pick.quality = want_q && qc[want_q] ? want_q : '';
      pick.qualities = [{ key: '', label: 'Любое', count: by_voice.length }].concat(RES_ORDER.filter(function (q) { return qc[q]; }).map(function (q) {
        return { key: q, label: q, count: qc[q] };
      }));

      pick.voices = voiceOptions(pick.quality ? list.filter(function (it) { return it.r.res === pick.quality; }) : list);
      pick.list = by_voice.filter(function (it) { return !pick.quality || it.r.res === pick.quality; });
      pick.list.forEach(function (it) {
        it.score = scoreRelease(it, serial);

        // «Оригинал + субтитры»: раздачи со своими русскими субтитрами — раньше тех, к которым их придётся искать в интернете
        if (pick.voice === 't:sub' && it.r.rus_subs) it.score += 1000;
      });
      pick.list.sort(function (a, b) { return b.score - a.score; });

      var saved = prefs.release ? pick.list.filter(function (it) { return releaseKey(it) === prefs.release; })[0] : null;

      // chosen — раздача, выбранная вручную («Другая раздача»); без неё серия идёт из лучшей раздачи, где она есть
      pick.chosen = saved || null;
      pick.release = saved || pick.list[0] || null;
    }

    // --- сезоны ---

    function seasonWatched(s) {
      var count = 0;

      for (var e = 1; e <= s.episode_count; e++) {
        if (isWatched(episodeView(movie, s.season_number, e))) count++;
      }

      return count;
    }

    function fillSeason(el, s) {
      var n = s.season_number;
      var count = releasesFor(n).filter(function (it) { return coversSeason(it, n) || !it.r.seasons.length; }).length;
      var watched = seasonWatched(s);
      var future = isFuture(s.air_date);
      var info = future ? 'Выйдет ' + shortDate(s.air_date) : count ? releases(count) : 'Нет раздач';

      if (watched) info += ' · ' + (watched === s.episode_count ? '✓ просмотрен' : watched + ' из ' + s.episode_count);

      el.find('.tvt-season__meta2').text(info);
      el.find('.tvt-bar > div').css('width', Math.round(watched / s.episode_count * 100) + '%');
      el.toggleClass('dim', !count || future);
    }

    function renderSeasons() {
      var c = cols.seasons;

      c.scroll.clear();

      realSeasons(movie).forEach(function (s) {
        var n = s.season_number;
        var el = $('<div class="tvt-season selector"><div class="tvt-season__img"><img /></div><div class="tvt-season__body"><div class="tvt-season__name"></div><div class="tvt-season__meta"></div><div class="tvt-season__meta2"></div><div class="tvt-bar"><div></div></div></div></div>');

        if (s.poster_path) el.find('img').attr('src', Lampa.Api.img(s.poster_path, 'w200'));
        else el.find('.tvt-season__img').addClass('empty');

        el.attr('data-season', n);
        el.find('.tvt-season__name').text(n + ' сезон');
        el.find('.tvt-season__meta').text(plural(s.episode_count, 'серия', 'серии', 'серий') + (s.air_date ? ' · ' + s.air_date.slice(0, 4) : '') + (s.parts && s.parts.length > 1 ? ' · ' + plural(s.parts.length, 'часть', 'части', 'частей') : ''));
        el.toggleClass('active', n === cur.season);

        fillSeason(el, s);
        bindFocus(el, 'seasons');

        el.on('hover:focus', function () {
          clearTimeout(season_timer);
          season_timer = setTimeout(function () {
            if (cur.season !== n) selectSeason(n);
          }, 350);
        }).on('hover:enter', function () {
          clearTimeout(season_timer);

          if (cur.season !== n) selectSeason(n, function () { focusCol('episodes', primaryFor('episodes')); });
          else focusCol('episodes', primaryFor('episodes'));
        });

        c.scroll.append(el);
      });
    }

    function updateSeasonStates() {
      if (!cols.seasons) return;

      realSeasons(movie).forEach(function (s) {
        var el = $(seasonEl(s.season_number));

        if (el.length) fillSeason(el, s);
      });
    }

    function loadSeason(n, call) {
      if (seasons_data[n]) {
        episode_cache[movie.id + ':' + n] = seasons_data[n].episodes;
        return call();
      }

      Lampa.Api.seasons(movie, [n], function (data) {
        var json = data && (data[n] || data[n + '']);
        var episodes = tmdbEpisodes(json);

        englishFallback(movie, n, episodes, function () {
          seasons_data[n] = { episodes: episodes };
          episode_cache[movie.id + ':' + n] = episodes;
          call();
        });
      });
    }

    function episodesOf(n) {
      var list = (seasons_data[n] && seasons_data[n].episodes || []).filter(function (e) { return e.episode_number > 0; });

      if (!list.length) {
        var s = realSeasons(movie).filter(function (x) { return x.season_number === n; })[0];

        for (var i = 1; s && i <= s.episode_count; i++) list.push({ episode_number: i, name: 'Серия ' + i });
      }

      return list;
    }

    function firstUnwatched(n) {
      var list = episodesOf(n);

      for (var i = 0; i < list.length; i++) {
        if (!isWatched(episodeView(movie, n, list[i].episode_number))) return list[i].episode_number;
      }

      return list.length ? list[0].episode_number : 1;
    }

    function selectSeason(n, call) {
      cur.season = n;

      if (cols.seasons) {
        cols.seasons.el.find('.tvt-season').each(function () {
          $(this).toggleClass('active', parseInt($(this).attr('data-season'), 10) === n);
        });
      }

      computePick();
      renderOptions();

      cols.episodes.scroll.clear();
      cols.episodes.scroll.append($('<div class="tvt-col__wait">Загружаем серии…</div>'));

      loadSeason(n, function () {
        if (cur.season !== n) return;

        try {
          cur.episode = resume && resume.season === n ? resume.episode : firstUnwatched(n);

          renderEpisodes();
          updateDetails();

          if (col === 'episodes' || col === 'details') refreshCollection(col === 'episodes' ? primaryFor('episodes') : null);
          if (call) call();
        } catch (e) {
          _this.fail(e);
        }
      });
    }

    // --- серии ---

    // Из какой раздачи смотреть серию e: выбранная вручную, если серия в ней есть; иначе лучшая из раздач той же
    // озвучки и качества (у выбранной вручную — сначала её продолжение той же студии), потом той же озвучки,
    // потом любая («Блич»: 1–167 из одной раздачи, 168–366 — из её продолжения). null — серии нет ни в одной
    function releaseFor(e) {
      var n = cur.season;
      var has = function (it) { return coversEpisode(it, e, movie, n); };
      var chosen = pick.chosen;
      var by_score = function (list) { return list.sort(function (a, b) { return scoreRelease(b, true) - scoreRelease(a, true); }); };

      if (!serial) return pick.release;
      if (chosen && has(chosen)) return chosen;

      // pick.list уже по убыванию оценки — первая подходящая и есть лучшая (у «Ван-Писа» сотни раздач на сезон)
      var first = null;

      for (var i = 0; i < pick.list.length; i++) {
        var it = pick.list[i];

        if (!has(it)) continue;
        if (!chosen || it.r.studios.some(function (st) { return chosen.r.studios.indexOf(st) >= 0; })) return it;
        if (!first) first = it;
      }

      if (first) return first;

      var all = (pick.all || releasesFor(n)).filter(has);
      var voice = all.filter(matchVoice(pick.voice));

      return by_score(voice.length ? voice : all)[0] || null;
    }

    function fillEpisode(el, e, ep) {
      var v = episodeView(movie, cur.season, e);
      var state = '';
      var cls = '';
      var from = pick.all && pick.all.length ? releaseFor(e) : null;

      if (ep && isFuture(ep.air_date)) {
        state = 'Выйдет ' + shortDate(ep.air_date);
        cls = 'future';
      } else if (isWatched(v)) {
        state = '✓';
        cls = 'watched';
      } else if (v.time > 0) {
        state = '▶ ' + timeText(v.time);
        cls = 'started';
      } else if (pick.all && pick.all.length && !from) {
        state = 'нет в раздаче';
        cls = 'missing';
      } else if (from && !matchVoice(pick.voice)(from)) {
        state = 'другая озвучка';
      }

      el.find('.tvt-ep__state').text(state);
      el.removeClass('future watched started missing').addClass(cls);
      el.find('.tvt-bar > div').css('width', (v.percent || 0) + '%');
    }

    function renderEpisodes() {
      var c = cols.episodes;
      var list = episodesOf(cur.season);
      var parts = (seasonOf(movie, cur.season) || {}).parts || [];

      c.scroll.clear();
      c.last = null;

      list.forEach(function (ep) {
        var e = ep.episode_number;
        var part = parts.length > 1 ? parts.filter(function (p) { return p.from === e; })[0] : null;

        // Сезон из нескольких частей: перед первой серией части — её название
        if (part) {
          var head = $('<div class="tvt-part"><span class="tvt-part__n"></span><span class="tvt-part__name"></span></div>');

          head.find('.tvt-part__n').text('Часть ' + part.n);
          head.find('.tvt-part__name').text([part.name, plural(part.to - part.from + 1, 'серия', 'серии', 'серий')].filter(Boolean).join(' · '));
          c.scroll.append(head);
        }
        var el = $('<div class="tvt-ep selector"><div class="tvt-ep__img"><img /><div class="tvt-ep__num"></div><div class="tvt-ep__go">▶</div><div class="tvt-bar"><div></div></div></div><div class="tvt-ep__body"><div class="tvt-ep__name"></div><div class="tvt-ep__meta"></div></div><div class="tvt-ep__state"></div></div>');

        if (ep.still_path) el.find('img').attr('src', Lampa.Api.img(ep.still_path, 'w300'));
        // Кадра нет (сезон только вышел) — фон сериала, чтобы плитка не была пустой
        else if (movie.backdrop_path) el.find('img').attr('src', Lampa.Api.img(movie.backdrop_path, 'w300'));
        else el.find('.tvt-ep__img').addClass('empty');

        el.attr('data-episode', e);
        el.find('.tvt-ep__num').text(e);
        el.find('.tvt-ep__name').text(ep.name || 'Серия ' + e);
        el.find('.tvt-ep__meta').text([ep.runtime ? ep.runtime + ' мин' : '', shortDate(ep.air_date)].filter(Boolean).join(' · '));
        el.toggleClass('active', e === cur.episode);

        fillEpisode(el, e, ep);
        bindFocus(el, 'episodes');

        var choose = function () {
          if (cur.episode === e) return false;

          cur.episode = e;
          c.el.find('.tvt-ep').removeClass('active');
          el.addClass('active');
          updateDetails();

          return true;
        };

        el.on('hover:focus', function () {
          if (!touchMode()) choose();
        }).on('hover:enter', function () {
          // На телефоне фокуса нет: первое касание выбирает серию (видно озвучку и раздачу), второе — запускает
          if (touchMode() && choose()) return;

          cur.episode = e;
          _this.play(false);
        }).on('hover:long', function () {
          _this.episodeMenu(e);
        });

        c.scroll.append(el);
      });

      c.last = primaryFor('episodes') || null;

      if (c.last) c.scroll.update($(c.last), true);
    }

    function updateEpisodeStates() {
      if (!cols.episodes) return;

      var list = episodesOf(cur.season);

      list.forEach(function (ep) {
        var el = $(episodeEl(ep.episode_number));

        if (el.length) fillEpisode(el, ep.episode_number, ep);
      });
    }

    this.episodeMenu = function (e) {
      var v = episodeView(movie, cur.season, e);
      var enabled = Lampa.Controller.enabled().name;
      var menu = [{ title: 'Смотреть', play: true }];

      if (v.time > 0 || v.percent > 0) menu.push({ title: 'Смотреть с начала', restart: true });

      menu.push(isWatched(v) ? { title: 'Снять отметку «просмотрено»', unwatch: true } : { title: 'Отметить просмотренной', watch: true });
      menu.push({ title: 'Выбрать файл в раздаче вручную', manual: true });

      Lampa.Select.show({
        title: cur.season + ' сезон, ' + e + ' серия',
        items: menu,
        onBack: function () { Lampa.Controller.toggle(enabled); },
        onSelect: function (a) {
          Lampa.Controller.toggle(enabled);
          cur.episode = e;

          if (a.play) _this.play(false);
          else if (a.restart) _this.play(true);
          else if (a.watch) v.handler(100, v.duration || 0, v.duration || 0);
          else if (a.unwatch) v.handler(0, 0, v.duration || 0);
          else if (a.manual && pick.release) {
            _this.start();
            pick.release.el.poster = movie.img;
            Lampa.Torrent.start(pick.release.el, movie);
          }

          _this.refresh();
        }
      });
    };

    // --- правая панель: описание, кнопки, озвучка, качество, раздача ---

    function button(text, cls, onEnter) {
      var b = $('<div class="tvt-btn selector"></div>').addClass(cls).text(text);

      b.on('hover:enter', onEnter);

      return bindFocus(b, 'details');
    }

    function optChip(label, count, active, onEnter, key, fav) {
      var c = $('<div class="tvt-chip selector"></div>').text(label);

      if (count !== '' && typeof count !== 'undefined') c.append($('<span class="tvt-chip__count"></span>').text(count));
      if (active) c.addClass('active');
      if (fav) c.addClass('pref');

      c.attr('data-key', key);
      c.on('hover:enter', onEnter);

      return bindFocus(c, 'details');
    }

    function buildDetails() {
      var d = $(
        '<div class="tvt-det">' +
          '<div class="tvt-det__top">' +
            '<div class="tvt-det__img"><img /></div>' +
            '<div class="tvt-det__info">' +
              '<div class="tvt-det__title"></div>' +
              '<div class="tvt-det__meta"></div>' +
              '<div class="tvt-det__text"></div>' +
            '</div>' +
          '</div>' +
          '<div class="tvt-det__buttons"></div>' +
          '<div class="tvt-det__group"><div class="tvt-det__label">Озвучка</div><div class="tvt-det__chips tvt-det__voice"></div></div>' +
          '<div class="tvt-det__group"><div class="tvt-det__label">Качество</div><div class="tvt-det__chips tvt-det__quality"></div></div>' +
          '<div class="tvt-det__group"><div class="tvt-det__label">Раздача</div><div class="tvt-det__rel"></div><div class="tvt-det__tracks"></div><div class="tvt-det__chips tvt-det__relbtn"></div></div>' +
        '</div>'
      );

      det = {
        root: d,
        img: d.find('.tvt-det__img img'),
        title: d.find('.tvt-det__title'),
        meta: d.find('.tvt-det__meta'),
        text: d.find('.tvt-det__text'),
        buttons: d.find('.tvt-det__buttons'),
        voice: d.find('.tvt-det__voice'),
        quality: d.find('.tvt-det__quality'),
        rel: d.find('.tvt-det__rel'),
        tracks: d.find('.tvt-det__tracks'),
        relbtn: d.find('.tvt-det__relbtn')
      };

      det.play = button('▶ Смотреть', 'tvt-btn--play', function () { _this.play(false); });
      det.restart = button('С начала', 'tvt-btn--restart', function () { _this.play(true); });
      det.all = button('Все раздачи', 'tvt-btn--all', function () { _this.allReleases(); });

      det.buttons.append(det.play).append(det.restart).append(det.all);

      cols.details.scroll.append(d);
    }

    function currentView() {
      return serial ? episodeView(movie, cur.season, cur.episode) : movieView(movie);
    }

    function updateDetails() {
      var v = currentView();

      if (serial) {
        var ep = episodesOf(cur.season).filter(function (x) { return x.episode_number === cur.episode; })[0] || {};
        var img = ep.still_path || movie.backdrop_path;

        det.img.attr('src', img ? Lampa.Api.img(img, 'w780') : '');
        det.title.text(cur.episode + '. ' + (ep.name || 'Серия ' + cur.episode));
        det.meta.text([cur.season + ' сезон, ' + cur.episode + ' серия', ep.runtime ? ep.runtime + ' мин' : '', shortDate(ep.air_date)].filter(Boolean).join('  ·  '));
        det.text.text(ep.overview || '');
      } else {
        det.img.attr('src', movie.backdrop_path ? Lampa.Api.img(movie.backdrop_path, 'w780') : '');
        det.title.text(movie.title || '');
        det.meta.text([movie.original_title !== movie.title ? movie.original_title : '', movie.tagline || ''].filter(Boolean).join('  ·  '));
        det.text.text('');
      }

      var started = v.time > 0 && !isWatched(v);

      det.play.text(started ? '▶ Продолжить с ' + timeText(v.time) : isWatched(v) ? '▶ Смотреть снова' : '▶ Смотреть');

      var show_restart = started;

      if (det.restart.hasClass('selector') !== show_restart) {
        det.restart.toggleClass('selector', show_restart).toggleClass('hide', !show_restart);
        if (col === 'details') refreshCollection();
      }

      det.all.text('Все раздачи' + (items.length ? ' (' + items.length + ')' : ''));

      if (serial && det.rel) renderRelease();
    }

    // Раздача, из которой пойдёт текущая серия: выбранной серии в ней нет — показываем ту, откуда её возьмём
    function renderRelease() {
      var it = serial ? releaseFor(cur.episode) || pick.release : pick.release;

      if (!it) {
        det.rel.text(items.length ? 'Нет раздач для этого сезона' : 'Раздачи не найдены');
        det.tracks.text('');
        return;
      }

      var r = it.r;
      var el = it.el;
      var line1 = [r.res + (r.hdr ? ' ' + r.hdr : ''), r.source, r.codec, r.channels, r.seasons.length > 1 ? 'Сезоны ' + r.seasons[0] + '–' + r.seasons[r.seasons.length - 1] : '', r.episodes].filter(Boolean).join(' · ');
      var line2 = [sizeText(el.Size), '▲ ' + (parseInt(el.Seeders, 10) || 0), trackerText(el.Tracker), sourceText(el), dateText(el.PublishDate)].filter(Boolean).join(' · ');

      det.rel.empty();

      if (pick.chosen && it !== pick.chosen) det.rel.append($('<div class="tvt-det__note"></div>').text('Серия ' + cur.episode + ' — из другой раздачи'));

      det.rel.append($('<div class="tvt-det__rel1"></div>').text(line1)).append($('<div class="tvt-det__rel2"></div>').text(line2));
      det.tracks.text(r.tracks.length ? 'Дорожки: ' + r.tracks.slice(0, 6).join(', ') + (r.tracks.length > 6 ? ' +' + (r.tracks.length - 6) : '') : (r.types.map(function (t) { return TYPE_LABELS[t]; }).concat(r.studios.slice(0, 4))).join(', '));
    }

    function renderOptions() {
      var focus_key = col === 'details' && cols.details.last ? $(cols.details.last).attr('data-key') : '';

      det.voice.empty();
      det.quality.empty();
      det.relbtn.empty();

      var max = 8;

      pick.voices.slice(0, max).forEach(function (v) {
        det.voice.append(optChip(v.label, v.count, v.key === pick.voice, function () { _this.setVoice(v.key, v.label); }, 'v:' + v.key, v.fav));
      });

      if (pick.voices.length > max) {
        det.voice.append(optChip('Ещё ' + (pick.voices.length - max) + ' ▾', '', false, function () {
          var enabled = Lampa.Controller.enabled().name;

          Lampa.Select.show({
            title: 'Озвучка',
            items: pick.voices.map(function (v) {
              return { title: v.label, subtitle: releases(v.count), key: v.key, selected: v.key === pick.voice };
            }),
            onBack: function () { Lampa.Controller.toggle(enabled); },
            onSelect: function (a) {
              Lampa.Controller.toggle(enabled);
              _this.setVoice(a.key, a.title);
            }
          });
        }, 'v:more'));
      }

      pick.qualities.forEach(function (q) {
        det.quality.append(optChip(q.label, q.count, q.key === pick.quality, function () { _this.setQuality(q.key); }, 'q:' + (q.key || 'any')));
      });

      renderRelease();

      if (pick.list.length > 1) {
        det.relbtn.append(optChip('Другая раздача (' + pick.list.length + ') ▾', '', false, function () { _this.chooseRelease(); }, 'r:choose'));
      }

      if (serial && cols.episodes) updateEpisodeStates();

      if (col === 'details') {
        var focus = focus_key ? cols.details.el.find('[data-key="' + focus_key.replace(/"/g, '\\"') + '"]')[0] : null;

        refreshCollection(focus || det.play[0]);
      }
    }

    this.setVoice = function (key, label) {
      prefs.voice = key;
      prefs.release = '';
      saveTitlePrefs(movie, { voice: key, release: '' });

      if (key.indexOf('s:') === 0) rememberStudio(label);

      computePick();
      renderOptions();
    };

    this.setQuality = function (q) {
      prefs.quality = q;
      prefs.release = '';
      saveTitlePrefs(movie, { quality: q, release: '' });
      computePick();
      renderOptions();
    };

    this.chooseRelease = function () {
      var enabled = Lampa.Controller.enabled().name;

      Lampa.Select.show({
        title: 'Раздача',
        items: pick.list.slice(0, 40).map(function (it) {
          var r = it.r;

          return {
            title: it.el.Title,
            subtitle: [r.res + (r.hdr ? ' ' + r.hdr : ''), sizeText(it.el.Size), '▲ ' + (parseInt(it.el.Seeders, 10) || 0), trackerText(it.el.Tracker), sourceText(it.el)].filter(Boolean).join(' · '),
            key: releaseKey(it),
            selected: it === pick.release
          };
        }),
        onBack: function () { Lampa.Controller.toggle(enabled); },
        onSelect: function (a) {
          Lampa.Controller.toggle(enabled);
          prefs.release = a.key;
          saveTitlePrefs(movie, { release: a.key });
          computePick();
          renderOptions();
        }
      });
    };

    this.allReleases = function () {
      Lampa.Activity.push({
        url: '',
        title: Lampa.Lang.translate('title_torrents'),
        component: 'tvt_torrents',
        search: object.search,
        search_one: object.search_one,
        search_two: object.search_two,
        movie: movie,
        page: 1
      });
    };

    // --- запуск ---

    this.play = function (from_start) {
      // Цель фиксируем сразу: дальше фокус может переехать и сменить текущую серию
      var target = serial ? { season: cur.season, episode: cur.episode } : { movie: true };
      var it = serial ? releaseFor(cur.episode) || pick.release : pick.release;

      if (!it) return Lampa.Noty.show('Нет раздачи для просмотра');

      if (from_start) {
        var v = currentView();

        if (v.time > 0 || v.percent > 0) v.handler(0, 0, v.duration || 0);
      }

      if (serial) {
        resume = { season: target.season, episode: target.episode };
        saveTitlePrefs(movie, { last: { season: target.season, episode: target.episode, t: Date.now() } });
        cancelNext();
        last_launch = { target: target, t: Date.now() };
      }

      launch(it, target, []);
    };

    // Запуск серии из раздачи. Серии в файлах не оказалось (раздача другого сезона, неполная) —
    // пробуем следующую подходящую раздачу той же озвучки, потом любой; не больше трёх попыток
    function launch(it, target, tried) {
      tried.push(releaseKey(it));

      // Выбраны «Оригинал + субтитры», а в раздаче русских субтитров нет — их поищет OpenSubtitles
      target.want_subs = pick.voice === 't:sub' && !it.r.rus_subs;

      startAutoplay(it.el, movie, target, function () {
        _this.refresh();
      }, serial ? function () {
        var alt = releasesFor(target.season).filter(function (x) {
          return tried.indexOf(releaseKey(x)) < 0 && coversEpisode(x, target.episode, movie, target.season);
        });
        var same_voice = alt.filter(matchVoice(pick.voice));

        alt = same_voice.length ? same_voice : alt;

        // Раздача без сидов у TorrServer грузится до полутора минут и заканчивается ошибкой — такие только в крайнем случае
        var seeded = alt.filter(function (x) { return (parseInt(x.el.Seeders, 10) || 0) > 0; });

        alt = (seeded.length ? seeded : alt).sort(function (a, b) { return scoreRelease(b, true) - scoreRelease(a, true); });

        if (!alt.length || tried.length >= 3) {
          return Lampa.Noty.show('Серии ' + target.episode + ' нет в ' + (tried.length > 1 ? tried.length + ' раздачах' : 'этой раздаче') + ' — выберите раздачу в «Все раздачи»');
        }

        Lampa.Noty.show('Серии ' + target.episode + ' нет в этой раздаче — открываю другую');
        launch(alt[0], target, tried);
      } : null, tried.length > 1 ? 30000 : 0);
    }

    // Прогресс изменился (плеер вернул позицию) — обновляем отметки на месте, не трогая фокус
    this.refresh = function () {
      if (!ready) return;

      updateSeasonStates();
      updateEpisodeStates();
      updateDetails();
      sendProgress();
      checkNext();
    };

    // --- следующая серия сама: плеер получил одну серию (single — ради её субтитров, см. autoPick) ---

    var last_launch = null;
    var next_timer = null;

    function cancelNext(text) {
      if (!next_timer) return;

      clearTimeout(next_timer);
      next_timer = null;
      $(document).off('keydown.tvtnext');

      if (text) Lampa.Noty.show(text);
    }

    // Серию досмотрели (≥ 90%) и вернулись из плеера — через 5 секунд включаем следующую, любая кнопка отменяет
    function checkNext() {
      var l = last_launch;

      if (!l || l.done || !l.target.single || next_timer) return;
      // Lampa для ПК: mpv ещё играет (титры), отметка «досмотрено» приходит раньше конца
      if (window.LampaMpv && window.LampaMpv.isPlaying()) return;
      if (Date.now() - l.t < 60000 || !isWatched(episodeView(movie, l.target.season, l.target.episode))) return;

      l.done = true;

      var nx = nextEpisode(movie, l.target.season, l.target.episode);
      var act = Lampa.Activity.active && Lampa.Activity.active();

      if (!nx || (act && act.activity !== _this.activity)) return;

      var ep = episodesOf(nx.season).filter(function (x) { return x.episode_number === nx.episode; })[0];

      if (ep && isFuture(ep.air_date)) return;

      Lampa.Noty.show('Через 5 секунд — ' + nx.season + ' сезон, ' + nx.episode + ' серия. Любая кнопка — отменить');
      $(document).on('keydown.tvtnext', function () { cancelNext('Следующая серия не включится'); });

      next_timer = setTimeout(function () {
        next_timer = null;
        $(document).off('keydown.tvtnext');

        var go = function () {
          cur.episode = nx.episode;

          if (cols.episodes) {
            cols.episodes.el.find('.tvt-ep').removeClass('active');
            $(episodeEl(nx.episode)).addClass('active');
          }

          updateDetails();
          _this.play(false);
        };

        if (cur.season !== nx.season) selectSeason(nx.season, go);
        else go();
      }, 5000);
    }

    // Lampa для ПК: mpv закрылся — Lampa уже записала, докуда досмотрели
    if (window.LampaMpv && window.LampaMpv.on) {
      window.LampaMpv.on(function (type) {
        if (type === 'exit' && !_this.destroyed) setTimeout(function () { _this.refresh(); }, 1500);
      });
    }

    // Сколько серий каждого сезона досмотрено (в нумерации раздач) — для других плагинов,
    // например anime.js переносит это в список Shikimori
    function sendProgress() {
      if (!serial) return;

      var list = realSeasons(movie).map(function (s) {
        var upto = 0;

        for (var e = 1; e <= s.episode_count; e++) if (isWatched(episodeView(movie, s.season_number, e))) upto = e;

        return { season: s.season_number, episodes: s.episode_count, watched: upto, air_date: s.air_date || '', parts: s.shiki || null };
      });

      Lampa.Listener.send('tvt_progress', { movie: movie, seasons: list });
    }

    function onTimeline() {
      clearTimeout(refresh_timer);
      refresh_timer = setTimeout(function () { _this.refresh(); }, 300);
    }

    if (Lampa.Timeline.listener) Lampa.Timeline.listener.follow('update', onTimeline);

    // --- жизненный цикл ---

    this.create = function () {
      return this.render();
    };

    this.render = function () {
      return html;
    };

    function fitHeight() {
      var top = html[0].getBoundingClientRect().top;

      if (top > 0) html.css('height', Math.max(200, window.innerHeight - top) + 'px');
    }

    this.initialize = function () {
      this.activity.loader(true);

      buildDetails();

      if (!serial) {
        var info = $('<div class="tvt-info"><div class="tvt-info__poster"><img /></div><div class="tvt-info__text"></div></div>');

        var poster = movie.img || (movie.poster_path ? Lampa.Api.img(movie.poster_path, 'w500') : '');

        if (poster) info.find('img').attr('src', poster);
        else info.find('.tvt-info__poster').remove();

        info.find('.tvt-info__text').text(movie.overview || '');
        cols.info.scroll.append(info);
      }

      loadUnits();

      searchReleases(object, function (data) {
        items = (data && data.Results ? data.Results : []).map(function (el) {
          return { el: el, r: parseRelease(el, movie) };
        });

        if (!serial) return _this.afterLoad();

        prepareSeasons(function () {
          // Сначала досмотренное в плеере по данным TorrServer — чтобы «Продолжить» сразу указывало верно
          recoverSession(cardKey(movie), function (marked) {
            pullWatched(function (text) {
              _this.afterLoad();

              if (marked.length) Lampa.Noty.show(markedText(marked));
              else if (text) Lampa.Noty.show(text);
            });
          });
        });
      }, function () {
        items = [];
        _this.afterLoad();
        Lampa.Noty.show('Парсер не ответил — раздачи не загружены');
      });
    };

    // Досмотренное в другом сервисе (anime.js — список Shikimori): отмечаем серии до сборки экрана.
    // Ответ не пришёл за 5 секунд — экран собирается без него, отметки появятся, когда придёт
    function pullWatched(done) {
      if (typeof window.tvt_external_watched !== 'function') return done('');

      var finished = false;
      var timer = setTimeout(function () {
        finished = true;
        done('');
      }, 5000);

      var seasons = realSeasons(movie).map(function (s) {
        var upto = 0;

        for (var e = 1; e <= s.episode_count; e++) if (isWatched(episodeView(movie, s.season_number, e))) upto = e;

        return { season: s.season_number, episodes: s.episode_count, watched: upto, air_date: s.air_date || '', parts: s.shiki || null };
      });

      // Каждая отметка в Lampa — запись всей истории просмотров и обновление всех карточек на
      // экране, поэтому серии отмечаем по 10 за раз, отдавая кадр между пачками: на слабом ТВ
      // сотня серий не замораживает экран
      var apply = function (list, cb) {
        var parts = [];
        var queue = [];

        (list || []).forEach(function (x) {
          var s = seasons.filter(function (y) { return y.season === x.season; })[0];
          var n = Math.min(x.watched, s ? s.episodes : 0);
          var count = 0;

          for (var e = 1; e <= n; e++) {
            var v = episodeView(movie, x.season, e);

            if (!isWatched(v)) {
              queue.push(v);
              count++;
            }
          }

          if (count) parts.push(x.season + ' сезон: 1–' + n);
        });

        var step = function () {
          queue.splice(0, 10).forEach(function (v) { v.handler(100, v.duration || 0, v.duration || 0); });

          if (queue.length) return setTimeout(step, 16);

          cb(parts.length ? 'Shikimori: отмечены просмотренными ' + parts.join(', ') : '');
        };

        step();
      };

      try {
        window.tvt_external_watched(movie, seasons, function (list) {
          // Ответ опоздал — экран уже собран, отметки ставим и обновляем его
          if (finished) {
            return apply(list, function (text) {
              if (text && ready) {
                Lampa.Noty.show(text);
                _this.refresh();
              }
            });
          }

          clearTimeout(timer);
          finished = true;

          apply(list, done);
        });
      } catch (e) {
        console.log('TV Torrents', 'external watched', e);

        if (!finished) {
          finished = true;
          clearTimeout(timer);
          done('');
        }
      }
    }

    // Части сериала на Shikimori (anime.js) — запрашиваем сразу, параллельно с поиском раздач.
    // Нет anime.js, не аниме или нет ответа за 8 секунд — сезоны по названиям раздач, как раньше
    var units_wait = [];
    var units_state = { done: false, list: null };

    function loadUnits() {
      var finish = function (list) {
        if (units_state.done) return;

        units_state.done = true;
        units_state.list = list && list.length ? list : null;
        units_wait.splice(0).forEach(function (cb) { cb(units_state.list); });
      };

      if (!serial || typeof window.tvt_units !== 'function') return finish(null);

      setTimeout(function () { finish(null); }, 8000);

      try {
        window.tvt_units(movie, finish);
      } catch (e) {
        console.log('TV Torrents', 'units', e);
        finish(null);
      }
    }

    function withUnits(cb) {
      if (units_state.done) cb(units_state.list);
      else units_wait.push(cb);
    }

    // Сезоны TMDB не совпадают с сезонами раздач (или у сезона есть части) — грузим серии всех сезонов TMDB
    // и раскладываем их: по тайтлам Shikimori, а без них — по названиям раздач (buildSeasons)
    function prepareSeasons(done) {
      var finished = false;
      var finish = function () {
        if (finished) return;

        finished = true;
        done();
      };

      withUnits(function (units) {
        var tmdb = tmdbSeasons(movie);

        if (units) unitNames(movie, units);
        var plan = units ? null : planSplit(movie, items);

        // Разбор сезонов — в консоль Lampa (меню → Консоль), чтобы было видно, почему сезон разрезан или нет
        var rel = releaseSeasons(items);
        var log = function (msg) {
          console.log('TV Torrents', 'сезоны', movie.name || movie.title, '| раздачи: ' + Object.keys(rel).map(function (s) { return s + 'с=' + (rel[s].count || '?') + '/' + rel[s].seen; }).join(' ') + ' | TMDB: ' + tmdb.map(function (s) { return s.season_number + 'с=' + s.episode_count; }).join(' ') +
            (units ? ' | Shikimori: ' + units.map(function (u) { return u.id + (u.season ? '(' + u.season + ')' : '') + '=' + (u.episodes || u.aired_episodes); }).join(' ') : '') + ' | ' + msg);
        };

        // Серии всех сезонов нужны, только если есть что раскладывать: несколько тайтлов Shikimori
        // (или тайтл не совпадает с сезоном TMDB) либо план по раздачам
        var need = units ? unitsUsable(units, tmdb) && !unitsMatchTmdb(units, tmdb) : !!plan;

        if (!need) {
          if (isAnimation(movie)) log(units ? 'как на TMDB' : 'без изменений');
          return finish();
        }

        var nums = tmdb.map(function (s) { return s.season_number; });
        var timer = setTimeout(function () {
          log('серии TMDB не загрузились за 15 с');
          finish();
        }, 15000);

        Lampa.Api.seasons(movie, nums, function (data) {
          clearTimeout(timer);

          if (finished) return;

          try {
            var built = buildSeasons(movie, items, data || {}, units);
            var list = built.list;

            log(built.how + (built.plan ? ' | план ' + built.plan.plan.map(function (p) { return p.tmdb.season_number + '→' + p.seasons.join(',') + '(' + p.counts.join(',') + ')'; }).join(' ') + (built.plan.tail ? ' +хвост' : '') : '') +
              ' | серий TMDB: ' + nums.map(function (n) { var j = data && (data[n] || data[n + '']); return n + 'с=' + (j ? tmdbEpisodes(j).length : 'нет'); }).join(' ') +
              ' | итог: ' + (list ? list.map(function (p) { return p.season_number + 'с=' + p.episode_count + (p.parts && p.parts.length > 1 ? '[' + p.parts.map(function (x) { return x.to - x.from + 1; }).join('+') + ']' : ''); }).join(' ') : 'как на TMDB'));

            if (list) {
              season_splits[movie.id] = { list: list };
              list.forEach(function (p) { seasons_data[p.season_number] = { episodes: p.episodes }; });
            } else {
              nums.forEach(function (n) {
                var json = data && (data[n] || data[n + '']);

                if (json) seasons_data[n] = { episodes: tmdbEpisodes(json) };
              });
            }

            if (units && /^Shikimori/.test(built.how) && titlePrefs(movie).model !== 2) moveOldMarks(data || {}, list || tmdbList(movie, data || {}));

            renderHead();
          } catch (e) {
            log('ошибка: ' + (e && e.message || e));
          }

          finish();
        });
      });
    }

    // Раньше (до 1.14) сезоны этого аниме собирались по названиям раздач — если вышло иначе, переносим
    // отметки и последнюю серию в новую нумерацию. Один раз на тайтл; записи — по 10 за кадр, как в pullWatched
    function moveOldMarks(data, now) {
      var plan = planSplit(movie, items);
      var before = (plan && splitSeasons(movie, data, plan)) || tmdbList(movie, data);
      var shape = function (list) { return list.map(function (s) { return s.season_number + ':' + s.episodes.length; }).join(' '); };
      var patch = { model: 2 };

      if (shape(before) !== shape(now)) {
        var queue = moveMarks(movie, before, now);
        var last = titlePrefs(movie).last;

        if (last) {
          var abs = 0;

          before.forEach(function (s) {
            s.episodes.forEach(function (ep) { if (s.season_number === last.season && ep.episode_number === last.episode) abs = ep.abs; });
          });

          now.forEach(function (s) {
            s.episodes.forEach(function (ep) { if (abs && ep.abs === abs) patch.last = { season: s.season_number, episode: ep.episode_number, t: last.t }; });
          });
        }

        console.log('TV Torrents', 'сезоны', movie.name || movie.title, '| нумерация сменилась, переношу отметок: ' + queue.length);

        var step = function () {
          queue.splice(0, 10).forEach(function (w) { w[0].handler(w[1], w[2], w[3]); });

          if (queue.length) return setTimeout(step, 16);
          if (ready) _this.refresh();
        };

        step();
      }

      saveTitlePrefs(movie, patch);

      if (patch.last) prefs.last = patch.last;
    }

    // Последняя серия могла быть запомнена в нумерации TMDB (1 сезон, 30 серия) — переводим в нумерацию раздач
    function splitPoint(p) {
      var split = season_splits[movie.id];

      if (!p || !split) return p;

      var part = split.list.filter(function (x) { return x.season_number === p.season; })[0];

      if (part && p.episode <= part.episode_count) return p;

      return splitAbsolute(split, p.season, p.episode) || p;
    }

    this.afterLoad = function () {
      try {
        this.build();
      } catch (e) {
        this.fail(e);
      }
    };

    // Экран не собрался (например, другая версия Lampa) — не оставляем вечную загрузку, открываем список раздач
    this.fail = function (e) {
      if (this.failed) return;

      this.failed = true;

      console.error('TV Torrents', 'title screen error', e && e.stack || e);

      this.activity.loader(false);

      Lampa.Noty.show('Торренты TV: ошибка экрана (' + (e && e.message || e) + ') — открываю список раздач');
      Lampa.Activity.replace({ component: 'tvt_torrents' });
    };

    this.build = function () {
      if (serial) {
        resume = splitPoint(resumePoint(movie));

        var seasons = realSeasons(movie);
        var first = seasons.filter(function (s) { return releasesFor(s.season_number).length && !isFuture(s.air_date); })[0] || seasons[0];
        var start_season = resume ? resume.season : first ? first.season_number : 1;
        var hint = window.tvt_season_hint;

        // Открыли из подборки аниме конкретный сезон («Магическая битва 2») — начинаем с него
        if (hint && hint.id === movie.id && Date.now() - hint.t < 10 * 60000 && seasons.some(function (s) { return s.season_number === hint.season; })) {
          if (!resume || resume.season !== hint.season) resume = null;
          start_season = hint.season;
        }

        window.tvt_season_hint = null;

        cur.season = start_season;
        renderSeasons();

        selectSeason(start_season, function () {
          ready = true;
          _this.activity.loader(false);
          _this.activity.toggle();
          sendProgress();
        });
      } else {
        computePick();
        renderOptions();
        updateDetails();
        ready = true;
        this.activity.loader(false);
        this.activity.toggle();
      }
    };

    this.start = function () {
      if (!initialized) {
        initialized = true;
        this.initialize();
      }

      if (Lampa.Background && Lampa.Utils.cardImgBackgroundBlur) Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(movie));

      Lampa.Controller.add('content', {
        toggle: function () {
          fitHeight();
          focusCol(col, cols[col] && cols[col].last ? cols[col].last : primaryFor(col));
        },
        up: function () {
          if (Navigator.canmove('up')) Navigator.move('up');
          else Lampa.Controller.toggle('head');
        },
        down: function () {
          if (Navigator.canmove('down')) Navigator.move('down');
        },
        left: function () {
          if (Navigator.canmove('left')) return Navigator.move('left');

          var i = order.indexOf(col);

          if (i > 0) focusCol(order[i - 1], primaryFor(order[i - 1]));
          else Lampa.Controller.toggle('menu');
        },
        right: function () {
          if (Navigator.canmove('right')) return Navigator.move('right');

          var i = order.indexOf(col);

          if (i >= 0 && i < order.length - 1) focusCol(order[i + 1], primaryFor(order[i + 1]));
        },
        back: function () {
          Lampa.Activity.backward();
        }
      });

      Lampa.Controller.toggle('content');
    };

    this.pause = function () {};
    this.stop = function () {};

    this.destroy = function () {
      this.destroyed = true;
      cancelNext();
      clearTimeout(season_timer);
      clearTimeout(refresh_timer);
      if (Lampa.Timeline.listener) Lampa.Timeline.listener.remove('update', onTimeline);
      clearSearch();

      for (var name in cols) cols[name].scroll.destroy();

      html.remove();
      items = [];
    };
  }

  // Что открывать по кнопке «Торренты»: экран фильма/сериала или список раздач
  function TorrentsRouter(object) {
    var movie = object.movie;
    var title_screen = field('tvt_title_screen', true) && movie && movie.id && !object.from_search && !object.clarification;

    return title_screen ? new TitleScreen(object) : new Component(object);
  }

  // ---------------------------------------------------------------------------
  // Сетка серий в списке файлов TorrServer
  // ---------------------------------------------------------------------------

  function initEpisodeGrid() {
    Lampa.Listener.follow('torrent_file', function (e) {
      if (e.type === 'list_open') {
        var on = field('tvt_episode_grid', true) && e.params && e.params.seasons && e.items && e.items.length > 1;

        $('body').toggleClass('tvt-epgrid', !!on);
      } else if (e.type === 'list_close') {
        $('body').removeClass('tvt-epgrid');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Синхронизация через приватный репозиторий GitHub: прогресс и отметки
  // просмотра, закладки Lampa, выбор озвучки/раздачи и последняя серия.
  // В репозитории папка на человека, в ней файл на каждое устройство:
  // устройство пишет только свой файл, читает все и берёт самое свежее.
  // ---------------------------------------------------------------------------

  var SYNC_CATS = ['like', 'wath', 'book', 'history', 'look', 'viewed', 'scheduled', 'continued', 'thrown'];
  var SYNC_MAX_VIEWS = 3000;
  var SYNC_PUSH_GAP = 10 * 60000;   // свои изменения — одним коммитом не чаще раза в 10 минут
  var SYNC_FLUSH_GAP = 60000;       // при уходе из Lampa — сразу, если с прошлого коммита прошла минута

  // Для закладки на другом устройстве хватает названия, постера, года и оценки: описание и
  // прочее Lampa сама загрузит, когда карточку откроют. Так файл в разы меньше
  var CARD_FIELDS = ['id', 'source', 'title', 'original_title', 'name', 'original_name', 'poster_path',
    'release_date', 'first_air_date', 'vote_average', 'original_language', 'number_of_seasons', 'media_type'];

  function slimCard(card) {
    var out = {};

    CARD_FIELDS.forEach(function (k) {
      if (card[k] !== undefined && card[k] !== null && card[k] !== '') out[k] = card[k];
    });

    return out;
  }
  var sync = { running: false, again: false, timer: null, due: 0, applying: false };

  function readJson(name) {
    var v = Lampa.Storage.get(name, '{}');

    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch (e) { v = {}; }
    }

    return v && typeof v === 'object' ? v : {};
  }

  function syncDevice() {
    var id = Lampa.Storage.get('tvt_sync_device', '');

    if (!id) {
      id = ((Lampa.Platform.get && Lampa.Platform.get()) || 'device').replace(/[^a-z0-9]+/gi, '').toLowerCase() + '-' + Math.random().toString(36).slice(2, 7);
      Lampa.Storage.set('tvt_sync_device', id);
    }

    return id;
  }

  function syncConfig() {
    var token = (Lampa.Storage.get('tvt_sync_token', '') + '').trim();
    var repo = (field('tvt_sync_repo', 'lampa-sync') + '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
    var name = (field('tvt_sync_name', '') + '').trim().toLowerCase().replace(/[\/\\?#%]+/g, '-');

    if (!token || !repo || !name) return null;

    return { token: token, repo: repo, name: name, device: syncDevice(), api: Lampa.Storage.get('tvt_sync_api', '') || 'https://api.github.com' };
  }

  // GitHub API отвечает на запросы из браузера (CORS), поэтому обычный XHR — нужны PUT и заголовки
  function gh(cfg, method, path, body, ok, fail) {
    var xhr = new XMLHttpRequest();
    var url = cfg.api + path;

    if (method === 'GET') url += (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();

    xhr.open(method, url, true);
    xhr.timeout = 20000;
    xhr.setRequestHeader('Authorization', 'Bearer ' + cfg.token);
    xhr.setRequestHeader('Accept', 'application/vnd.github+json');
    if (body) xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
      var json = null;

      try { json = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch (e) {}

      if (xhr.status >= 200 && xhr.status < 300) ok(json);
      else fail(xhr.status, json && json.message || '');
    };
    xhr.onerror = xhr.ontimeout = function () { fail(0, 'нет связи'); };
    xhr.send(body ? JSON.stringify(body) : null);
  }

  // «lampa-sync» → «владелец/lampa-sync» (владелец — хозяин токена)
  function syncRepo(cfg, ok, fail) {
    if (cfg.repo.indexOf('/') > 0) return ok(cfg.repo);

    var owner = Lampa.Storage.get('tvt_sync_owner', '');

    if (owner) return ok(owner + '/' + cfg.repo);

    gh(cfg, 'GET', '/user', null, function (u) {
      Lampa.Storage.set('tvt_sync_owner', u.login);
      ok(u.login + '/' + cfg.repo);
    }, fail);
  }

  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function b64decode(b64) {
    return decodeURIComponent(escape(atob((b64 || '').replace(/\s/g, ''))));
  }

  function timelineName() {
    return Lampa.Timeline.filename ? Lampa.Timeline.filename() : 'file_view';
  }

  // Прогресс Lampa: {hash: {percent, time, duration, updated}} → {hash: {p, t, d, u}}
  function localViews() {
    var all = readJson(timelineName());
    var out = {};

    for (var h in all) {
      var r = all[h];

      if (r && typeof r === 'object' && (r.percent || r.time || r.updated)) out[h] = { p: r.percent || 0, t: r.time || 0, d: r.duration || 0, u: r.updated || 0 };
    }

    return out;
  }

  // Закладки без отметок времени, поэтому ведём журнал: что добавилось или пропало с прошлого раза
  function trackMarks() {
    var fav = Lampa.Favorite.full ? Lampa.Favorite.full() : null;
    var journal = readJson('tvt_sync_marks');
    var first = !journal.__init;
    var now = Date.now();
    var seen = {};

    if (!fav) return journal;

    SYNC_CATS.forEach(function (cat) {
      (fav[cat] || []).forEach(function (id) {
        var k = cat + ':' + id;
        var j = journal[k];

        seen[k] = true;

        // То, что лежало до первой синхронизации, считаем старым: свежие удаления с других устройств важнее
        if (!j || !j.on) journal[k] = { on: 1, t: first ? 1 : now };
      });
    });

    for (var k in journal) {
      if (k !== '__init' && journal[k].on && !seen[k]) journal[k] = { on: 0, t: now };
    }

    journal.__init = 1;
    Lampa.Storage.set('tvt_sync_marks', journal);

    return journal;
  }

  function localState() {
    var journal = trackMarks();
    var fav = Lampa.Favorite.full ? Lampa.Favorite.full() : { card: [] };
    var cards = {};
    var marks = {};

    (fav.card || []).forEach(function (c) { cards[c.id] = slimCard(c); });

    for (var k in journal) {
      if (k === '__init') continue;

      marks[k] = journal[k];
    }

    return { views: localViews(), marks: marks, cards: cards, titles: readTitles() };
  }

  // Самое свежее по каждой записи: прогресс — по updated, закладки и выбор озвучки — по t
  function mergeStates(list) {
    var out = { views: {}, marks: {}, cards: {}, titles: {} };

    list.forEach(function (s) {
      if (!s) return;

      var k;

      for (k in s.views || {}) if (!out.views[k] || (s.views[k].u || 0) > (out.views[k].u || 0)) out.views[k] = s.views[k];
      for (k in s.marks || {}) if (!out.marks[k] || (s.marks[k].t || 0) > (out.marks[k].t || 0)) out.marks[k] = s.marks[k];
      for (k in s.titles || {}) if (!out.titles[k] || (s.titles[k].t || 0) > (out.titles[k].t || 0)) out.titles[k] = s.titles[k];
      for (k in s.cards || {}) out.cards[k] = s.cards[k];
    });

    return out;
  }

  // Применяем к Lampa то, что на других устройствах новее. Возвращает число изменений
  function applyState(merged, local) {
    var changed = 0;
    var k;

    // Прогресс: пачкой прямо в хранилище и одно перечитывание, иначе первый вход на ТВ тормозит
    var raw = readJson(timelineName());
    var view_changes = [];

    for (k in merged.views) {
      var m = merged.views[k];
      var l = local.views[k];

      if (!l || (m.u || 0) > (l.u || 0)) view_changes.push(k);
    }

    if (view_changes.length) {
      if (view_changes.length <= 15) {
        view_changes.forEach(function (h) {
          var v = merged.views[h];

          Lampa.Timeline.update({ hash: h, percent: v.p, time: v.t, duration: v.d, updated: v.u, received: true });
        });
      } else {
        view_changes.forEach(function (h) {
          var v = merged.views[h];
          var road = raw[h] && typeof raw[h] === 'object' ? raw[h] : { profile: 0 };

          road.percent = v.p;
          road.time = v.t;
          road.duration = v.d;
          road.updated = v.u;
          raw[h] = road;
        });

        Lampa.Storage.set(timelineName(), raw);
        if (Lampa.Timeline.read) Lampa.Timeline.read();
        if (Lampa.Timeline.listener) Lampa.Timeline.listener.send('update', { data: {} });
      }

      changed += view_changes.length;
    }

    // Закладки: добавления по возрастанию времени, чтобы свежие оказались сверху
    var adds = [];
    var removes = [];
    var journal = readJson('tvt_sync_marks');

    for (k in merged.marks) {
      var mk = merged.marks[k];
      var lk = local.marks[k];

      if (lk && (lk.t || 0) >= (mk.t || 0)) continue;

      var parts = k.split(':');
      var cat = parts[0];
      var id = parts.slice(1).join(':');
      var has = lk && lk.on;

      if (SYNC_CATS.indexOf(cat) === -1) continue;

      if (mk.on && !has) {
        if (merged.cards[id]) adds.push({ cat: cat, card: merged.cards[id], t: mk.t });
        else continue;
      } else if (!mk.on && has) {
        removes.push({ cat: cat, id: id });
      }

      journal[k] = { on: mk.on, t: mk.t };
    }

    if (adds.length || removes.length) {
      sync.applying = true;

      try {
        removes.forEach(function (r) { Lampa.Favorite.remove(r.cat, { id: isNaN(r.id) ? r.id : +r.id }); });
        adds.sort(function (a, b) { return a.t - b.t; }).forEach(function (a) { Lampa.Favorite.add(a.cat, a.card); });
      } finally {
        sync.applying = false;
      }

      changed += adds.length + removes.length;
    }

    journal.__init = 1;
    Lampa.Storage.set('tvt_sync_marks', journal);

    // Выбор озвучки, качества, раздачи и последняя серия
    var titles = readTitles();
    var titles_changed = false;

    for (k in merged.titles) {
      if (!titles[k] || (merged.titles[k].t || 0) > (titles[k].t || 0)) {
        titles[k] = merged.titles[k];
        titles_changed = true;
      }
    }

    if (titles_changed) Lampa.Storage.set('tvt_titles', titles);

    return changed;
  }

  // Файл устройства: всё известное ему состояние (карточки — только для действующих закладок)
  function deviceFile(cfg, merged) {
    var views = {};
    var keys = Object.keys(merged.views);

    if (keys.length > SYNC_MAX_VIEWS) {
      keys.sort(function (a, b) { return (merged.views[b].u || 0) - (merged.views[a].u || 0); });
      keys = keys.slice(0, SYNC_MAX_VIEWS);
    }

    keys.forEach(function (h) { views[h] = merged.views[h]; });

    var cards = {};
    var marks = {};
    var old = Date.now() - 60 * 86400000;

    for (var k in merged.marks) {
      var m = merged.marks[k];

      // Отметка «удалено» нужна, пока её не увидели другие устройства; через 60 дней её можно забыть
      if (!m.on) {
        if ((m.t || 0) > old) marks[k] = m;
        continue;
      }

      marks[k] = m;

      var id = k.split(':').slice(1).join(':');

      if (merged.cards[id]) cards[id] = slimCard(merged.cards[id]);
    }

    return { v: 1, device: cfg.device, name: cfg.name, views: views, marks: marks, cards: cards, titles: merged.titles };
  }

  function syncStatus(text) {
    Lampa.Storage.set('tvt_sync_status', text);
    $('.tvt-sync-status').text(syncStatusText());
  }

  function clock() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };

    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // manual — кнопка «Синхронизировать сейчас»; flush — уходим из Lampa, отправить накопленное
  function runSync(manual, retry, flush) {
    var cfg = syncConfig();

    if (!cfg) {
      if (manual) Lampa.Noty.show('Синхронизация: укажите имя, репозиторий и токен');
      return;
    }

    if (sync.running) {
      sync.again = true;
      return;
    }

    sync.running = true;

    var done = function (text, error) {
      sync.running = false;
      syncStatus(text);

      if (manual || error) Lampa.Noty.show('Синхронизация: ' + text);
      if (sync.again) {
        sync.again = false;
        scheduleSync(2000);
      }
    };

    var full_repo = cfg.repo;

    var fail = function (status, message) {
      var why = status === 401 ? 'токен не подходит (проверьте, что он скопирован целиком и не истёк)' :
        status === 403 ? 'у токена нет права записи: Permissions → Contents → Read and write' :
        status === 404 ? 'репозиторий ' + full_repo + ' не найден или токену не дан доступ к нему: Repository access → Only select repositories → ' + full_repo.split('/').pop() :
        status === 0 ? 'нет связи с GitHub' : 'ошибка ' + status;

      done('ошибка — ' + why + (message && status !== 0 ? ' [GitHub: ' + message + ']' : ''), true);
    };

    syncRepo(cfg, function (repo) {
      var base = '/repos/' + repo + '/contents/' + encodeURIComponent(cfg.name);
      var own_name = cfg.device + '.json';

      full_repo = repo;

      gh(cfg, 'GET', base, null, proceed, function (status, message) {
        if (status !== 404) return fail(status, message);

        // 404 бывает и когда папки этого человека ещё нет, и когда репозиторий пустой
        // («This repository is empty»). Проверяем сам репозиторий: доступен — начинаем с нуля
        gh(cfg, 'GET', '/repos/' + repo, null, function () { proceed([]); }, fail);
      });

      function proceed(list) {
        var files = (Array.isArray(list) ? list : []).filter(function (f) { return f.type === 'file' && /\.json$/.test(f.name); });
        var seen = readJson('tvt_sync_seen');
        var own_sha = null;
        var remote = [];

        files.forEach(function (f) { if (f.name === own_name) own_sha = f.sha; });

        var queue = files.filter(function (f) { return f.name !== own_name && seen[f.path] !== f.sha; });

        var next = function () {
          var f = queue.shift();

          if (!f) return finish();

          gh(cfg, 'GET', base + '/' + encodeURIComponent(f.name), null, function (json) {
            try {
              remote.push(JSON.parse(b64decode(json.content)));
              seen[f.path] = f.sha;
            } catch (e) {
              console.warn('TV Torrents', 'sync: bad file', f.path, e);
            }

            next();
          }, fail);
        };

        var finish = function () {
          var local = localState();
          var merged = mergeStates([local].concat(remote));
          var got = applyState(merged, local);
          var content = JSON.stringify(deviceFile(cfg, mergeStates([localState()].concat([merged]))));
          var hash = String(Lampa.Utils.hash ? Lampa.Utils.hash(content) : content.length + ':' + content.slice(-64));

          var saved = function () {
            Lampa.Storage.set('tvt_sync_seen', seen);
            Lampa.Storage.set('tvt_sync_pushed', hash);
            done(clock() + (got ? ', получено изменений: ' + got : ', всё совпадает'));
          };

          // Ничего не поменялось — коммит не делаем
          if (own_sha && String(Lampa.Storage.get('tvt_sync_pushed', '')) === hash) return saved();

          // Свои изменения отправляем не чаще раза в 10 минут: копятся и уходят одним коммитом.
          // Сразу — по кнопке, при уходе из Lampa (в плеер или выход) и при первой записи файла
          var since = Date.now() - (parseInt(Lampa.Storage.get('tvt_sync_pushed_at', '0'), 10) || 0);
          var allowed = !own_sha || manual || (flush && since >= SYNC_FLUSH_GAP) || since >= SYNC_PUSH_GAP;

          if (!allowed) {
            var wait = SYNC_PUSH_GAP - since;

            Lampa.Storage.set('tvt_sync_seen', seen);
            done(clock() + (got ? ', получено изменений: ' + got : '') + ', свои изменения уйдут через ' + Math.max(1, Math.ceil(wait / 60000)) + ' мин');
            scheduleSync(wait + 1000);
            return;
          }

          var body = { message: cfg.name + ' / ' + cfg.device, content: b64encode(content) };

          if (own_sha) body.sha = own_sha;

          gh(cfg, 'PUT', base + '/' + encodeURIComponent(own_name), body, function () {
            Lampa.Storage.set('tvt_sync_pushed_at', Date.now());
            saved();
          }, function (status, message) {
            // Файл успели поменять (например, после сброса данных Lampa на этом же устройстве) — повторяем один раз
            if ((status === 409 || status === 422) && !retry) {
              sync.running = false;
              runSync(manual, true, flush);
            } else fail(status, message);
          });
        };

        next();
      }
    }, fail);
  }

  // Файлы других плагинов в папке человека: <имя>/_extra/<файл>. Синхронизация читает только файлы
  // в самой папке, поэтому вложенная папка ей не мешает. ok(объект или null, если файла нет)
  function storePath(cfg, repo, file) {
    return '/repos/' + repo + '/contents/' + encodeURIComponent(cfg.name) + '/_extra/' + encodeURIComponent(file);
  }

  function storeGet(file, ok, fail) {
    var cfg = syncConfig();

    if (!cfg) return fail(0, 'синхронизация через GitHub не настроена');

    syncRepo(cfg, function (repo) {
      gh(cfg, 'GET', storePath(cfg, repo, file), null, function (json) {
        var text;

        try {
          text = b64decode(json.content);
        } catch (e) {
          return fail(0, 'файл испорчен');
        }

        // JSON — объектом, остальное (например, текст, вставленный с телефона на сайте GitHub) — строкой
        try {
          ok(JSON.parse(text), json.sha);
        } catch (e) {
          ok(text, json.sha);
        }
      }, function (status, message) {
        if (status === 404) ok(null, null);
        else fail(status, message);
      });
    }, fail);
  }

  // Где в репозитории лежат эти файлы — чтобы показать ссылку на сайт GitHub (создать файл с телефона)
  function storeInfo(ok, fail) {
    var cfg = syncConfig();

    if (!cfg) return fail(0, 'синхронизация через GitHub не настроена');

    syncRepo(cfg, function (repo) {
      gh(cfg, 'GET', '/repos/' + repo, null, function (json) {
        ok({ web: json.html_url || 'https://github.com/' + repo, branch: json.default_branch || 'main', dir: cfg.name + '/_extra/' });
      }, fail);
    }, fail);
  }

  function storePut(file, obj, ok, fail) {
    var cfg = syncConfig();

    if (!cfg) return fail(0, 'синхронизация через GitHub не настроена');

    syncRepo(cfg, function (repo) {
      var path = storePath(cfg, repo, file);
      var put = function (sha) {
        var body = { message: cfg.name + ' / ' + file, content: b64encode(JSON.stringify(obj)) };

        if (sha) body.sha = sha;

        gh(cfg, 'PUT', path, body, function () { ok(); }, fail);
      };

      gh(cfg, 'GET', path, null, function (json) { put(json.sha); }, function (status, message) {
        if (status === 404) put(null);
        else fail(status, message);
      });
    }, fail);
  }

  function scheduleSync(ms, flush) {
    if (!syncConfig()) return;

    if (flush) sync.flush = true;

    var due = Date.now() + ms;

    if (sync.timer && sync.due <= due) return;

    clearTimeout(sync.timer);
    sync.due = due;
    sync.timer = setTimeout(function () {
      var f = sync.flush;

      sync.timer = null;
      sync.flush = false;
      runSync(false, false, f);
    }, ms);
  }

  // ---------------------------------------------------------------------------
  // «Удалить из истории» в меню карточки (долгое OK) и в «Закладках» на странице фильма.
  // Галочка «История» в Lampa только убирает карточку из списка: прогресс остаётся,
  // и карточка по-прежнему выглядит просмотренной. Здесь стираем и то и другое,
  // а сброс уходит на остальные устройства как свежая запись с нулевым прогрессом.
  // ---------------------------------------------------------------------------

  var long_press = { el: null, at: 0 };

  // Все записи Timeline этой карточки: фильм — по названию, сериал — по сезону и серии
  function titleHashes(card, raw) {
    var names = [card.original_title, card.original_name].filter(function (n, i, a) { return n && a.indexOf(n) === i; });
    var seasons = Math.max(card.number_of_seasons || 0, 40);
    var out = [];

    names.forEach(function (n) {
      var h = Lampa.Utils.hash(n);

      // У фильма и сериала с одинаковым оригинальным названием («Resident Evil») общий хеш фильма —
      // поэтому для сериала его не трогаем
      if (!card.original_name) {
        if (raw[h] !== undefined) out.push(h);
        return;
      }

      for (var s = 0; s <= seasons; s++) {
        for (var e = 0; e <= 400; e++) {
          h = Lampa.Utils.hash([s, s > 10 ? ':' : '', e, n].join(''));

          if (raw[h] !== undefined && out.indexOf(h) === -1) out.push(h);
        }
      }
    });

    return out;
  }

  function hasProgress(r) {
    return r && typeof r === 'object' ? !!(r.percent || r.time) : !!r;
  }

  function forgetTitle(card) {
    var raw = readJson(timelineName());
    var now = Date.now();
    var hashes = titleHashes(card, raw).filter(function (h) { return hasProgress(raw[h]); });
    var key = cardKey(card);

    // Нулевой прогресс с текущим временем, а не удаление записи: иначе при синхронизации
    // старый прогресс вернулся бы с другого устройства
    if (hashes.length <= 15) {
      hashes.forEach(function (h) {
        Lampa.Timeline.update({ hash: h, percent: 0, time: 0, duration: 0, updated: now });
      });
    } else {
      hashes.forEach(function (h) {
        var r = raw[h] && typeof raw[h] === 'object' ? raw[h] : { profile: 0 };

        r.percent = 0;
        r.time = 0;
        r.duration = 0;
        r.updated = now;
        raw[h] = r;
      });

      Lampa.Storage.set(timelineName(), raw);
      if (Lampa.Timeline.read) Lampa.Timeline.read();
      if (Lampa.Timeline.listener) Lampa.Timeline.listener.send('update', { data: {} });
    }

    // Последняя серия забывается, выбранные озвучка и качество остаются
    var titles = readTitles();

    if (titles[key]) {
      delete titles[key].last;
      titles[key].t = now;
      Lampa.Storage.set('tvt_titles', titles);
    }

    // Иначе разбор отметок TorrServer снова отметил бы серии просмотренными
    var sessions = readJson('tvt_sessions');

    if (sessions[key]) {
      delete sessions[key];
      Lampa.Storage.set('tvt_sessions', sessions);
    }

    if (Lampa.Favorite.check(card).history) Lampa.Favorite.remove('history', card);
    else Lampa.Listener.send('state:changed', { target: 'favorite', reason: 'update', method: 'forget', type: 'history', card: card });

    scheduleSync(3000, true);

    Lampa.Noty.show('«' + (card.title || card.name) + '» удалён из истории' + (hashes.length ? ', прогресс сброшен' : ''));
  }

  // На странице «История» Lampa сама карточку не убирает — открываем страницу заново
  function refreshHistoryPage() {
    var act = Lampa.Activity.active && Lampa.Activity.active();

    if (act && act.component === 'favorite' && act.type === 'history' && Lampa.Activity.replace) Lampa.Activity.replace();
  }

  function confirmForget(card, enabled) {
    Lampa.Select.show({
      title: 'Удалить «' + (card.title || card.name) + '» из истории?',
      items: [
        { title: 'Удалить', subtitle: 'Пропадёт из «Истории» и «Продолжить», прогресс серий сбросится — на всех ваших устройствах', forget: true },
        { title: 'Отмена' }
      ],
      onSelect: function (a) {
        Lampa.Controller.toggle(enabled);

        if (a.forget) {
          forgetTitle(card);
          refreshHistoryPage();
        }
      },
      onBack: function () { Lampa.Controller.toggle(enabled); }
    });
  }

  // Меню с галочкой «История» → чья карточка: долгое нажатие на карточке или открытая страница фильма
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

  function initForget() {
    // hover:long не всплывает, но перехват на document видит и такие события
    document.addEventListener('hover:long', function (e) {
      long_press.el = e.target;
      long_press.at = Date.now();
    }, true);

    var show = Lampa.Select.show;

    Lampa.Select.show = function (params) {
      try {
        var card = menuCard(params);

        if (card && (Lampa.Favorite.check(card).history || Lampa.Timeline.watched(card))) {
          var enabled = Lampa.Controller.enabled().name;
          var at = 0;

          params.items.forEach(function (a, i) { if (a.where === 'history' || a.type === 'history') at = i + 1; });
          params.items.splice(at, 0, {
            title: 'Удалить из истории',
            subtitle: 'и сбросить прогресс просмотра',
            onSelect: function () { confirmForget(card, enabled); }
          });
        }
      } catch (e) {
        console.log('TV Torrents', 'forget menu', e);
      }

      return show.apply(this, arguments);
    };
  }

  function initSync() {
    // Изменения забираем и складываем быстро, а коммит делается не чаще раза в 10 минут (см. runSync)
    if (Lampa.Timeline.listener) Lampa.Timeline.listener.follow('update', function () { scheduleSync(90000); });
    if (Lampa.Favorite.listener) Lampa.Favorite.listener.follow('add,added,remove', function () { if (!sync.applying) scheduleSync(5000); });
    if (Lampa.Player && Lampa.Player.listener) Lampa.Player.listener.follow('destroy', function () { scheduleSync(3000, true); });

    // Ушли в MX/VLC или свернули Lampa — отправляем накопленное, вернулись — забираем свежее
    // и отмечаем серии, которые плеер прошёл по плейлисту
    document.addEventListener('visibilitychange', function () {
      scheduleSync(document.hidden ? 0 : 3000, document.hidden);

      if (!document.hidden) setTimeout(recoverAllSessions, 2500);
    });

    setTimeout(recoverAllSessions, 5000);

    setInterval(function () { if (!document.hidden) scheduleSync(0); }, 10 * 60000);

    scheduleSync(4000);
  }

  // ---------------------------------------------------------------------------
  // Стили
  // ---------------------------------------------------------------------------

  var CSS = [
    '.tvt{padding:0 1.5em 2em 1.5em}',
    '.tvt-head{display:flex;align-items:baseline;justify-content:space-between;margin:0.4em 0 0.8em}',
    '.tvt-head__title{font-size:1.9em;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.tvt-head__stat{font-size:1.2em;opacity:0.6;white-space:nowrap;margin-left:1em}',
    '.tvt-row{display:flex;align-items:flex-start;margin-bottom:0.35em}',
    '.tvt-row__label{width:6.5em;flex-shrink:0;font-size:1.1em;opacity:0.5;padding-top:0.55em}',
    '.tvt-row__chips{display:flex;flex-wrap:wrap;flex-grow:1;min-width:0}',
    '.tvt-chip{font-size:1.15em;padding:0.3em 0.75em;margin:0.15em 0.4em 0.15em 0;border-radius:2em;background:rgba(255,255,255,0.08);white-space:nowrap;line-height:1.3}',
    '.tvt-chip__count{margin-left:0.45em;opacity:0.55;font-size:0.85em}',
    '.tvt-chip.active{background:rgba(255,255,255,0.28);font-weight:600}',
    '.tvt-chip.active:before{content:"✓\\00a0"}',
    '.tvt-chip.pref:after{content:" ♥";opacity:0.6;font-size:0.8em}',
    '.tvt-chip.reset{background:rgba(255,90,90,0.25)}',
    '.tvt-chip.focus{background:#fff;color:#000}',
    '.tvt-chip.focus .tvt-chip__count{opacity:0.7}',
    '.tvt-list{margin-top:0.8em}',
    '.tvt-item{display:flex;align-items:stretch;background:rgba(0,0,0,0.3);border-radius:0.8em;margin-bottom:0.55em;padding:0.65em 0.8em;border:0.18em solid transparent}',
    '.tvt-item.focus{background:rgba(255,255,255,0.12);border-color:#fff}',
    '.tvt-item__q{width:5.2em;flex-shrink:0;border-radius:0.5em;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.1);margin-right:0.9em}',
    '.tvt-item__res{font-size:1.55em;font-weight:700}',
    '.tvt-item__hdr{font-size:0.95em;font-weight:600;opacity:0.85}',
    '.tvt-q--4k{background:linear-gradient(135deg,#b8860b,#6b4e00)}',
    '.tvt-q--1080p{background:linear-gradient(135deg,#2f6fd6,#1b3f7a)}',
    '.tvt-q--720p{background:linear-gradient(135deg,#2e9a5b,#185232)}',
    '.tvt-q--sd{background:rgba(255,255,255,0.12)}',
    '.tvt-item__body{flex-grow:1;min-width:0}',
    '.tvt-item__title{font-size:1.3em;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    '.tvt-item.focus .tvt-item__title{-webkit-line-clamp:6}',
    '.tvt-item__tags{margin-top:0.35em;display:flex;flex-wrap:wrap}',
    '.tvt-tag{font-size:1em;padding:0.12em 0.5em;margin:0.15em 0.35em 0.15em 0;border-radius:0.35em;background:rgba(255,255,255,0.1);white-space:nowrap}',
    '.tvt-tag--type{background:rgba(120,170,255,0.25)}',
    '.tvt-tag--studio{background:rgba(255,200,90,0.22)}',
    '.tvt-tag--season{background:rgba(170,120,255,0.25)}',
    '.tvt-tag--best{background:#ffd54a;color:#000;font-weight:700}',
    '.tvt-tag--viewed{background:rgba(255,255,255,0.25)}',
    '.tvt-tag--warn{background:rgba(255,80,80,0.35)}',
    '.tvt-item__meta{margin-top:0.35em;font-size:1em;opacity:0.55;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.tvt-item__side{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;margin-left:0.9em;min-width:5.5em}',
    '.tvt-item__seeds{font-size:1.45em;font-weight:700}',
    '.tvt-seeds--good{color:#5fe08a}',
    '.tvt-seeds--ok{color:#e6d45a}',
    '.tvt-seeds--low{color:#f0a04b}',
    '.tvt-seeds--dead{color:#f06262}',
    '.tvt-item__size{font-size:1.2em;margin-top:0.2em;opacity:0.8}',
    '.tvt-more,.tvt-none,.tvt-empty__text{font-size:1.3em;text-align:center;padding:0.8em;border-radius:0.8em;background:rgba(255,255,255,0.06)}',
    '.tvt-more.focus{background:#fff;color:#000}',
    '.tvt-empty .tvt-row{justify-content:center;margin-top:1em}',

    // Экран фильма / сериала
    '.tvt-title{padding:0 1.5em;display:flex;flex-direction:column;height:calc(100vh - 6em);box-sizing:border-box}',
    '.tvt-title__head{flex-shrink:0;margin:0.2em 0 0.7em}',
    '.tvt-title__name{font-size:2.1em;font-weight:700;line-height:1.15;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.tvt-title__meta{font-size:1.1em;opacity:0.65;margin-top:0.25em}',
    '.tvt-title__body{display:flex;flex:1;min-height:0}',
    '.tvt-col{height:100%;min-width:0;position:relative}',
    '.tvt-col > .scroll{height:100%}',
    '.tvt-col--seasons{width:21%;margin-right:1em;flex-shrink:0}',
    '.tvt-col--episodes{width:39%;margin-right:1em;flex-shrink:0}',
    '.tvt-col--info{width:36%;margin-right:1.5em;flex-shrink:0}',
    '.tvt-col--details{flex:1}',
    '.tvt-col__wait{font-size:1.2em;opacity:0.6;padding:1em}',
    '.tvt-bar{height:0.22em;background:rgba(255,255,255,0.15);border-radius:0.2em;overflow:hidden}',
    '.tvt-bar > div{height:100%;background:#fff;width:0}',
    '.tvt-season{display:flex;align-items:center;padding:0.5em;margin-bottom:0.5em;border-radius:0.8em;background:rgba(0,0,0,0.3);border:0.15em solid transparent}',
    '.tvt-season__img{width:3.4em;height:5em;flex-shrink:0;border-radius:0.4em;overflow:hidden;margin-right:0.7em;background:rgba(255,255,255,0.08)}',
    '.tvt-season__img img{width:100%;height:100%;object-fit:cover}',
    '.tvt-season__img.empty img{display:none}',
    '.tvt-season__body{flex:1;min-width:0}',
    '.tvt-season__name{font-size:1.35em;font-weight:600}',
    '.tvt-season__meta,.tvt-season__meta2{font-size:0.95em;opacity:0.6;margin-top:0.15em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tvt-season .tvt-bar{margin-top:0.4em}',
    '.tvt-season.active{background:rgba(255,255,255,0.14);border-color:rgba(255,255,255,0.35)}',
    '.tvt-season.dim{opacity:0.5}',
    '.tvt-season.focus{background:rgba(255,255,255,0.2);border-color:#fff;opacity:1}',
    '.tvt-ep{display:flex;align-items:center;padding:0.4em;margin-bottom:0.4em;border-radius:0.8em;background:rgba(0,0,0,0.25);border:0.15em solid transparent}',
    '.tvt-ep__img{position:relative;width:8.6em;height:4.9em;flex-shrink:0;border-radius:0.5em;overflow:hidden;margin-right:0.8em;background:rgba(255,255,255,0.08)}',
    '.tvt-ep__img img{width:100%;height:100%;object-fit:cover}',
    '.tvt-ep__img.empty img{display:none}',
    '.tvt-ep__num{position:absolute;top:0.25em;left:0.25em;font-size:1em;font-weight:700;background:rgba(0,0,0,0.7);border-radius:0.3em;padding:0 0.4em}',
    '.tvt-ep__img .tvt-bar{position:absolute;left:0;right:0;bottom:0;border-radius:0}',
    '.tvt-ep__body{flex:1;min-width:0}',
    '.tvt-ep__name{font-size:1.2em;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    '.tvt-ep__meta{font-size:0.95em;opacity:0.55;margin-top:0.2em}',
    '.tvt-ep__state{flex-shrink:0;margin-left:0.6em;font-size:1em;opacity:0.85;white-space:nowrap}',
    '.tvt-ep.watched .tvt-ep__state{color:#5fe08a;font-size:1.3em}',
    '.tvt-ep.started .tvt-ep__state{color:#ffd54a}',
    '.tvt-ep.missing,.tvt-ep.future{opacity:0.5}',
    '.tvt-part{display:flex;align-items:baseline;padding:0.7em 0.5em 0.35em;font-size:1.05em;opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tvt-part__n{font-weight:700;margin-right:0.6em}',
    '.tvt-part__name{opacity:0.7;overflow:hidden;text-overflow:ellipsis}',
    '.tvt-det__note{font-size:0.95em;color:#ffd54a;margin-bottom:0.3em}',
    '.tvt-ep.active{background:rgba(255,255,255,0.1)}',
    '.tvt-ep.focus{background:rgba(255,255,255,0.18);border-color:#fff;opacity:1}',
    '.tvt-det{padding-bottom:1em}',
    // Кадр показываем целиком (16:9), текст — справа от него
    '.tvt-det__top{display:flex;align-items:flex-start}',
    '.tvt-det__img{width:52%;flex-shrink:0;position:relative;height:0;padding-top:29.25%;border-radius:0.8em;overflow:hidden;background:rgba(255,255,255,0.06)}',
    '.tvt-det__img img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}',
    '.tvt-det__info{flex:1;min-width:0;margin-left:0.9em}',
    '.tvt-det__title{font-size:1.45em;font-weight:700;line-height:1.2}',
    '.tvt-det__meta{font-size:1em;opacity:0.65;margin-top:0.25em}',
    '.tvt-det__text{font-size:1.05em;opacity:0.85;margin-top:0.4em;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical}',
    '.tvt-det__text:empty{display:none}',
    '.tvt-det__buttons{display:flex;flex-wrap:wrap;margin-top:0.8em}',
    '.tvt-btn{font-size:1.25em;padding:0.5em 1.1em;margin:0 0.5em 0.5em 0;border-radius:2em;background:rgba(255,255,255,0.1);white-space:nowrap}',
    '.tvt-btn--play{background:rgba(255,255,255,0.25);font-weight:700}',
    '.tvt-btn.hide{display:none}',
    '.tvt-btn.focus{background:#fff;color:#000}',
    '.tvt-det__group{margin-top:0.6em;padding:0.6em 0.8em;border-radius:0.8em;background:rgba(0,0,0,0.25)}',
    '.tvt-det__label{font-size:0.95em;opacity:0.55;margin-bottom:0.3em}',
    '.tvt-det__chips{display:flex;flex-wrap:wrap}',
    '.tvt-det__rel1{font-size:1.1em}',
    '.tvt-det__rel2,.tvt-det__tracks{font-size:0.95em;opacity:0.6;margin-top:0.2em}',
    '.tvt-det__relbtn:not(:empty){margin-top:0.4em}',
    '.tvt-info__poster{width:55%;border-radius:0.8em;overflow:hidden}',
    '.tvt-info__poster img{width:100%;display:block}',
    '.tvt-info__text{font-size:1.15em;line-height:1.4;opacity:0.85;margin-top:0.8em}',
    '.tvt-ep__go{display:none;position:absolute;top:50%;left:50%;width:2.2em;height:2.2em;margin:-1.1em 0 0 -1.1em;border-radius:50%;background:rgba(0,0,0,0.65);align-items:center;justify-content:center;font-size:1.2em}',
    'body.touch-device .tvt-ep.active .tvt-ep__go{display:flex}',

    // Телефон: одна страница со скроллом — сезоны лентой, под ними кнопки и выбор озвучки, ниже список серий
    'body.tvt-narrow .tvt-title{display:block;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:0 1em 9em}',
    'body.tvt-narrow .tvt-title__name{white-space:normal;font-size:1.8em}',
    'body.tvt-narrow .tvt-title__body{display:flex;flex-direction:column}',
    'body.tvt-narrow .tvt-col{width:auto !important;height:auto !important;margin:0 0 0.8em 0 !important;flex-shrink:0}',
    'body.tvt-narrow .tvt-col > .scroll{height:auto !important;overflow:visible !important;-webkit-mask-image:none !important;mask-image:none !important}',
    'body.tvt-narrow .tvt-col .scroll__content{padding:0 !important}',
    'body.tvt-narrow .tvt-col .scroll__body{transform:none !important}',
    'body.tvt-narrow .tvt-col .scroll__body:after{display:none !important}',
    'body.tvt-narrow .tvt-col--seasons{order:1}',
    'body.tvt-narrow .tvt-col--details{order:2}',
    'body.tvt-narrow .tvt-col--episodes,body.tvt-narrow .tvt-col--info{order:3}',
    'body.tvt-narrow .tvt-col--seasons > .scroll{overflow-x:auto !important;overflow-y:hidden !important}',
    'body.tvt-narrow .tvt-col--seasons .scroll__body{display:flex;flex-wrap:nowrap}',
    'body.tvt-narrow .tvt-season{flex:0 0 auto;width:10.5em;margin:0 0.5em 0 0;padding:0.4em}',
    'body.tvt-narrow .tvt-season__img{width:2.8em;height:4.1em;margin-right:0.5em}',
    'body.tvt-narrow .tvt-season__name{font-size:1.15em}',
    'body.tvt-narrow .tvt-det__img{width:42%;padding-top:23.6%}',
    'body.tvt-narrow .tvt-det__text{-webkit-line-clamp:3}',
    'body.tvt-narrow .tvt-ep__img{width:7.6em;height:4.3em}',
    'body.tvt-narrow .tvt-info__poster{display:none}',
    'body.tvt-narrow .tvt-info__text{margin-top:0}',
    // Список раздач на телефоне: подписи строк над кнопками, а не сбоку
    'body.tvt-narrow .tvt{padding:0 1em 9em}',
    'body.tvt-narrow .tvt-row{display:block}',
    'body.tvt-narrow .tvt-row__label{width:auto;padding:0.3em 0 0.1em}',
    'body.tvt-narrow .tvt-item__q{width:4em}',
    'body.tvt-narrow .tvt-item__side{min-width:4em}',

    // Автозапуск серии: окно файлов TorrServer прячем, пока Lampa запускает нужный файл
    'body.tvt-autopick .modal{opacity:0;pointer-events:none}',

    // Сетка серий: список файлов TorrServer с крупными кадрами
    'body.tvt-epgrid .modal--large .modal__content{width:94%;max-width:none}',
    'body.tvt-epgrid .torrent-files{display:flex;flex-wrap:wrap;margin:0 -0.4em}',
    'body.tvt-epgrid .torrent-files > .torrent-file{width:100%;margin:0.4em !important}',
    'body.tvt-epgrid .torrent-files > .torrnet-folder-name{width:100%;margin:0.8em 0.4em 0.2em;font-size:1.5em}',
    'body.tvt-epgrid .torrent-files > .torrent-serial{width:calc(25% - 0.8em);margin:0.4em !important;flex-direction:column;align-items:stretch;overflow:hidden}',
    'body.tvt-epgrid .torrent-serial__img{width:100%;height:9.5em;border-radius:0.3em 0.3em 0 0;object-fit:cover;background:rgba(255,255,255,0.05)}',
    'body.tvt-epgrid .torrent-serial__content{padding:0.55em 0.7em 0.7em;display:block}',
    'body.tvt-epgrid .torrent-serial__body{float:none;max-width:100%}',
    'body.tvt-epgrid .torrent-serial__title{font-size:1.25em;white-space:normal;line-height:1.25;height:2.5em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    'body.tvt-epgrid .torrent-serial__line{font-size:0.95em;margin-top:0.3em;opacity:0.7}',
    'body.tvt-epgrid .torrent-serial__detail{float:none;display:flex;justify-content:space-between;font-size:0.9em;opacity:0.6;margin-top:0.3em}',
    'body.tvt-epgrid .torrent-files > .torrent-serial.focus{box-shadow:0 0 0 0.22em #fff;transform:scale(1.03);z-index:2;background:#3a3d42}',
    'body.tvt-epgrid .torrent-files > .torrent-serial{transition:transform 0.15s}',
    'body.tvt-epgrid .torrent-serial__episode{position:absolute;top:0.35em;left:0.35em;font-size:1.5em;font-weight:700;background:rgba(0,0,0,0.7);border-radius:0.3em;padding:0.05em 0.45em;width:auto;height:auto;line-height:1.3}'
  ].join('\n');

  // ---------------------------------------------------------------------------
  // Настройки и запуск
  // ---------------------------------------------------------------------------

  var original_torrents;

  function applyReplace() {
    var on = field('tvt_replace', true);

    Lampa.Component.add('torrents', on ? TorrentsRouter : original_torrents);
  }

  function initSettings() {
    if (window.tvt_settings_added) return;
    window.tvt_settings_added = true;

    Lampa.SettingsApi.addComponent({
      component: 'tv_torrents',
      name: 'Торренты TV',
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h16M4 12h10M4 19h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M17 15l4 4m0-4l-4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_replace', type: 'trigger', default: true },
      field: { name: 'Новый экран торрентов', description: 'Открывать удобный экран с быстрыми фильтрами вместо стандартного' },
      onChange: applyReplace
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_title_screen', type: 'trigger', default: true },
      field: { name: 'Экран фильма и сериала', description: 'Сезоны и серии с прогрессом, выбор озвучки и качества, «Продолжить» с места остановки. Выключите, чтобы сразу открывался список раздач' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: {
        name: 'tvt_quality',
        type: 'select',
        values: { auto: 'Максимальное', '4K': '4K', '1080p': '1080p', '720p': '720p', SD: 'SD' },
        default: '1080p'
      },
      field: { name: 'Предпочитаемое качество', description: 'Для умной сортировки: такие раздачи будут выше' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_remember', type: 'trigger', default: true },
      field: { name: 'Запоминать фильтры', description: 'Качество, HDR, экранки и сортировка сохраняются между фильмами' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_episode_grid', type: 'trigger', default: true },
      field: { name: 'Серии плиткой с превью', description: 'Список серий в TorrServer показывается крупными кадрами из TMDB' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_src_extra', type: 'input', values: '', default: '', placeholder: 'http://192.168.1.5:9117|ключ' },
      field: { name: 'Дополнительные источники', description: 'Адреса Jackett или JacRed через запятую, ключ API — после «|». Ищутся вместе с парсером Lampa, одинаковые раздачи склеиваются' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_src_torrserver', type: 'trigger', default: false },
      field: { name: 'Искать и через TorrServer (rutor)', description: 'Нужен включённый поиск rutor в настройках TorrServer. Он держит базу rutor в памяти (+300–400 МБ), на ТВ с 2 ГБ не включайте' }
    });

    // --- субтитры ---

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_os_title', type: 'title' },
      field: { name: 'Субтитры' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_os_on', type: 'trigger', default: true },
      field: { name: 'Искать на OpenSubtitles', description: 'Выбрано «Оригинал + субтитры», а в раздаче русских субтитров нет — перед запуском серии ищем их на OpenSubtitles (эту серию и следующую). Субтитры из самой раздачи подставляются всегда' },
      onChange: function () { os_ready = null; }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_os_phone', type: 'button' },
      field: { name: 'OpenSubtitles: ключ с телефона', description: osDescr() },
      onChange: osFromPhone
    });

    // Запасной путь — системная клавиатура: в неё можно вставить ключ с телефона через приложение Google TV
    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_os_key_edit', type: 'button' },
      field: { name: 'OpenSubtitles: ввести ключ', description: 'Ключ API: opensubtitles.com → профиль → API consumers → New consumer' },
      onChange: function () {
        var enabled = Lampa.Controller.enabled().name;

        Lampa.Input.edit({ title: 'Ключ API OpenSubtitles', value: '', free: true, nosave: true, nomic: true, keyboard: 'system' }, function (value) {
          value = (value || '').replace(/\s+/g, '');

          if (value) {
            var c = osConf();

            c.key = value;
            osSave(c);
            osUpdateDescr();
            Lampa.Noty.show('OpenSubtitles: ключ сохранён (…' + value.slice(-4) + ')');
          }

          Lampa.Controller.toggle(enabled);
        });
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_reset_studios', type: 'button' },
      field: { name: 'Забыть любимые озвучки', description: 'Озвучки, которые вы выбирали, поднимаются выше в умной сортировке' },
      onChange: function () {
        Lampa.Storage.set('tvt_pref_studios', []);
        Lampa.Noty.show('Список любимых озвучек очищен');
      }
    });

    // --- синхронизация ---

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_sync_title', type: 'title' },
      field: { name: 'Синхронизация через GitHub' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_sync_name', type: 'input', values: '', default: '', placeholder: 'например: ya' },
      field: { name: 'Чей это телевизор', description: 'Имя человека. На всех его устройствах — одинаковое, у других людей — своё' }
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_sync_repo', type: 'input', values: '', default: 'lampa-sync', placeholder: 'lampa-sync' },
      field: { name: 'Репозиторий', description: 'Приватный репозиторий на GitHub: «lampa-sync» или «владелец/lampa-sync»' }
    });

    // Токен вводим всегда системной клавиатурой: в неё можно вставить текст с телефона
    // через приложение Google TV, во встроенную клавиатуру Lampa — нет
    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_sync_token_edit', type: 'button' },
      field: { name: 'Токен GitHub', description: 'Откроется системная клавиатура. На телефоне в приложении Google TV нажмите значок клавиатуры и вставьте скопированный токен. Нужен fine-grained токен только на этот репозиторий, права Contents: чтение и запись' },
      onRender: function (item) {
        item.find('.settings-param__name').after('<div class="settings-param__value"></div>');
        maskToken(item);
      },
      onChange: editToken
    });

    Lampa.SettingsApi.addParam({
      component: 'tv_torrents',
      param: { name: 'tvt_sync_now', type: 'button' },
      field: { name: 'Синхронизировать сейчас', description: 'Прогресс, отметки «просмотрено», закладки, выбор озвучки и раздачи' },
      onRender: function (item) {
        item.find('.settings-param__descr').append($('<div class="tvt-sync-status"></div>').text(syncStatusText()));
      },
      onChange: function () {
        runSync(true);
      }
    });

    Lampa.Storage.listener.follow('change', function (e) {
      if (['tvt_sync_name', 'tvt_sync_repo', 'tvt_sync_token'].indexOf(e.name) === -1) return;

      // Другой человек, репозиторий или токен — начинаем с чистого листа: чужие версии файлов не помним
      if (e.name !== 'tvt_sync_name') Lampa.Storage.set('tvt_sync_owner', '');
      Lampa.Storage.set('tvt_sync_seen', {});
      Lampa.Storage.set('tvt_sync_pushed', '');

      if (e.name === 'tvt_sync_token') maskToken($('.settings-param[data-name="tvt_sync_token_edit"]'));

      scheduleSync(1500);
    });
  }

  function editToken() {
    var enabled = Lampa.Controller.enabled().name;

    Lampa.Input.edit({ title: 'Токен GitHub', value: '', free: true, nosave: true, nomic: true, keyboard: 'system' }, function (value) {
      value = (value || '').replace(/\s+/g, '');

      if (value) {
        Lampa.Storage.set('tvt_sync_token', value);
        Lampa.Noty.show('Токен сохранён (…' + value.slice(-4) + ')');
      }

      Lampa.Controller.toggle(enabled);
    });
  }

  // Токен на экране не показываем целиком
  function maskToken(item) {
    var t = (Lampa.Storage.get('tvt_sync_token', '') + '').trim();

    item.find('.settings-param__value').text(t ? '•••• ' + t.slice(-4) : 'не задан');
  }

  function syncStatusText() {
    var st = Lampa.Storage.get('tvt_sync_status', '');

    return 'Устройство: ' + syncDevice() + (st ? '. Последняя синхронизация: ' + st : '');
  }

  // Телефон в портрете: колонки экрана сериала встают друг под другом
  function initNarrow() {
    var update = function () {
      $('body').toggleClass('tvt-narrow', window.innerWidth < 760 || window.innerWidth < window.innerHeight);
    };

    update();
    $(window).on('resize orientationchange', update);
  }

  function touchMode() {
    return $('body').hasClass('touch-device');
  }

  function start() {
    if (window.tvt_plugin_started) return;
    window.tvt_plugin_started = true;

    $('head').append('<style id="tvt-style">' + CSS + '</style>');

    original_torrents = Lampa.Component.get('tvt_classic') || Lampa.Component.get('torrents');

    Lampa.Component.add('tvt_classic', original_torrents);
    Lampa.Component.add('tvt_torrents', Component);
    Lampa.Component.add('tvt_title', TitleScreen);

    initSettings();
    applyReplace();
    initEpisodeGrid();
    initAutoplay();
    initSplit();
    initSubs();
    initNarrow();
    initSync();
    initForget();

    console.log('TV Torrents', 'started', VERSION);
  }

  // Для проверки разбора сезонов на сохранённых данных (tests/): результаты парсера + серии TMDB → сезоны,
  // как их соберёт экран сериала
  function testSeasons(movie, results, data, units) {
    var items = results.map(function (el) { return { el: el, r: parseRelease(el, movie) }; });
    var built = buildSeasons(movie, items, data, units);
    var list = built.list;

    if (list) season_splits[movie.id] = { list: list };
    else delete season_splits[movie.id];

    return {
      plan: built.plan,
      how: built.how,
      items: items,
      list: realSeasons(movie),
      seasons: realSeasons(movie).map(function (s) { return s.season_number + ':' + s.episode_count; }),
      releases: function (n) { return seasonReleases(movie, items, n); }
    };
  }

  window.tvt_api = {
    parseRelease: parseRelease,
    buildSearchParams: buildSearchParams,
    testSeasons: testSeasons,
    coversEpisode: coversEpisode,
    seasonYears: seasonYears,
    sameTitle: sameTitle,
    files: { target: fileTarget, partOffset: partOffset, seasonOverride: seasonOverride, pathSeason: pathSeason, episodeNo: fileEpisodeNo, span: releaseSpan },
    sync: function () { runSync(true); },
    // Для anime.js: свои файлы в репозитории синхронизации и открытие сериала на нужном сезоне
    store: { ready: function () { return !!syncConfig(); }, get: storeGet, put: storePut, info: storeInfo },
    openSeason: function (id, season) { window.tvt_season_hint = { id: id, season: season, t: Date.now() }; },
    subs: { release: releaseSubs, forPlayer: subForPlayer, episodeNo: fileEpisodeNo, online: onlineSubs, targets: osTargets, parse: osParse },
    version: VERSION
  };

  if (window.appready) start();
  else {
    Lampa.Listener.follow('app', function (e) {
      if (e.type === 'ready') start();
    });
  }
})();
