// Just enough of Lampa for the plugin's parsing and season code to run in a plain page
(function () {
  var store = {};

  window.Lampa = {
    Storage: {
      field: function (name) { return store[name]; },
      get: function (name, def) { return name in store ? store[name] : def; },
      set: function (name, value) { store[name] = value; },
      _all: store
    },
    Listener: { follow: function () {}, send: function () {}, remove: function () {} },
    Lang: { translate: function (s) { return s; } },
    Utils: { parseTime: function (s) { return { full: s }; } },
    Timeline: { view: function () { return { percent: 0, time: 0 }; } },
    Noty: { show: function () {} }
  };
})();
