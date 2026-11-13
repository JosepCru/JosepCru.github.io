// Portfolio admin. Talks straight to the GitHub API with a personal access
// token kept in this browser only. No dependencies.
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Configuration                                                       */
  /* ------------------------------------------------------------------ */
  var REPO = "JosepCru/JosepCru.github.io";
  var BRANCH = "main";
  var API = "https://api.github.com/repos/" + REPO;
  var TOKEN_KEY = "portfolio-admin-token";
  var PROJECTS_DIR = "_projects/";
  var IMAGES_DIR = "assets/img/projects/";
  var IMAGE_MAX_SIDE = 1600; // px, longest side after resizing
  var IMAGE_QUALITY = 0.82;  // JPEG quality, 0..1

  /* ------------------------------------------------------------------ */
  /* Form schemas: one entry per field. Types: text, date, number,       */
  /* textarea, lines (one item per line), image, list (repeating group). */
  /* ------------------------------------------------------------------ */
  var PROJECT_FIELDS = [
    { key: "title", label: "Título", type: "text" },
    { row: [
      { key: "category", label: "Categoría", type: "text", help: "Se usa para los filtros de la portada (p. ej. Game, AI, Hardware)." },
      { key: "date", label: "Fecha", type: "date" }
    ] },
    { key: "client", label: "Cliente / institución", type: "text" },
    { row: [
      { key: "link", label: "Enlace del proyecto", type: "text" },
      { key: "link_label", label: "Texto del enlace", type: "text" }
    ] },
    { key: "summary", label: "Resumen corto", type: "textarea", help: "Una o dos frases; aparece en la tarjeta de la portada y al compartir el enlace." },
    { key: "video", label: "Vídeo de YouTube (opcional)", type: "text", help: "Pega el enlace del vídeo (youtube.com/watch?v=… o youtu.be/…). Se muestra bajo la galería." },
    { key: "published", label: "Borrador: guardar sin mostrarlo en la web", type: "draft", help: "Las imágenes sí se suben al repositorio, que es público; solo se oculta la página." }
  ];
  var RESUME_ITEM = [
    { key: "title", label: "Título", type: "text" },
    { key: "period", label: "Periodo", type: "text" },
    { key: "place", label: "Lugar", type: "text" },
    { key: "description", label: "Descripción", type: "textarea" },
    { key: "bullets", label: "Puntos destacados", type: "lines", help: "Uno por línea." }
  ];
  var SECTIONS = {
    profile: {
      title: "Perfil",
      path: "_data/profile.json",
      fields: [
        { row: [
          { key: "name", label: "Nombre", type: "text" },
          { key: "tagline", label: "Subtítulo de la barra lateral", type: "text" }
        ] },
        { key: "roles", label: "Roles de la portada (\"I'm …\")", type: "lines", help: "Uno por línea; el texto animado los va alternando." },
        { row: [
          { key: "hero_image", label: "Foto de fondo de la portada", type: "image" },
          { key: "photo", label: "Foto de perfil", type: "image" }
        ] },
        { key: "about_intro", label: "About: introducción", type: "textarea" },
        { key: "about_heading", label: "About: titular", type: "text" },
        { key: "about_text", label: "About: texto", type: "textarea" },
        { key: "facts", label: "Datos (About)", type: "list", fields: [
          { row: [ { key: "label", label: "Etiqueta", type: "text" }, { key: "value", label: "Valor", type: "text" } ] }
        ] },
        { key: "projects_intro", label: "Texto de la sección Projects", type: "textarea" },
        { key: "contact_intro", label: "Texto de la sección Contact", type: "textarea" },
        { row: [
          { key: "email", label: "Email público", type: "text" },
          { key: "location", label: "Ubicación", type: "text" }
        ] },
        { key: "map_embed", label: "URL del mapa incrustado", type: "text", help: "Déjalo vacío para ocultar el mapa." },
        { key: "form_endpoint", label: "URL del formulario (Formspree)", type: "text" },
        { key: "socials", label: "Redes sociales", type: "list", fields: [
          { row: [ { key: "name", label: "Nombre", type: "text" }, { key: "url", label: "URL", type: "text" } ] }
        ] }
      ]
    },
    skills: {
      title: "Skills",
      path: "_data/skills.json",
      fields: [
        { key: "intro", label: "Introducción", type: "textarea" },
        { key: "groups", label: "Grupos de skills", type: "list", fields: [
          { key: "name", label: "Nombre del grupo", type: "text" },
          { key: "skills", label: "Skills", type: "lines", help: "Una por línea." }
        ] }
      ]
    },
    appearance: {
      title: "Apariencia",
      path: "_data/appearance.json",
      intro: "Estos ajustes fijan límites, no medidas exactas: la web se sigue adaptando sola a móvil y tablet. Por ejemplo, «4 columnas» significa «como máximo 4 cuando quepan».",
      fields: [
        { key: "sections", label: "Secciones de la portada: orden y visibilidad", type: "sections", help: "La bienvenida con tu foto siempre va primero. El menú lateral sigue este mismo orden." },
        { row: [
          { key: "project_columns", label: "Columnas de proyectos (máximo)", type: "select", options: [
            ["auto", "Automático: las que quepan"], ["2", "2 por fila"], ["3", "3 por fila"], ["4", "4 por fila"]
          ] },
          { key: "content_width", label: "Ancho máximo del contenido", type: "select", options: [
            ["960", "Estrecho (960 px)"], ["1100", "Medio (1100 px)"], ["1280", "Ancho (1280 px)"], ["1440", "Muy ancho (1440 px)"], ["full", "Todo el ancho disponible"]
          ] }
        ] },
        { row: [
          { key: "section_spacing", label: "Espaciado entre secciones", type: "select", options: [
            ["compact", "Compacto"], ["normal", "Normal"], ["spacious", "Amplio"]
          ] },
          { key: "cover_ratio", label: "Proporción de las portadas de proyecto", type: "select", options: [
            ["16 / 9", "16:9 (panorámica)"], ["3 / 2", "3:2"], ["4 / 3", "4:3"], ["1 / 1", "1:1 (cuadrada)"]
          ] }
        ] },
        { key: "cover_fit", label: "Encaje de la imagen en la portada", type: "select", options: [
          ["contain", "Mostrar la imagen entera (puede dejar bandas a los lados)"], ["cover", "Rellenar el recuadro (puede recortar los bordes)"]
        ] }
      ]
    },
    resume: {
      title: "Currículum",
      path: "_data/resume.json",
      fields: [
        { key: "education", label: "Formación", type: "list", fields: RESUME_ITEM },
        { key: "experience", label: "Experiencia profesional", type: "list", fields: RESUME_ITEM }
      ]
    }
  };

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  var state = {
    token: null,
    paths: [],      // every file path in the repo at the last load
    projects: [],   // [{ slug, data, body }]
    sections: {},   // { profile: {...}, skills: {...}, resume: {...} }
    tab: "projects",
    dirty: false
  };
  // Images picked in this session: path -> { base64, url }. Lets us show a
  // thumbnail before GitHub Pages has finished publishing the new file.
  var uploads = {};

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var toastTimer;

  function el(tag, props) {
    var node = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "class") node.className = props[k];
      else if (k === "text") node.textContent = props[k];
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), props[k]);
      else if (props[k] === true) node.setAttribute(k, "");
      else if (props[k] !== false && props[k] != null) node.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child == null) continue;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  function toast(message, isError) {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.className = isError ? "error" : "";
    toastEl.hidden = false;
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, isError ? 9000 : 5000);
  }

  function markDirty() { state.dirty = true; }
  window.addEventListener("beforeunload", function (e) {
    if (state.dirty) { e.preventDefault(); e.returnValue = ""; }
  });
  function confirmLeave() {
    return !state.dirty || window.confirm("Hay cambios sin guardar. ¿Descartarlos?");
  }

  /**
   * Turns a title or file name into the text used for file names and URLs,
   * e.g. the project "Aka No Rage" lives at /projects/aka-no-rage/.
   * Accents are transliterated ("Cruañes" -> "cruanes"), "&" becomes "and",
   * and the result is capped at 60 characters. Only a-z, 0-9 and "-" remain.
   */
  function slugify(text) {
    return String(text)
      .normalize("NFD")                 // "ñ" -> "n" + combining tilde
      .replace(/[̀-ͯ]/g, "")  // drop the combining marks
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "");
  }

  function uniqueName(base, taken) {
    var name = base || "item", n = 2;
    while (taken.indexOf(name) !== -1) name = base + "-" + n++;
    return name;
  }

  function imageSrc(path) {
    if (!path) return "";
    var repoPath = path.replace(/^\//, "");
    return uploads[repoPath] ? uploads[repoPath].url : path;
  }

  /* ------------------------------------------------------------------ */
  /* GitHub API                                                          */
  /* ------------------------------------------------------------------ */
  function gh(path, options) {
    options = options || {};
    return fetch(API + path, {
      method: options.method || "GET",
      headers: {
        Authorization: "Bearer " + state.token,
        Accept: options.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    }).then(function (response) {
      if (response.ok) return options.raw ? response.text() : response.json();
      return response.json().catch(function () { return {}; }).then(function (info) {
        var error = new Error(info.message || ("GitHub respondió " + response.status));
        error.status = response.status;
        throw error;
      });
    });
  }

  function readFile(path) {
    return gh("/contents/" + encodeURI(path) + "?ref=" + BRANCH, { raw: true });
  }

  function explain(error) {
    if (error.status === 401) return "El token no es válido o ha caducado. Cierra sesión y pega uno nuevo.";
    if (error.status === 403 || error.status === 404) return "El token no tiene permiso de escritura (Contents: Read and write) sobre " + REPO + ".";
    if (error.status === 409 || error.status === 422) return "El repositorio cambió mientras editabas. Recarga la página y vuelve a intentarlo.";
    return "Error: " + error.message;
  }

  /**
   * Writes any number of files in ONE commit, so GitHub Pages rebuilds once.
   * changes: [{ path, text } | { path, base64 } | { path, remove: true }]
   */
  function commit(message, changes) {
    var headSha;
    return gh("/git/ref/heads/" + BRANCH)
      .then(function (ref) {
        headSha = ref.object.sha;
        return gh("/git/commits/" + headSha);
      })
      .then(function (head) {
        var entries = changes.map(function (change) {
          var entry = { path: change.path, mode: "100644", type: "blob" };
          if (change.remove) { entry.sha = null; return entry; }
          if (change.text != null) { entry.content = change.text; return entry; }
          return gh("/git/blobs", { method: "POST", body: { content: change.base64, encoding: "base64" } })
            .then(function (blob) { entry.sha = blob.sha; return entry; });
        });
        return Promise.all(entries).then(function (tree) {
          return gh("/git/trees", { method: "POST", body: { base_tree: head.tree.sha, tree: tree } });
        });
      })
      .then(function (tree) {
        return gh("/git/commits", { method: "POST", body: { message: message, tree: tree.sha, parents: [headSha] } });
      })
      .then(function (created) {
        return gh("/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: created.sha } });
      });
  }

  /* ------------------------------------------------------------------ */
  /* Project files: "key: <JSON value>" front matter + Markdown body.    */
  /* JSON values are valid YAML, so Jekyll reads them and we can parse   */
  /* them back with JSON.parse — no YAML library needed.                 */
  /* ------------------------------------------------------------------ */
  var FRONT_MATTER_KEYS = ["title", "category", "date", "client", "link", "link_label", "summary", "video", "published", "order", "cover", "images"];

  function parseProject(text) {
    var match = /^---\r?\n([\s\S]*?)\r?\n?---\r?\n?([\s\S]*)$/.exec(text);
    var data = {};
    if (!match) return { data: data, body: text };
    match[1].split(/\r?\n/).forEach(function (line) {
      var pair = /^([A-Za-z_]\w*):\s*(.*)$/.exec(line);
      if (!pair) return;
      try { data[pair[1]] = JSON.parse(pair[2]); }
      catch (e) { data[pair[1]] = pair[2]; } // hand-written plain YAML string
    });
    return { data: data, body: match[2].replace(/^\s+/, "") };
  }

  function serializeProject(project) {
    var keys = FRONT_MATTER_KEYS.concat(Object.keys(project.data).filter(function (k) {
      return FRONT_MATTER_KEYS.indexOf(k) === -1;
    }));
    var lines = keys
      .filter(function (k) { return project.data[k] != null; })
      .map(function (k) { return k + ": " + JSON.stringify(project.data[k]); });
    return "---\n" + lines.join("\n") + "\n---\n" + project.body.trim() + "\n";
  }

  /* ------------------------------------------------------------------ */
  /* Images: resize and compress in the browser before uploading.        */
  /* ------------------------------------------------------------------ */
  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return loadImageElement(file); });
    }
    return loadImageElement(file);
  }
  function loadImageElement(file) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error("No se pudo leer " + file.name)); };
      image.src = URL.createObjectURL(file);
    });
  }

  function compressImage(file) {
    return loadBitmap(file).then(function (bitmap) {
      var scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      var context = canvas.getContext("2d");
      context.fillStyle = "#fff"; // JPEG has no transparency
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) return reject(new Error("No se pudo procesar " + file.name));
          var reader = new FileReader();
          reader.onload = function () {
            resolve({ base64: String(reader.result).split(",")[1], url: URL.createObjectURL(blob) });
          };
          reader.onerror = function () { reject(reader.error); };
          reader.readAsDataURL(blob);
        }, "image/jpeg", IMAGE_QUALITY);
      });
    });
  }

  // Compresses the files and registers them under dir; resolves to their repo paths.
  function addImages(files, dir, takenNames) {
    var taken = takenNames.slice();
    var list = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
    return list.reduce(function (chain, file) {
      return chain.then(function (paths) {
        return compressImage(file).then(function (result) {
          var name = uniqueName(slugify(file.name.replace(/\.[^.]+$/, "")) || "image", taken);
          taken.push(name);
          var path = dir + name + ".jpg";
          uploads[path] = result;
          return paths.concat(path);
        });
      });
    }, Promise.resolve([]));
  }

  function fileNamesIn(dir) {
    return state.paths.concat(Object.keys(uploads))
      .filter(function (p) { return p.indexOf(dir) === 0; })
      .map(function (p) { return p.slice(dir.length).replace(/\.[^.]+$/, ""); });
  }

  /* ------------------------------------------------------------------ */
  /* Form builder                                                        */
  /* ------------------------------------------------------------------ */
  function buildFields(fields, target) {
    var fragment = document.createDocumentFragment();
    fields.forEach(function (def) {
      if (def.row) {
        var row = el("div", { class: "row" });
        row.appendChild(buildFields(def.row, target));
        fragment.appendChild(row);
      } else {
        fragment.appendChild(buildField(def, target));
      }
    });
    return fragment;
  }

  function buildField(def, target) {
    if (def.type === "list") return buildList(def, target);
    if (def.type === "image") return buildImageField(def, target);
    if (def.type === "draft") return buildDraftField(def, target);
    if (def.type === "select") return buildSelect(def, target);
    if (def.type === "sections") return buildSectionOrder(def, target);

    var input;
    var value = target[def.key];
    if (def.type === "textarea" || def.type === "lines") {
      input = el("textarea", { rows: def.type === "lines" ? 4 : 5 });
      input.value = def.type === "lines" ? (value || []).join("\n") : (value || "");
    } else {
      input = el("input", { type: def.type, min: def.type === "number" ? 0 : null, max: def.type === "number" ? 100 : null });
      input.value = value == null ? "" : value;
    }
    input.addEventListener("input", function () {
      if (def.type === "lines") {
        target[def.key] = input.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      } else if (def.type === "number") {
        target[def.key] = Math.max(0, Math.min(100, Number(input.value) || 0));
      } else {
        target[def.key] = input.value;
      }
      markDirty();
    });
    return el("label", { class: "field" }, def.label, input, def.help ? el("span", { class: "help", text: def.help }) : null);
  }

  function buildSelect(def, target) {
    var select = el("select");
    def.options.forEach(function (option) {
      select.appendChild(el("option", { value: option[0], text: option[1] }));
    });
    select.value = target[def.key];
    select.addEventListener("change", function () { target[def.key] = select.value; markDirty(); });
    return el("label", { class: "field" }, def.label, select, def.help ? el("span", { class: "help", text: def.help }) : null);
  }

  // A fixed set of rows that can be reordered and switched on or off.
  function buildSectionOrder(def, target) {
    var names = { about: "About", skills: "Skills", resume: "Resume", projects: "Projects", contact: "Contact" };
    var items = target[def.key];
    var card = el("div", { class: "card" }, el("h3", { text: def.label }), el("p", { class: "help", text: def.help }));
    var body = el("ul", { class: "list" });
    card.appendChild(body);
    function paint() {
      body.textContent = "";
      items.forEach(function (item, index) {
        var box = el("input", { type: "checkbox", "aria-label": "Visible" });
        box.checked = item.visible !== false;
        box.addEventListener("change", function () { item.visible = box.checked; markDirty(); });
        body.appendChild(el("li", null,
          el("label", { class: "check-inline" }, box, el("strong", { text: names[item.id] || item.id })),
          moveButtons(items, index, paint)
        ));
      });
    }
    paint();
    return card;
  }

  // Up/down buttons that swap an item with its neighbour, then repaint.
  function moveButtons(items, index, repaint) {
    function move(delta) {
      var other = index + delta;
      var item = items[index]; items[index] = items[other]; items[other] = item;
      markDirty(); repaint();
    }
    return el("span", { class: "move" },
      el("button", { type: "button", class: "small", "aria-label": "Subir", disabled: index === 0, onclick: function () { move(-1); } }, "↑"),
      el("button", { type: "button", class: "small", "aria-label": "Bajar", disabled: index === items.length - 1, onclick: function () { move(1); } }, "↓")
    );
  }

  // Jekyll skips any file whose front matter says "published: false".
  function buildDraftField(def, target) {
    var box = el("input", { type: "checkbox" });
    box.checked = target.published === false;
    box.addEventListener("change", function () {
      if (box.checked) target.published = false; else delete target.published;
      markDirty();
    });
    return el("label", { class: "field check" }, el("span", null, box, def.label), el("span", { class: "help", text: def.help }));
  }

  function buildImageField(def, target) {
    var preview = el("img", { alt: "" });
    preview.src = imageSrc(target[def.key]);
    var input = el("input", { type: "file", accept: "image/*" });
    input.addEventListener("change", function () {
      if (!input.files.length) return;
      addImages(input.files, "assets/img/", fileNamesIn("assets/img/")).then(function (paths) {
        if (!paths.length) return;
        target[def.key] = "/" + paths[0];
        preview.src = imageSrc(target[def.key]);
        markDirty();
      }).catch(function (error) { toast(error.message, true); });
    });
    return el("label", { class: "field" }, def.label, el("div", { class: "single-image" }, preview, input));
  }

  function buildList(def, target) {
    if (!Array.isArray(target[def.key])) target[def.key] = [];
    var items = target[def.key];
    var card = el("div", { class: "card" }, el("h3", { text: def.label }));
    var body = el("div");
    card.appendChild(body);

    function move(index, delta) {
      var other = index + delta;
      if (other < 0 || other >= items.length) return;
      var item = items[index]; items[index] = items[other]; items[other] = item;
      markDirty(); paint();
    }
    function paint() {
      body.textContent = "";
      items.forEach(function (item, index) {
        var box = el("div", { class: "repeater-item" },
          el("div", { class: "repeater-tools" },
            el("button", { type: "button", class: "small", "aria-label": "Subir", disabled: index === 0, onclick: function () { move(index, -1); } }, "↑"),
            el("button", { type: "button", class: "small", "aria-label": "Bajar", disabled: index === items.length - 1, onclick: function () { move(index, 1); } }, "↓"),
            el("button", { type: "button", class: "small danger", onclick: function () { items.splice(index, 1); markDirty(); paint(); } }, "Quitar")
          )
        );
        box.appendChild(buildFields(def.fields, item));
        body.appendChild(box);
      });
      body.appendChild(el("button", { type: "button", onclick: function () { items.push({}); markDirty(); paint(); } }, "+ Añadir"));
    }
    paint();
    return card;
  }

  /* ------------------------------------------------------------------ */
  /* Views                                                               */
  /* ------------------------------------------------------------------ */
  function renderLogin(message) {
    var input = el("input", { type: "password", autocomplete: "off", placeholder: "github_pat_…", "aria-label": "Token de acceso" });
    var form = el("form", { class: "login", onsubmit: function (e) {
      e.preventDefault();
      state.token = input.value.trim();
      if (state.token) start();
    } },
      el("h1", { text: "Admin del portfolio" }),
      el("p", { text: "Pega un token de acceso personal de GitHub. Se guarda solo en este navegador." }),
      el("ol", null,
        el("li", { text: "GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token." }),
        el("li", { text: "Repository access: Only select repositories → " + REPO + "." }),
        el("li", { text: "Permissions → Repository → Contents: Read and write. Nada más." }),
        el("li", { text: "Ponle caducidad y no lo compartas." })
      ),
      message ? el("p", { class: "error", text: message }) : null,
      el("label", { class: "field" }, "Token", input),
      el("button", { type: "submit", class: "primary" }, "Entrar")
    );
    app.textContent = "";
    app.appendChild(form);
    input.focus();
  }

  function logout() {
    if (!confirmLeave()) return;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    state.token = null;
    state.dirty = false;
    renderLogin();
  }

  function renderShell(content) {
    var tabs = el("nav", { class: "tabs", "aria-label": "Secciones" });
    [["projects", "Proyectos"], ["profile", "Perfil"], ["skills", "Skills"], ["resume", "Currículum"], ["appearance", "Apariencia"]].forEach(function (tab) {
      tabs.appendChild(el("button", { type: "button", class: state.tab === tab[0] ? "active" : "", onclick: function () {
        if (!confirmLeave()) return;
        state.dirty = false;
        state.tab = tab[0];
        renderTab();
      } }, tab[1]));
    });
    app.textContent = "";
    app.appendChild(el("header", { class: "bar" },
      el("strong", { text: "Admin del portfolio" }),
      el("a", { href: "../", target: "_blank", rel: "noopener" }, "Ver sitio ↗"),
      el("button", { type: "button", onclick: logout }, "Cerrar sesión")
    ));
    app.appendChild(tabs);
    app.appendChild(content);
    window.scrollTo(0, 0);
  }

  function renderTab() {
    if (state.tab === "projects") renderProjectList();
    else renderSection(state.tab);
  }

  function saveBar(onSave, extra) {
    var save = el("button", { type: "button", class: "primary" }, "Guardar y publicar");
    save.addEventListener("click", function () {
      save.disabled = true;
      save.textContent = "Guardando…";
      onSave().catch(function (error) {
        toast(error.status ? explain(error) : error.message, true);
        save.disabled = false;
        save.textContent = "Guardar y publicar";
      });
    });
    return el("div", { class: "savebar" }, extra || null, el("span", { class: "spacer" }), save);
  }

  function published() {
    state.dirty = false;
    toast("Guardado. La web pública se actualizará en un minuto aproximadamente.");
  }

  /* ----- Profile / Skills / Resume ----- */
  function renderSection(name) {
    var section = SECTIONS[name];
    var data = JSON.parse(JSON.stringify(state.sections[name])); // edit a copy
    var view = el("main", { class: "view" }, el("div", { class: "view-head" }, el("h2", { text: section.title })));
    if (section.intro) view.appendChild(el("p", { class: "intro", text: section.intro }));
    var card = el("div", { class: "card" });
    card.appendChild(buildFields(section.fields, data));
    view.appendChild(card);
    view.appendChild(saveBar(function () {
      var changes = [{ path: section.path, text: JSON.stringify(data, null, 2) + "\n" }];
      section.fields.forEach(function collect(def) {
        if (def.row) return def.row.forEach(collect);
        var path = def.type === "image" && data[def.key] ? data[def.key].replace(/^\//, "") : null;
        if (path && uploads[path] && state.paths.indexOf(path) === -1) changes.push({ path: path, base64: uploads[path].base64 });
      });
      return commit("Admin: update " + name, changes).then(function () {
        published();
        return loadAll().then(renderTab);
      });
    }));
    renderShell(view);
  }

  /* ----- Project list ----- */
  function renderProjectList() {
    var view = el("main", { class: "view" },
      el("div", { class: "view-head" },
        el("h2", { text: "Proyectos" }),
        el("button", { type: "button", class: "primary", onclick: function () { renderProjectEditor(null); } }, "+ Nuevo proyecto")
      )
    );
    if (!state.projects.length) view.appendChild(el("p", { class: "empty", text: "Todavía no hay proyectos." }));
    var order = state.projects.slice(); // working copy; nothing changes until it is saved
    var list = el("ul", { class: "list" });
    view.appendChild(list);
    function paint() {
      list.textContent = "";
      order.forEach(addRow);
    }
    function addRow(project, index) {
      var thumb = el("img", { alt: "" });
      thumb.src = imageSrc(project.data.cover || (project.data.images || [])[0]);
      list.appendChild(el("li", null,
        thumb,
        el("div", { class: "meta" },
          el("strong", { text: project.data.title || project.slug }),
          el("span", { text: [project.data.published === false ? "BORRADOR" : null, project.data.category, project.data.date].filter(Boolean).join(" · ") })
        ),
        moveButtons(order, index, paint),
        el("button", { type: "button", onclick: function () { if (confirmLeave()) { state.dirty = false; renderProjectEditor(project); } } }, "Editar")
      ));
    }
    paint();
    if (order.length > 1) {
      view.appendChild(el("p", { class: "help", text: "Usa ↑ ↓ para cambiar el orden en que aparecen en la portada y pulsa «Guardar y publicar»." }));
      view.appendChild(saveBar(function () {
        var changes = [];
        order.forEach(function (project, index) {
          if (project.data.order === index + 1) return;
          project.data.order = index + 1;
          changes.push({ path: PROJECTS_DIR + project.slug + ".md", text: serializeProject(project) });
        });
        if (!changes.length) return Promise.reject(new Error("El orden no ha cambiado."));
        return commit("Admin: reorder projects", changes).then(function () {
          published();
          return loadAll().then(renderTab);
        });
      }));
    }
    renderShell(view);
  }

  /* ----- Project editor ----- */
  function renderProjectEditor(existing) {
    var isNew = !existing;
    var project = existing
      ? JSON.parse(JSON.stringify(existing))
      : { slug: "", data: { title: "", category: "", date: new Date().toISOString().slice(0, 10), client: "", link: "", link_label: "", summary: "", video: "", cover: "", images: [] }, body: "" };
    if (!Array.isArray(project.data.images)) project.data.images = [];
    // New projects get a temporary folder name; it becomes the real slug on save.
    var draftDir = IMAGES_DIR + "draft-" + Date.now().toString(36) + "/";
    function imageDir() { return isNew ? draftDir : IMAGES_DIR + project.slug + "/"; }

    var view = el("main", { class: "view" },
      el("div", { class: "view-head" },
        el("h2", { text: isNew ? "Nuevo proyecto" : "Editar: " + (project.data.title || project.slug) }),
        el("button", { type: "button", onclick: function () { if (confirmLeave()) { state.dirty = false; renderProjectList(); } } }, "← Volver")
      )
    );

    var details = el("div", { class: "card" }, el("h3", { text: "Datos" }));
    details.appendChild(buildFields(PROJECT_FIELDS, project.data));
    details.appendChild(buildField({ key: "body", label: "Descripción completa", type: "textarea", help: "Admite Markdown: línea en blanco para separar párrafos, «- » para listas, **negrita**." }, project));
    view.appendChild(details);

    /* Images */
    var grid = el("div", { class: "images" });
    function paintImages() {
      var images = project.data.images;
      if (images.indexOf(project.data.cover) === -1) project.data.cover = images[0] || "";
      grid.textContent = "";
      images.forEach(function (path, index) {
        var isCover = path === project.data.cover;
        var picture = el("img", { alt: "Imagen " + (index + 1) });
        picture.src = imageSrc(path);
        function move(delta) {
          var other = index + delta;
          if (other < 0 || other >= images.length) return;
          images[index] = images[other]; images[other] = path;
          markDirty(); paintImages();
        }
        grid.appendChild(el("div", { class: "image" + (isCover ? " cover" : "") },
          picture,
          el("div", { class: "image-tools" },
            el("button", { type: "button", disabled: isCover, onclick: function () { project.data.cover = path; markDirty(); paintImages(); } }, isCover ? "★ Portada" : "☆ Portada"),
            el("button", { type: "button", "aria-label": "Mover antes", disabled: index === 0, onclick: function () { move(-1); } }, "←"),
            el("button", { type: "button", "aria-label": "Mover después", disabled: index === images.length - 1, onclick: function () { move(1); } }, "→"),
            el("button", { type: "button", class: "danger", "aria-label": "Quitar imagen", onclick: function () { images.splice(index, 1); markDirty(); paintImages(); } }, "✕")
          )
        ));
      });
    }
    function receive(files) {
      addImages(files, imageDir(), fileNamesIn(imageDir())).then(function (paths) {
        paths.forEach(function (p) { project.data.images.push("/" + p); });
        if (paths.length) { markDirty(); paintImages(); }
      }).catch(function (error) { toast(error.message, true); });
    }
    var picker = el("input", { type: "file", accept: "image/*", multiple: true });
    picker.addEventListener("change", function () { receive(picker.files); picker.value = ""; });
    var dropzone = el("label", { class: "dropzone" }, "Arrastra imágenes aquí o toca para elegirlas", picker);
    ["dragenter", "dragover"].forEach(function (type) {
      dropzone.addEventListener(type, function (e) { e.preventDefault(); dropzone.classList.add("over"); });
    });
    ["dragleave", "drop"].forEach(function (type) {
      dropzone.addEventListener(type, function (e) { e.preventDefault(); dropzone.classList.remove("over"); });
    });
    dropzone.addEventListener("drop", function (e) { receive(e.dataTransfer.files); });
    paintImages();
    view.appendChild(el("div", { class: "card" },
      el("h3", { text: "Imágenes" }),
      el("p", { class: "help", text: "Se redimensionan y comprimen automáticamente. La marcada con ★ es la portada de la tarjeta." }),
      dropzone, grid
    ));

    /* Save */
    function save() {
      if (!project.data.title.trim()) return Promise.reject(new Error("El proyecto necesita un título."));
      if (!project.data.images.length) return Promise.reject(new Error("Añade al menos una imagen."));
      var changes = [];
      if (isNew) {
        // Place it before every existing project; reorder later from the list.
        project.data.order = state.projects.reduce(function (min, p) {
          return Math.min(min, Number(p.data.order) || 0);
        }, 1) - 1;
        var slug = uniqueName(slugify(project.data.title) || "project", state.projects.map(function (p) { return p.slug; }));
        var finalDir = IMAGES_DIR + slug + "/";
        // Move this session's uploads from the draft folder to the real one.
        var rename = function (path) {
          var repoPath = path.replace(/^\//, "");
          if (repoPath.indexOf(draftDir) !== 0) return path;
          var moved = finalDir + repoPath.slice(draftDir.length);
          uploads[moved] = uploads[repoPath];
          return "/" + moved;
        };
        project.data.images = project.data.images.map(rename);
        project.data.cover = rename(project.data.cover);
        project.slug = slug;
        isNew = false;
      }
      var dir = IMAGES_DIR + project.slug + "/";
      var used = project.data.images.map(function (p) { return p.replace(/^\//, ""); });
      used.forEach(function (path) {
        if (uploads[path] && state.paths.indexOf(path) === -1) changes.push({ path: path, base64: uploads[path].base64 });
      });
      // Remove files in this project's folder that are no longer used.
      state.paths.forEach(function (path) {
        if (path.indexOf(dir) === 0 && used.indexOf(path) === -1) changes.push({ path: path, remove: true });
      });
      changes.push({ path: PROJECTS_DIR + project.slug + ".md", text: serializeProject(project) });
      return commit("Admin: save project " + project.slug, changes).then(function () {
        published();
        return loadAll().then(renderProjectList);
      });
    }

    var remove = isNew ? null : el("button", { type: "button", class: "danger", onclick: function () {
      if (!window.confirm("¿Borrar «" + (project.data.title || project.slug) + "» y sus imágenes? Se puede recuperar desde el historial de git.")) return;
      var dir = IMAGES_DIR + project.slug + "/";
      var changes = state.paths
        .filter(function (p) { return p.indexOf(dir) === 0 || p === PROJECTS_DIR + project.slug + ".md"; })
        .map(function (p) { return { path: p, remove: true }; });
      commit("Admin: delete project " + project.slug, changes)
        .then(function () { published(); return loadAll().then(renderProjectList); })
        .catch(function (error) { toast(explain(error), true); });
    } }, "Borrar proyecto");

    view.appendChild(saveBar(save, remove));
    renderShell(view);
  }

  /* ------------------------------------------------------------------ */
  /* Loading and start-up                                                */
  /* ------------------------------------------------------------------ */
  function loadAll() {
    return gh("/git/trees/" + BRANCH + "?recursive=1").then(function (tree) {
      state.paths = tree.tree.filter(function (e) { return e.type === "blob"; }).map(function (e) { return e.path; });
      var projectFiles = state.paths.filter(function (p) { return p.indexOf(PROJECTS_DIR) === 0 && /\.md$/.test(p); });
      var loadProjects = Promise.all(projectFiles.map(function (path) {
        return readFile(path).then(function (text) {
          var parsed = parseProject(text);
          return { slug: path.slice(PROJECTS_DIR.length, -3), data: parsed.data, body: parsed.body };
        });
      }));
      var names = Object.keys(SECTIONS);
      var loadSections = Promise.all(names.map(function (name) {
        return readFile(SECTIONS[name].path).then(JSON.parse);
      }));
      return Promise.all([loadProjects, loadSections]).then(function (results) {
        state.projects = results[0].sort(function (a, b) {
          var byOrder = (Number(a.data.order) || 0) - (Number(b.data.order) || 0);
          return byOrder || String(b.data.date || "").localeCompare(String(a.data.date || ""));
        });
        names.forEach(function (name, i) { state.sections[name] = results[1][i]; });
      });
    });
  }

  function start() {
    app.textContent = "";
    app.appendChild(el("p", { class: "empty", text: "Cargando…" }));
    gh("").then(function (repo) {
      if (repo.permissions && repo.permissions.push === false) {
        var error = new Error("sin permiso"); error.status = 403; throw error;
      }
      try { localStorage.setItem(TOKEN_KEY, state.token); } catch (e) {}
      return loadAll();
    }).then(renderTab).catch(function (error) {
      state.token = null;
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      renderLogin(explain(error));
    });
  }

  try { state.token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
  if (state.token) start(); else renderLogin();
})();
